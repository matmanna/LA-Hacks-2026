# BetterBill Fetch agent

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)
![tag:hackathon](https://img.shields.io/badge/hackathon-5F43F1)

Thin Python uAgents service (tickets A-02 and A-07 in
[docs/plans/A-conversation-actions.md](../../docs/plans/A-conversation-actions.md)).
No business logic lives here: it keeps each person's session state, calls
BetterBill's adapter API, and formats replies as chat messages and
Interactive Cards.

- Agent name: `betterbill`
- Address: `agent1qwqz9059qrve4w2vykv4lrsws3hsw0r4ru4mmeh8wd3v0796al8zjh4uf7n`
  (set by `AGENT_SEED`; keep the seed unchanged)

## The conversation (`flow.py`)

1. Paste a bill, or type `sample`. A review card lists the lines: "Looks right"
   or "Paste again".
2. "Looks right" confirms the lines and runs the audit. A card lists what looks
   wrong, with each evidence tier and the savings estimate.
3. "Draft the letter" shows the exact letter text and an approval card.
4. "Approve and send" approves that exact text and sends it to the test inbox.
   A terminal card confirms. "Cancel" withdraws the draft and sends nothing.

Approval counts only from the card selection or a message that is exactly
`approve`; looser wording never approves anything. If the API fails, the reply
is "Something went wrong on our side. Nothing was sent. Reply retry to try
again."

## Run

```
uv sync
cp .env.example .env   # set AGENT_SEED, BETTERBILL_API_BASE, BB_ADAPTER_KEY
uv run python -m betterbill_agent.agent
```

`BB_ADAPTER_KEY` must match `BB_ADAPTER_KEY` in `apps/web/.env`; calls go to
`POST /api/v1/<router>/<procedure>` with it in the `x-bb-adapter-key` header.
Open the inspector URL the agent logs, connect the mailbox, then use "Chat with
Agent" on the Agentverse profile and type `sample`. To run it on a server:
`docker build -t betterbill-agent . && docker run --env-file .env betterbill-agent`
(mailbox mode needs no public port).

## Test

```
uv run ruff check .
uv run pytest
```

## Still needs a person

- Agentverse and ASI:One accounts, the mailbox connection, and one recorded
  ASI:One run; then add the profile and shared chat URLs to the root README.
- The ASI:One Submission Agent steps (A-12) by 11:30.
- ASI:One's exact reply format for a card click is unverified. The flow accepts
  the card's JSON selection anywhere in the message, or the action name typed
  exactly.
