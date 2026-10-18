"""The ASI:One conversation (ticket A-07).

Holds per-person session state and formats replies. Every decision (lines,
flags, savings, the letter, the approval check) is made by the BetterBill
API; nothing here computes them.
"""

import json
import re
from collections.abc import Awaitable, Callable

from uagents_core.contrib.protocols.chat import ChatMessage

from betterbill_agent.api_client import ApiError
from betterbill_agent.cards import card_message, text_message

Api = Callable[[str, dict], Awaitable[dict]]
State = dict
Reply = tuple[State, list[ChatMessage]]

ACTIONS = ("confirm_lines", "restart", "draft_letter", "approve", "cancel")
PROMPT = "Paste the text of your hospital bill, or type sample to try a sample bill."
ERROR = "Something went wrong on our side. Nothing was sent. Reply retry to try again."
DISCLAIMER = "BetterBill is informational, not legal or medical advice."
TIER_LABEL = {
    "confirmed": "Confirmed from your bill",
    "rule": "Billing rule",
    "published": "Hospital's published price",
    "estimate": "Estimate",
}
MIN_BILL_CHARS = 40
SAMPLE_BILL = "SB-01"


def money(cents: int) -> str:
    sign = "−" if cents < 0 else ""
    return f"{sign}${abs(cents) / 100:,.2f}"


