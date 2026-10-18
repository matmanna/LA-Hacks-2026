"""BetterBill's Fetch.ai chat adapter.

Thin by design: no business logic beyond routing chat text to api_client
and rendering replies. See docs/plans/A-conversation-actions.md ticket
A-02 and docs/plans/00-shared-context.md.
"""

import os

from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
    chat_protocol_spec,
)

from betterbill_agent.api_client import call_core_api
from betterbill_agent.cards import (
    card_message,
    gate_test_card,
    parse_card_selection,
    text_message,
)

AGENT_SEED = os.environ.get("AGENT_SEED")
if not AGENT_SEED:
    raise SystemExit(
        "Set AGENT_SEED in agents/fetch-adapter/.env before running this agent."
    )

agent = Agent(
    name="betterbill",
    seed=AGENT_SEED,
    port=8001,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


@protocol.on_message(model=ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage) -> None:
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=msg.msg_id))

    text = "".join(
        item.text for item in msg.content if isinstance(item, TextContent)
    ).strip()
    if not text:
        return

    selection = parse_card_selection(text)
    if selection:
        await ctx.send(
            sender, card_message(f"Got it: {selection}", "ack", {"action": selection})
        )
        return

    lowered = text.lower()
    if lowered == "ping":
        await ctx.send(
            sender,
            text_message("BetterBill is here. Paste your hospital bill text to start."),
        )
        return

    if lowered == "card":
        await ctx.send(sender, gate_test_card())
        return

    if lowered == "case":
        try:
            result = await call_core_api("case.create", {})
            await ctx.send(
                sender, text_message(f"Started case {result.get('id', 'unknown')}.")
            )
        except Exception as exc:  # noqa: BLE001 - this is the user-facing fallback, not a crash
            ctx.logger.warning(f"case.create failed: {exc}")
            await ctx.send(
                sender,
                text_message(
                    "I couldn't reach BetterBill's server just now. Please try again in a moment."
                ),
            )
        return

    await ctx.send(
        sender,
        text_message(
            "Try: ping, card, or case. Or paste your hospital bill text to start an audit."
        ),
    )


@protocol.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement) -> None:
    pass


agent.include(protocol, publish_manifest=True)


if __name__ == "__main__":
    agent.run()
