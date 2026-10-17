# BetterBill Fetch adapter

Thin Python uAgents service for ticket A-02 in
[docs/plans/A-conversation-actions.md](../../docs/plans/A-conversation-actions.md).
No business logic lives here; it forwards chat text to the TypeScript core
API and renders replies as chat messages or Interactive Cards.

## Status (2026-10-17)

- Agent, chat protocol, cards, and the `case.create` HTTP call path are
  written and unit tested against the installed `uagents`/`uagents-core`
  (0.26.1 / 0.4.12) — field names and decorator signatures were checked
  against the installed packages, not assumed from the ticket.
- **Not done, needs a human:** creating the Agentverse/ASI:One accounts,
  setting a real `AGENT_SEED`, and running the three live checks below.
  None of that can happen from here.
- **Known placeholder:** `api_client.ROUTES["case.create"]` guesses
  `/api/rpc/case/create` based on how oRPC is actually mounted in
  `apps/web/src/routes/api/rpc/$.ts` (its own RPC-over-HTTP protocol, not
  the REST/OpenAPI endpoint the ticket assumed). `packages/api`'s router
  only has `healthCheck` and `privateData` as of this commit, so this is
  untestable against a real server yet either way. Fix only
  `api_client.py` once B's `case.create` exists and the 17:00 handoff
  confirms the real path.

## Run

```
uv sync
cp .env.example .env   # fill in AGENT_SEED (and BETTERBILL_API_BASE / BB_ADAPTER_KEY once B's API is up)
uv run python -m betterbill_agent.agent
```

## Test

```
uv run ruff check .
uv run pytest
```

## Manual gate checklist (needs a human with Agentverse/ASI:One access)

1. Agent runs locally with `mailbox=True`, logs an `agent1q...` address,
   shows connected in the Agentverse inspector.
2. "Chat with Agent" from the Agentverse profile opens ASI:One; send
   `ping`, `card`, and `case` and confirm the replies above. `case` is
   expected to fail gracefully until B's `case.create` is live.
3. Submission steps in the Fetch hackpack read and understood (A-12,
   later).