def selected_action(text: str) -> str | None:
    """A card selection, or a message that is exactly an action name.

    ASI:One's reply shape for a card click is unverified, so a JSON object is
    accepted anywhere in the text. Plain words never match by substring, so
    "I don't approve" can never approve anything.
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            action = json.loads(match.group(0)).get("action")
        except (json.JSONDecodeError, AttributeError):
            action = None
        if action in ACTIONS:
            return action
    word = text.strip().lower()
    return word if word in ACTIONS else None


async def handle_text(state: State, text: str, api: Api) -> Reply:
    action = selected_action(text)
    word = text.strip().lower()
    if word == "retry":
        action = state.get("last")
        if action is None:
            return state, [text_message(PROMPT)]
    if action == "restart" or word in {"start", "hi", "hello", "help"}:
        return {}, [text_message(PROMPT)]

    steps = {
        "confirm_lines": confirm_lines,
        "draft_letter": draft_letter,
        "approve": approve,
        "cancel": cancel,
    }
    try:
        if action in steps:
            return await steps[action](state, api)
        if word == "sample":
            return await start(state, api, sample=True)
        if len(text.strip()) < MIN_BILL_CHARS:
            return state, [text_message(PROMPT)]
        return await start(state, api, bill_text=text)
    except ApiError:
        return {**state, "last": action}, [text_message(ERROR)]


async def start(
    state: State, api: Api, *, sample: bool = False, bill_text: str = ""
) -> Reply:
    created = await api("case.create", {"sample": SAMPLE_BILL} if sample else {})
    case_id = created["id"]
    if sample:
        bill = (await api("case.get", {"caseId": case_id}))["bill"]
    else:
        parsed = await api("bill.parseText", {"caseId": case_id, "text": bill_text})
        bill = parsed["bill"]
    lines = bill["lines"] if bill else []
    if not lines:
        return {}, [
            text_message(
                "I could not find any charges in that text. "
                "Paste the itemized bill, or type sample."
            )
        ]

    rows = [
        {
            "label": line["description"][:40],
            "value": f"{money(line['chargeCents'])} x {line['units']:g}",
        }
        for line in lines[:8]
    ]
    if len(lines) > 8:
        rows.append({"label": "More", "value": f"{len(lines) - 8} more lines"})
    card = card_message(
        f"I read {len(lines)} lines from your bill. "
        "Check them before I look for problems.",
        "review",
        {
            "title": "Check these lines",
            "summary_rows": rows,
            "approve_cta": {
                "label": "Looks right",
                "primary": True,
                "selection": {"action": "confirm_lines"},
            },
            "reject_cta": {"label": "Paste again", "selection": {"action": "restart"}},
        },
    )
    return {"caseId": case_id, "step": "lines"}, [card]


async def confirm_lines(state: State, api: Api) -> Reply:
    case_id = state.get("caseId")
    if not case_id or state.get("step") != "lines":
        return state, [text_message(PROMPT)]
    detail = await api("case.get", {"caseId": case_id})
    await api(
        "bill.confirmLines", {"caseId": case_id, "lines": detail["bill"]["lines"]}
    )
    audit = await api("audit.run", {"caseId": case_id})
    flags = audit["flags"]
    if not flags:
        return {"caseId": case_id, "step": "done"}, [
            text_message(
                f"I did not find anything that looks wrong on this bill. {DISCLAIMER}"
            )
        ]

    savings = audit["savings"]
    paragraphs = [
        f"{f['title']}. {f['explanation']} {TIER_LABEL[f['tier']]}. "
        f"Amount: {money(f['amountCents'])}."
        for f in flags[:5]
    ]
    paragraphs.append(
        f"Confirmed: {money(savings['confirmedCents'])}. "
        f"Potential: {money(savings['potentialLowCents'])} to "
        f"{money(savings['potentialHighCents'])}. These are estimates. {DISCLAIMER}"
    )
    card = card_message(
        "\n\n".join(paragraphs),
        "detail",
        {
            "title": "What looks wrong",
            "summary_rows": [
                {
                    "label": f["title"],
                    "value": f"{money(f['amountCents'])}, {TIER_LABEL[f['tier']]}",
                }
                for f in flags
            ],
            "ctas": [
                {
                    "label": "Draft the letter",
                    "primary": True,
                    "selection": {"action": "draft_letter"},
                }
            ],
        },
    )
    return {"caseId": case_id, "step": "flags"}, [card]


async def draft_letter(state: State, api: Api) -> Reply:
    case_id = state.get("caseId")
    if not case_id or state.get("step") not in {"flags", "draft"}:
        return state, [text_message(PROMPT)]
    res = await api("action.draftLetter", {"caseId": case_id, "kind": "letter"})
    action = res["action"]
    card = card_message(
        "Here is the exact letter. Nothing is sent until you approve.\n\n"
        + action["draft"],
        "review",
        {
            "title": "Approve this letter?",
            "summary_rows": [
                {"label": "To", "value": action["recipient"]},
                {
                    "label": "Points",
                    "value": f"{len(res['claims'])}, each with evidence",
                },
                {
                    "label": "We share",
                    "value": "Hospital name, account last 4, the lines listed",
                },
            ],
            "approve_cta": {
                "label": "Approve and send",
                "primary": True,
                "selection": {"action": "approve"},
            },
            "reject_cta": {"label": "Cancel", "selection": {"action": "cancel"}},
        },
    )
    return {
        "caseId": case_id,
        "step": "draft",
        "actionId": action["id"],
        "draftHash": res["draftHash"],
    }, [card]


async def approve(state: State, api: Api) -> Reply:
    if state.get("step") != "draft" or not state.get("actionId"):
        return state, [text_message("There is nothing to approve yet.")]
    action_id = state["actionId"]
    await api(
        "action.approve", {"actionId": action_id, "draftHash": state["draftHash"]}
    )
    sent = await api("action.send", {"actionId": action_id})
    card = card_message(
        "Sent. Check the test inbox for the letter.",
        "detail",
        {
            "title": "Letter sent",
            "summary_rows": [
                {"label": "To", "value": sent["recipient"]},
                {"label": "Status", "value": "Sent to the test inbox"},
            ],
        },
        terminal=True,
    )
    return {"caseId": state["caseId"], "step": "sent"}, [card]


async def cancel(state: State, api: Api) -> Reply:
    if state.get("step") != "draft" or not state.get("actionId"):
        return state, [text_message("There is nothing to cancel.")]
    await api(
        "action.approve",
        {
            "actionId": state["actionId"],
            "draftHash": state["draftHash"],
            "cancel": True,
        },
    )
    return {"caseId": state["caseId"], "step": "flags"}, [
        text_message("Cancelled. Nothing was sent.")
    ]
