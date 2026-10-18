import json

from betterbill_agent.api_client import ApiError
from betterbill_agent.flow import ERROR, PROMPT, handle_text, money, selected_action

LINES = [
    {
        "id": "l1",
        "description": "CBC w/ differential",
        "chargeCents": 8400,
        "units": 1.0,
    },
    {
        "id": "l2",
        "description": "CBC w/ differential",
        "chargeCents": 8400,
        "units": 1.0,
    },
]
FLAG = {
    "id": "f1",
    "title": "Listed twice on the same date",
    "explanation": "Ask billing whether you had two tests.",
    "tier": "confirmed",
    "amountCents": 8400,
}
BILL_TEXT = "Example Hospital itemized bill\nCBC w/ differential 85025 $84.00\n" * 2


class FakeApi:
    """Answers like the BetterBill API and records every call."""

    def __init__(self, fail: str | None = None):
        self.calls: list[tuple[str, dict]] = []
        self.fail = fail

    async def __call__(self, procedure: str, payload: dict) -> dict:
        self.calls.append((procedure, payload))
        if procedure == self.fail:
            self.fail = None
            raise ApiError("BAD_GATEWAY", "down")
        return {
            "case.create": {"id": "case-1"},
            "case.get": {"bill": {"lines": LINES}},
            "bill.parseText": {"bill": {"lines": LINES}},
            "bill.confirmLines": {"caseId": "case-1", "status": "lines_confirmed"},
            "audit.run": {
                "flags": [FLAG],
                "savings": {
                    "confirmedCents": 8400,
                    "potentialLowCents": 0,
                    "potentialHighCents": 0,
                },
            },
            "action.draftLetter": {
                "action": {
                    "id": "a1",
                    "draft": "Dear billing office",
                    "recipient": "inbox@example.com",
                },
                "draftHash": "h1",
                "claims": [{"flagId": "f1"}],
            },
            "action.approve": {"id": "a1"},
            "action.send": {"id": "a1", "recipient": "inbox@example.com"},
        }[procedure]

    def procedures(self) -> list[str]:
        return [name for name, _ in self.calls]


def card(msg) -> dict:
    meta = next(item for item in msg.content if item.type == "metadata").metadata
    assert all(isinstance(v, str) for v in meta.values())
    return {**meta, "card_payload": json.loads(meta["card_payload"])}


def text(msg) -> str:
    return "".join(item.text for item in msg.content if item.type == "text")


async def test_full_flow_from_pasted_bill_to_sent_letter():
    api = FakeApi()
    state, [lines_card] = await handle_text({}, BILL_TEXT, api)
    assert card(lines_card)["card_payload"]["title"] == "Check these lines"
    assert "I read 2 lines" in text(lines_card)

    state, [flags_card] = await handle_text(state, '{"action": "confirm_lines"}', api)
    assert card(flags_card)["card_payload"]["title"] == "What looks wrong"
    assert "Confirmed from your bill" in text(flags_card)
    assert "not legal or medical advice" in text(flags_card)

    state, [letter_card] = await handle_text(state, '{"action": "draft_letter"}', api)
    assert "Dear billing office" in text(letter_card)
    assert state["draftHash"] == "h1"

    state, [sent_card] = await handle_text(state, '{"action": "approve"}', api)
    sent = card(sent_card)
    assert sent["card_payload"]["title"] == "Letter sent"
    assert sent["is_terminal"] == "true"
    assert state["step"] == "sent"
    assert api.procedures() == [
        "case.create",
        "bill.parseText",
        "case.get",
        "bill.confirmLines",
        "audit.run",
        "action.draftLetter",
        "action.approve",
        "action.send",
    ]
    assert ("action.approve", {"actionId": "a1", "draftHash": "h1"}) in api.calls


async def test_sample_starts_from_the_bundled_bill():
    api = FakeApi()
    _, [msg] = await handle_text({}, "sample", api)
    assert api.calls[0] == ("case.create", {"sample": "SB-01"})
    assert api.procedures()[1] == "case.get"
    assert card(msg)["card_payload"]["title"] == "Check these lines"


async def test_short_text_asks_for_the_bill():
    api = FakeApi()
    _, [msg] = await handle_text({}, "hello there", api)
    assert text(msg) == PROMPT
    assert api.calls == []


async def test_nothing_is_approved_without_a_draft_or_by_loose_wording():
    api = FakeApi()
    _, [msg] = await handle_text({}, "approve", api)
    assert text(msg) == "There is nothing to approve yet."
    draft_state = {
        "caseId": "case-1",
        "step": "draft",
        "actionId": "a1",
        "draftHash": "h1",
    }
    await handle_text(draft_state, "I don't approve of this at all, please stop", api)
    assert "action.approve" not in api.procedures()


async def test_cancel_withdraws_the_draft():
    api = FakeApi()
    draft_state = {
        "caseId": "case-1",
        "step": "draft",
        "actionId": "a1",
        "draftHash": "h1",
    }
    state, [msg] = await handle_text(draft_state, '{"action": "cancel"}', api)
    assert text(msg) == "Cancelled. Nothing was sent."
    assert api.calls[0] == (
        "action.approve",
        {"actionId": "a1", "draftHash": "h1", "cancel": True},
    )
    assert state["step"] == "flags"


async def test_api_error_gives_plain_copy_and_retry_runs_the_step_again():
    api = FakeApi(fail="action.send")
    draft_state = {
        "caseId": "case-1",
        "step": "draft",
        "actionId": "a1",
        "draftHash": "h1",
    }
    state, [msg] = await handle_text(draft_state, '{"action": "approve"}', api)
    assert text(msg) == ERROR
    state, [msg] = await handle_text(state, "retry", api)
    assert card(msg)["card_payload"]["title"] == "Letter sent"


def test_selected_action_reads_card_json_even_when_wrapped():
    assert selected_action('Selected: {"action": "draft_letter"}') == "draft_letter"
    assert selected_action('{"action": "something_else"}') is None
    assert selected_action("Confirm_Lines") == "confirm_lines"
    assert selected_action("please approve it") is None


def test_money_formats_cents():
    assert money(8400) == "$84.00"
    assert money(175685) == "$1,756.85"
    assert money(-500) == "−$5.00"
