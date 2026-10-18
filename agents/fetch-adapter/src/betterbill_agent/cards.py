"""Chat messages and Interactive Cards for the Fetch Agent Chat Protocol.

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


def card_message(
    narration: str, card_kind: str, card_payload: dict, *, terminal: bool = False
) -> ChatMessage:
    """A terminal card closes the flow, so it asks for no interaction."""
    return ChatMessage(
        timestamp=datetime.now(UTC),
        msg_id=uuid4(),
        content=[
            TextContent(type="text", text=narration),
            MetadataContent(
                type="metadata",
                metadata={
                    "card_protocol_version": "1",
                    "requires_card_interaction": "false" if terminal else "true",
                    "is_terminal": "true" if terminal else "false",
                    "card_kind": card_kind,
                    "card_payload": json.dumps(card_payload),
                    "preferred_drawer_width_px": "540",
                },
            ),
        ],
    )
