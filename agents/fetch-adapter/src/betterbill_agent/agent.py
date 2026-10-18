"""BetterBill's Fetch.ai chat agent (tickets A-02, A-07).

Thin by design: it keeps each person's session state and hands their text to
flow.handle_text, which formats what the BetterBill API decides. See
docs/plans/A-conversation-actions.md.
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
from betterbill_agent.cards import text_message
from betterbill_agent.flow import handle_text

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
    if text.lower() == "ping":
        await ctx.send(
            sender,
            text_message("BetterBill is here. Paste your hospital bill text to start."),
        )
        return

    key = f"session:{sender}"
    state = ctx.storage.get(key) or {}
    new_state, replies = await handle_text(state, text, call_core_api)
    if new_state.get("last"):
        # Bill text is never logged, only which step failed.
        ctx.logger.warning(f"flow step failed: {new_state['last']}")
    ctx.storage.set(key, new_state)
    for reply in replies:
        await ctx.send(sender, reply)


@protocol.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement) -> None:
    pass


agent.include(protocol, publish_manifest=True)


if __name__ == "__main__":
    agent.run()
