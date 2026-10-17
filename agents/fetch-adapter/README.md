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
- Calls go to B's adapter API, `POST /api/v1/<router>/<procedure>`
  (`apps/web/src/routes/api/v1/$.ts`), with `BB_ADAPTER_KEY` in the
  `x-bb-adapter-key` header. The key must match `BB_ADAPTER_KEY` in
  `apps/web/.env`, or the API returns 401.

## Run

```
uv sync
cp .env.example .env   # fill in AGENT_SEED, BETTERBILL_API_BASE, BB_ADAPTER_KEY
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
   `ping`, `card`, and `case`; `case` should reply with a new case id.
3. Submission steps in the Fetch hackpack read and understood (A-12,
   later).
