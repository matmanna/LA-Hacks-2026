"""Interactive Card helpers for the Fetch Agent Chat Protocol.

Docs: https://innovationlab.fetch.ai/resources/docs/interactive-cards/asi-interactive-cards
"""

import json
from datetime import UTC, datetime
from uuid import uuid4

from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    MetadataContent,
    TextContent,
)


def text_message(text: str) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(UTC),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=text)],
    )


def card_message(narration: str, card_kind: str, card_payload: dict) -> ChatMessage:
    return ChatMessage(
        timestamp=datetime.now(UTC),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=narration),
            MetadataContent(
                type="metadata",
                metadata={
                    "card_protocol_version": "1",
                    "requires_card_interaction": "true",
                    "card_kind": card_kind,
                    "card_payload": json.dumps(card_payload),
                    "preferred_drawer_width_px": "540",
                },
            ),
        ],
    )


def gate_test_card() -> ChatMessage:
    """The review card used by the 17:00 Fetch gate check (A-02 ticket)."""
    return card_message(
        "Here's a quick check that cards work end to end.",
        "review",
        {
            "title": "Gate test",
            "summary_rows": [{"label": "Status", "value": "Agent reachable"}],
            "approve_cta": {
                "label": "Looks right",
                "primary": True,
                "selection": {"action": "gate_ok"},
            },
            "reject_cta": {"label": "Cancel", "selection": {"action": "gate_cancel"}},
        },
    )


def parse_card_selection(text: str) -> str | None:
    """Best-effort parse of a card button selection coming back as a chat message.

    ASI:One's exact reply shape for a card selection is unverified. Tries strict
    JSON first, then falls back to a substring search so a human typing the
    action name also works.
    """
    try:
        parsed = json.loads(text)
        action = parsed.get("action") if isinstance(parsed, dict) else None
        if isinstance(action, str):
            return action
    except (json.JSONDecodeError, AttributeError):
        pass
    for action in ("gate_ok", "gate_cancel"):
        if action in text:
            return action
    return None
