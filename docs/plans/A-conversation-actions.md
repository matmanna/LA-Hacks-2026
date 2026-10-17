# BetterBill Role A: Conversation and Actions (execution plan)

Owner: Role A. Window: Sat Oct 17 15:00 to Sun Oct 18 12:00 PDT. Freeze Sun 09:00. Judging 12:30.
Binding context: `docs/plans/00-shared-context.md` (wins on any conflict), `docs/plans/00-team-brief.md`, `docs/plans/bill-audit-design-doc.md`, `docs/plans/bill-audit-prd.md`.
Docs read for this plan on 2026-10-17: Fetch hackpack, Fetch submission doc (loaded through the Google Docs text export), Fetch Innovation Lab chat protocol and Interactive Cards pages, Photon docs (beta and stable), ElevenLabs API reference, Gemini API docs. The Photon hackathon guidelines (Notion) and the Fetch resources doc did NOT load. Anything from those is marked UNVERIFIED.

---

## 1. Role summary

**Mission.** Turn BetterBill's findings into safe, approved action. A owns everything after the audit: the case state machine and its append-only event log, the letter (drafted by Gemini, checked claim by claim against flags), the approval step, the send to a test inbox, the outbound call (Photon line plus ElevenLabs voice) with transcript and outcome card, and, if the 17:00 gate passes, the Fetch.ai adapter so the whole flow works inside ASI:One.

**Rule A never breaks:** nothing leaves BetterBill (email, call, text) without an `action.approved` CaseEvent whose draft hash matches the exact text being sent or said.

**What A owns**
| Area | Deliverable |
|---|---|
| Case flow | Pure state machine in `packages/core`: `new` to `lines_confirmed` to `audited` to `action_pending` to `sent` to `called` (and `closed`), status derived from append-only `CaseEvent`s, approval guard |
| Letters | Server-side Gemini drafting from flags; dispute letter and itemized-bill request templates; claim validator (every claim maps to a flag with evidence); wording rules; deterministic fallback |
| Send | Test inbox send. Photon email if it supports outbound-first send with our domain in time, otherwise Resend (decision recorded in A-06) |
| Call | Approved outbound call over Photon SIP line to ElevenLabs agent, disclosure opening, minimum data, transcript capture, structured outcome card, labelled recorded fallback |
| Fetch (gated) | Thin Python uAgents adapter calling the TypeScript oRPC API over HTTP. No business logic. Submission Agent done by 11:30 |

**Tracks A carries and what their judges need to see**
| Track | What judges need to see (source) | How BetterBill shows it |
|---|---|---|
| Fetch.ai | From the hackpack (verified 2026-10-17): at least one agent registered on Agentverse; Agent Chat Protocol via `chat_protocol_spec` with `agent.include(protocol, publish_manifest=True)`; discoverable and usable through asi1.ai; primary workflow entirely inside an ASI:One conversation with no custom frontend; meaningful tool execution; public GitHub repo with run instructions; README with agent names and addresses plus the two Innovation Lab badges; 3 to 5 minute demo video; Devpost plus ASI:One Submission Agent. Recommended: ASI1 Interactive Cards. Bonus: multi-agent, Payment Protocol, error handling, real-time data. Weights: functionality 25%, Fetch tech 20%, innovation 20%, impact 20%, UX 15% | Paste a bill in ASI:One, confirm lines on a review card, see flags with evidence, approve the letter on a review card, letter lands in the test inbox. Adapter is thin and reliable; errors return a plain message and a retry option |
| Photon | Guidelines page did not load (UNVERIFIED). From Photon's docs: Photon 2.0 offers one API for iMessage, WhatsApp, Telegram, email, and voice (voice through SIP). A different event's Photon page required integrating Photon's SDK to qualify; assume the same until the guidelines are read | Real call over a Photon line; optional A2 text-a-bill over iMessage; possibly email over Photon. Ask the Photon booth what they judge |
| MLH ElevenLabs | MLH criteria UNVERIFIED; assume "ElevenLabs is load-bearing" | ElevenLabs agent is the voice on the call; transcript and analysis come back from the ElevenLabs Conversations API |
| MLH Gemini | MLH criteria UNVERIFIED; assume "Gemini API is load-bearing" | Gemini drafts every letter paragraph from flags and extracts the call outcome if ElevenLabs analysis is missing |

---

## 2. Role onboarding (15 minutes, start at 15:00)

Do these in this order. Requests that need human approval go first because they take time.

1. **Photon (5 min, do first).** Sign up at https://app.beta.photon.codes (Photon 2.0 beta dashboard; stable dashboard is https://app.photon.codes). Create an organization and a project. Copy the Project ID (starts with `pho_prj_`) from Settings. Create an API key named `betterbill-server` with `project:read`, `project:write`, `platforms:read` (save it, it is shown once). Then go to the Photon booth or support@photon.codes and ask: (a) is there a hackathon plan or credit, (b) how to get an **SMS number or dedicated line** (voice needs one: shared iMessage lines cannot take calls, per the voice docs), (c) can email send a first message (not a reply), (d) what the Photon track judges. Write answers in team chat.
2. **ElevenLabs (3 min).** Sign up at https://elevenlabs.io, create an API key (server only). Check that the Agents Platform and phone number import are available on your plan (UNVERIFIED for free tier).
3. **Gemini (1 min).** Create a key at Google AI Studio. Default model id `gemini-3.8-flash` (listed as recommended on the Gemini models page 2026-10-17). Keep it in env `GEMINI_MODEL` so it can change.
4. **Email fallback (1 min).** Sign up for Resend (https://resend.com) with the address that will be the test inbox. Create an API key. Without a verified domain Resend only delivers to the account owner's address from its test sender (UNVERIFIED in this session; check its dashboard).
5. **Fetch (2 min).** Sign up at https://agentverse.ai and https://asi1.ai (use the LA Hacks festival signup link from the hackpack: https://asi1.ai/auth/signup?returnTo=%2Ffestival%2Flahacksai2026%2Fdashboard%3Futm_source%3Dlahacksai2026).
6. **Local setup (3 min, while keys load).**
   ```
   cd <repo root>
   bun install
   cp .env.example .env            # fill A's keys locally only
   docker compose up -d db
   bun db:push && bun db:seed      # local DB only, never shared
   bun dev
   # Python adapter (only needed from 16:00)
   curl -LsSf https://astral.sh/uv/install.sh | sh
   uv python install 3.11
   ```
7. **Test phones.** Two phones: the "billing office" phone (held by a teammate, later a judge) and A's own phone. Write both E.164 numbers into `CALL_ALLOWLIST` in `.env` and in Vercel. Every person whose phone receives a call says yes first; write their name and the time in team chat.

A's env names (add to `.env.example` and `apps/web/.env.schema` in A-04; values never committed):
`GEMINI_API_KEY`, `GEMINI_MODEL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TEST_INBOX`, `EMAIL_ALLOWLIST`, `EMAIL_PROVIDER` (`resend` or `photon`), `PHOTON_PROJECT_ID`, `PHOTON_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `CALL_ALLOWLIST`, `BB_FAKE_PROVIDERS` (`1` in CI and tests), `BB_SERVICE_TOKEN` (adapter to API). Adapter only: `AGENT_SEED`, `BETTERBILL_API_BASE`, `BB_SERVICE_TOKEN`.

Note: Photon's TypeScript client `@photon-ai/api@0.5.0` requires Node 24 or later. To avoid runtime surprises on Vercel and Bun, A calls Photon over plain HTTPS (`https://api.photon.codes`, `Authorization: Bearer <key>`) only if needed (email or A2). The call path does not need Photon's API at runtime: ElevenLabs dials out through the Photon SIP trunk.

---

## 3. Interfaces

### 3.1 oRPC procedures (names binding, from shared context section 6)
B owns the router files and the names. Routers stay thin. A writes the logic in `packages/core` (pure) and `packages/api/src/services/*` (IO), and fills in the handler bodies of the five action and call procedures. Agree this split with B at 16:00 (G0); if B prefers to write those handlers, A hands over the service functions unchanged.

| Procedure | A role | Proposed input / output (confirm in B's contract PR) |
|---|---|---|
| `case.create`, `case.get`, `case.list` | Consumes; calls `appendEvent` with `case.created` inside B's handler | B's shapes |
| `bill.parseText`, `bill.parsePhoto` | Consumes (Fetch adapter uses `parseText`) | B's shapes |
| `bill.confirmLines` | Consumes; B's handler appends `lines.confirmed` through A's `appendEvent` | B's shapes |
| `audit.run`, `audit.get` | Consumes; B's handler appends `audit.completed` | B's shapes, returns `Flag[]`, `Savings` |
| `assistance.check` | Consumes (read only) | C/B shapes |
| `action.draftLetter` | **Implements** | in `{ caseId, kind: "letter" \| "itemized_request", flagIds?: string[] }` out `{ action: Action, draftHash: string, claims: LetterClaim[], usedFallback: boolean }` |
| `action.approve` | **Implements** | in `{ actionId, draftHash, consent?: boolean }` out `{ action: Action, event: CaseEvent }` |
| `action.send` | **Implements** | in `{ actionId }` out `{ action: Action, event: CaseEvent }`; throws `FORBIDDEN` if no matching approval |
| `call.start` | **Implements** | in `{ actionId }` (action kind `call`, approved) out `{ action, conversationId }` |
| `call.status` | **Implements** | in `{ actionId }` out `{ status: "ringing" \| "in_progress" \| "done" \| "failed", outcome: CallOutcome \| null }` |
| `event.list` | Consumes (timeline) | `{ caseId }` to `CaseEvent[]` |
| `eval.results` | Consumes nothing | n/a |

New A-owned pure modules (not contract changes to `schemas.ts`, but tag PR `contract` because B's handlers import them): `packages/core/src/case-machine.ts`, `packages/core/src/events.ts`, `packages/core/src/letters/*`, `packages/core/src/call.ts`.

Storage without changing the contract: the approval's draft hash lives in `CaseEvent.artifactRef` as `action:<actionId>#sha256:<hex>`. Call outcome and transcript live in `Action.outcome` as a JSON string validated by `CallOutcomeSchema`. The `call.started` event's `artifactRef` holds the approval ref (same format as `action.sent`), and its `summary` holds the ElevenLabs conversation id as `elevenlabs:<conversationId>`.

### 3.2 D components A consumes (from `packages/ui/src/components/bb/`)
| Component | A uses it for | Props A needs (send to D at 16:00) |
|---|---|---|
| `ApprovalSheet` | Letter and call approval | `open`, `onOpenChange`, `kind: "letter" \| "itemized_request" \| "call"`, `recipient: string`, `text: string`, `dataShared: string[]`, `requireConsent?: boolean`, `approving: boolean`, `onApprove(consent: boolean)`, `onCancel()` |
| `ActivityTimeline` | Case timeline | `events: { id, at, title, detail?, done: boolean }[]`, `current?: { title, detail }` |
| `Money` | Amounts in outcome card and letter preview | `cents` |
| `TierBadge` | Claims list in the approval sheet | `tier` |
| `EmptyState`, `ErrorState`, `LoadingState` | Draft loading, send failure, call failure | D's shapes |

Until D ships them, A uses interim components in `apps/web/src/features/actions/` built from shadcn primitives (`@betterbill/ui/components/sheet`, `button`, `card`, `checkbox`, `accordion`, `badge`, `skeleton`, `sonner`) with the exact tokens from section 8 of the shared context. When D's component lands, A swaps the import in one small PR and deletes the interim file.

### 3.3 Handoffs
| Time | From | To | What |
|---|---|---|---|
| 16:00 | B | A | Repo scaffolded, `packages/core` exists, `schemas.ts` merged, router stubs with the binding names, Drizzle tables for case, action, event |
| 16:00 | A | B | `case-machine.ts` and `events.ts` merged (A-01) so B's handlers can call `appendEvent` |
| 16:00 | A | D | ApprovalSheet and ActivityTimeline prop lists above; copy strings from A-05 and A-09 |
| 17:00 | A | team | Fetch gate result: in or dropped |
| 17:00 | B | A | OpenAPI handler path and a service-token middleware (`x-bb-service-token` header equals `BB_SERVICE_TOKEN`) for the adapter |
| 18:00 | C | A | Wording rules list (banned words, phrasing) and 3 synthetic bills with expected flags for letter tests |
| 20:00 | D | A | `ApprovalSheet` v1 in `packages/ui` (if late, A keeps the interim) |
| 21:00 | D | A | `ActivityTimeline` v1 |
| 00:00 | A | C | G2 run recorded for the demo script; test inbox screenshot |
| 02:30 | A | C | Call transcript and outcome card for the demo; recorded fallback file |
| 10:00 | C | A | Devpost URL and demo video URL for the Fetch Submission Agent |

---

## 4. Numbers that matter for A

Rule from the shared context: a target is never shown as a result. Every number in the pitch says "measured on N runs, date."

| Number | Target | How A measures it | Where it is written |
|---|---|---|---|
| Letter draft time (p50, p95) | Under 15 s | Sentry span `letter.draft` duration; `bun run --filter @betterbill/api measure:letters` runs `action.draftLetter` on the 10 synthetic bills, 3 times each, live Gemini | `data/eval/actions.json` key `letterDraftMs` |
| Claim coverage | 100% of letter paragraphs map to a flag with evidence | `checkLetterClaims` result for each measured letter; any failure counts | `data/eval/actions.json` key `claimCoverage` |
| Fallback rate | Measured, no target | Share of drafts where `usedFallback` is true | `data/eval/actions.json` key `letterFallbackRate` |
| Banned-word hits in letters | 0 | `checkWording` on every measured letter | `data/eval/actions.json` |
| Approval coverage | 100% | `approvalCoverage(events)` in core: every `action.sent` and `call.started` has an earlier `action.approved` with the same hash. Unit test, integration test, and a check run on the seeded and demo cases | `data/eval/actions.json` key `approvalCoverage` |
| Call connect rate | Measured, no target | Count of `call.started` vs `call.completed` in rehearsal (log every attempt in team chat with time) | `data/eval/actions.json` key `calls` |
| Disclosure present | 100% of calls | First agent turn of each ElevenLabs transcript starts with the disclosure sentence (`checkDisclosure`) | same |
| Approve to ring time | Measured | Time between `call.started` and the first transcript turn | same |
| Send delivery | Logged for every send | Provider message id in `action.sent` event; screenshot of the test inbox | event log |
| ASI:One flow time (if Fetch is in) | Measured | Wall clock from pasting bill text to "Letter sent" card, 3 runs | `data/eval/actions.json` key `asiOneFlowMs` |

C owns `data/eval/results.json`; A writes `data/eval/actions.json` and tells C when it changes.

---

## 5. Timeline (PDT) with gates

| Time | A does | Coding agent in parallel |
|---|---|---|
| 15:00 to 15:15 | Onboarding (section 2), Photon and ElevenLabs requests first | n/a |
| 15:15 to 16:00 | A-01 case machine (waits for B's `packages/core` scaffold; if not ready by 15:30, write it in a scratch branch and rebase) | A-02 Fetch hello agent |
| **16:00 G0** | Check gate, send prop lists to D, agree handler split with B | |
| 16:00 to 17:00 | A-02 finish: ASI:One reachability test; ElevenLabs agent created in dashboard (A-08 step 1) | A-03 letter core |
| **17:00 Fetch gate** | Decide in or out, post in chat | |
| 17:00 to 19:30 | A-03 review and merge, A-04 Gemini drafter and `action.draftLetter` | (if Fetch in) A-07 adapter skeleton against stubs |
| 19:30 to 20:00 | Help G1: run the sample case on a phone, show at 2 to 3 booths, ask Photon booth questions | |
| **20:00 G1** | Check gate | |
| 20:00 to 21:00 | A-05 approval flow | A-07 adapter flow (if in) |
| 21:00 to 22:00 | A-06 send to test inbox (email provider decision at 21:00) | A-10 tests and Playwright |
| 22:00 to 23:30 | A-10 merge; A-07 merge (if in); fix G2 blockers for anyone | |
| 23:30 to 00:00 | G2 dry run twice on a phone | |
| **00:00 G2** | Check gate. Pick A1 or A2 | |
| 00:00 to 01:30 | A-08 call start (SIP setup Photon to ElevenLabs) | A-09 outcome card UI |
| 01:30 to 02:45 | A-09 call status and outcome | A-11 recorded fallback |
| 02:45 to 03:00 | Record one full rehearsal call as the labelled fallback | |
| 03:00 to 05:00 | Sleep (shift 1; confirm with team who keeps main green) | |
| 05:00 to 07:00 | Strengthening option (A1 recommended, 2 h) | Fetch cards polish (if in) |
| 07:00 to 09:00 | Proof: one real call placed and transcribed on the preview; ASI:One shared chat recorded; measure section 4 numbers | A-12 README Fetch section |
| **09:00 Freeze** | Fixes only | |
| 09:00 to 10:30 | Support C's video and Devpost; agent addresses in README | |
| 10:30 to 11:30 | Fetch Submission Agent (A-12) by 11:30 | |
| 12:00 | Submission deadline. 12:30 judging: A runs the call segment | |

### Gate checklists

**G0 16:00**
- [ ] A-01 merged or in review with tests green
- [ ] A's keys in local `.env`; Photon access requested; ElevenLabs key works (`curl -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user` returns 200; header name UNVERIFIED in this session)
- [ ] Phone loads the Vercel preview (B)
- [ ] Prop lists sent to D; handler split agreed with B

**Fetch gate 17:00** (all must pass, otherwise drop Fetch and say so in chat)
- [ ] Agent runs locally with `mailbox=True`, shows an `agent1q...` address, mailbox connected in the Agentverse inspector
- [ ] "Chat with Agent" from the Agentverse profile opens ASI:One and the agent replies
- [ ] The agent makes one HTTP call to the deployed API (`case.create` through the OpenAPI handler) and replies with the new case id
- [ ] One Interactive Card (review kind) renders in ASI:One and its button selection comes back to the agent
- [ ] Submission steps read (done: see A-12)
If dropped: A-07 and A-12 are cut; spend the time on A-08, A-09, and option A1.

**G1 20:00**
- [ ] Paste a bill, see flags with evidence on a phone (B and D)
- [ ] A-03 merged; A-04 returns a validated letter for the sample case in under 15 s locally
- [ ] Event log shows `case.created`, `lines.confirmed`, `audit.completed` for the sample case

**G2 00:00**
- [ ] Photo in, flags, letter drafted, approval sheet shows exact text, Approve and send, letter arrives in the test inbox, timeline shows "Letter sent"
- [ ] `approvalCoverage` returns 100% on the demo case
- [ ] Cancel path: nothing sent, `action.cancelled` event recorded
- [ ] Playwright approval smoke green on mobile and desktop
- [ ] (Fetch in) Same flow completes in ASI:One with pasted text

**Freeze 09:00**
- [ ] One real call placed to the consented test phone on the deployed preview, transcript and outcome card visible
- [ ] Labelled recorded fallback present and reachable in the UI
- [ ] Section 4 numbers measured and written, with dates
- [ ] (Fetch in) README lists agent name and address with badges; ASI:One shared chat URL saved

---

## 6. Tickets (one PR each, incremental)

Shared rules for every prompt below (paste them at the top of each coding-agent session):
```
Context: BetterBill monorepo at <repo root>. Read AGENTS.md and
docs/plans/00-shared-context.md first. Money is integer cents. Times are ISO 8601 UTC.
Business logic is pure TypeScript in packages/core (no IO). Routers in packages/api are thin.
All model, email, voice, and telephony calls are server-side. Never put keys in client code.
Copy rules: plain words, never "illegal", "fraud", or "overcharge" as a conclusion. No em dashes or en dashes.
Use shadcn components from @betterbill/ui and domain components from packages/ui/src/components/bb.
Do not edit packages/core/src/schemas.ts. Do not run db:push against any non-local database.
Before you finish: bun x biome ci . && bun run check-types && bun run test must pass.
Then: git add -A && git commit -m "<conventional title>" && git push -u origin <branch>
&& gh pr create --fill --base main, and paste the PR URL. Fill the PR template (What, Why, Screens 390 px
and 1280 px if UI, Tests added, Contract changes yes/no, Checklist).
If an import path or package name in this prompt does not exist, search the repo (rg) for the real one and
note the difference in the PR body. Do not invent APIs.
```

---

### A-01 Case state machine and event log
- **Branch:** `a/case-machine` | **Time:** 45 min | **Depends on:** B's scaffold with `packages/core` and `schemas.ts`
- **Goal:** pure, tested state machine, event type constants, approval guard, approval coverage metric.
- **Files:** `packages/core/src/events.ts`, `packages/core/src/case-machine.ts`, `packages/core/src/hash.ts`, `packages/core/src/index.ts` (export), `packages/core/test/case-machine.test.ts`
- **Acceptance:** status is derived only from events; illegal transitions throw `TransitionError`; `assertApproved` throws without a matching hash; `approvalCoverage` returns 1 on a good log and less than 1 on a log with an unapproved send.
- **Tests:** unit only (Vitest), at least 12 cases.

```
Task A-01: case state machine (branch a/case-machine).
1. Create packages/core/src/events.ts exporting:
   export const EventType = {
     caseCreated: "case.created", linesConfirmed: "lines.confirmed", auditCompleted: "audit.completed",
     actionDrafted: "action.drafted", actionApproved: "action.approved", actionCancelled: "action.cancelled",
     actionSent: "action.sent", actionSendFailed: "action.send_failed", callStarted: "call.started",
     callCompleted: "call.completed", callFailed: "call.failed", caseClosed: "case.closed",
   } as const;
   export type EventTypeName = (typeof EventType)[keyof typeof EventType];
   export const OUTBOUND_EVENTS: EventTypeName[] = ["action.sent", "call.started"];
   export const EVENT_TITLES: Record<EventTypeName, string> = {
     "case.created": "Case started", "lines.confirmed": "You confirmed the lines",
     "audit.completed": "Bill checked", "action.drafted": "Draft ready for you",
     "action.approved": "You approved it", "action.cancelled": "You cancelled it",
     "action.sent": "Letter sent", "action.send_failed": "Letter not sent",
     "call.started": "Call started", "call.completed": "Call finished",
     "call.failed": "Call did not connect", "case.closed": "Case closed" };
2. Create packages/core/src/hash.ts with `export async function sha256Hex(text: string): Promise<string>`
   using globalThis.crypto.subtle (works in Bun, Node 20+, Vercel). Normalize text first: replace \r\n with \n
   and trim trailing spaces on each line.
3. Create packages/core/src/case-machine.ts. Import CaseStatus and CaseEvent types from ./schemas.
   - `const TRANSITIONS: Record<EventTypeName, { from: CaseStatus[] | "any"; to: CaseStatus | "same" }>`:
     case.created: from [] (only first event) to "new"
     lines.confirmed: from ["new","lines_confirmed","audited"] to "lines_confirmed"
     audit.completed: from ["lines_confirmed","audited"] to "audited"
     action.drafted: from ["audited","action_pending","sent","called"] to "action_pending"
     action.approved, action.cancelled, action.send_failed: from ["action_pending"] to "same"
     action.sent: from ["action_pending"] to "sent"
     call.started: from ["action_pending"] to "same"
     call.completed: from ["action_pending"] to "called"
     call.failed: from ["action_pending"] to "same"
     case.closed: from "any" to "closed"
   - `export class TransitionError extends Error { constructor(public from: CaseStatus | null, public type: string) }`
   - `export function nextStatus(current: CaseStatus | null, type: EventTypeName): CaseStatus` (throws TransitionError)
   - `export function deriveStatus(events: CaseEvent[]): CaseStatus` (sort by `at` then fold with nextStatus)
   - `export function approvalRef(actionId: string, hash: string): string` returns `action:${actionId}#sha256:${hash}`
   - `export function findApproval(events: CaseEvent[], actionId: string): { hash: string; at: string } | null`
     (latest action.approved for that actionId, ignored if a later action.cancelled or action.drafted for the same
     actionId exists)
   - `export function assertApproved(events: CaseEvent[], actionId: string, currentHash: string): void`
     throws `new Error("NOT_APPROVED")` if none, `new Error("DRAFT_CHANGED")` if hash differs.
   - `export function approvalCoverage(events: CaseEvent[]): { outbound: number; approved: number; ratio: number }`
     For each event in OUTBOUND_EVENTS, parse actionId from artifactRef `action:<id>#...` and check an earlier
     action.approved with the same ref exists. ratio = 1 when outbound is 0.
   - `export function makeEvent(input: Omit<CaseEvent,"id"|"at"> & { at?: string }): CaseEvent` using
     crypto.randomUUID() and new Date().toISOString().
4. Export everything from packages/core/src/index.ts.
5. Tests in packages/core/test/case-machine.test.ts: happy path new to called; re-confirm lines after audit;
   send without approval throws; approve then edit (new action.drafted) then send throws DRAFT_CHANGED or
   NOT_APPROVED; cancel invalidates approval; closed from any; first event must be case.created;
   approvalCoverage 1.0, 0.5, and empty log; deriveStatus ignores input order; sha256Hex stable across \r\n.
Do not: add IO, import drizzle, or change schemas.ts.
Verify: bun run --filter @betterbill/core test
Done: tests pass, exports available as `import { deriveStatus } from "@betterbill/core"`. Open the PR titled
"feat(core): case state machine and approval guard", tag it `contract`, post in chat.
```

---

### A-02 Fetch hello agent (gate test)
- **Branch:** `a/fetch-hello` | **Time:** 45 min | **Depends on:** Agentverse account; deployed preview URL for the HTTP check
- **Goal:** pass the 17:00 Fetch gate.
- **Files:** `agents/fetch-adapter/pyproject.toml`, `agents/fetch-adapter/src/betterbill_agent/__init__.py`, `agents/fetch-adapter/src/betterbill_agent/agent.py`, `agents/fetch-adapter/src/betterbill_agent/cards.py`, `agents/fetch-adapter/tests/test_cards.py`, `agents/fetch-adapter/README.md`, `agents/fetch-adapter/.env.example`
- **Acceptance:** Fetch gate checklist (section 5) passes.
- **Tests:** pytest for `card_message` metadata (all values are strings, `card_protocol_version` is `"1"`).

```
Task A-02: Fetch hello agent (branch a/fetch-hello). Python 3.11, uv.
1. cd agents/fetch-adapter && uv init --package --name betterbill-agent --python 3.11
   uv add uagents uagents-core httpx python-dotenv
   uv add --dev ruff pytest pytest-asyncio respx
2. agent.py, following https://innovationlab.fetch.ai/resources/docs/examples/chat-protocol/asi-compatible-uagents :
   from uagents import Agent, Context, Protocol
   from uagents_core.contrib.protocols.chat import (ChatAcknowledgement, ChatMessage, EndSessionContent,
       MetadataContent, TextContent, chat_protocol_spec)
   agent = Agent(name="betterbill", seed=os.environ["AGENT_SEED"], port=8001, mailbox=True,
                 publish_agent_details=True)
   protocol = Protocol(spec=chat_protocol_spec)
   On ChatMessage: send ChatAcknowledgement(acknowledged_msg_id=msg.msg_id); join TextContent texts;
   if text is "ping" reply "BetterBill is here. Paste your hospital bill text to start.";
   if text is "case" call POST {BETTERBILL_API_BASE}/case/create (confirm the exact path with B's OpenAPI
   handler; keep paths in one dict ROUTES in agent.py) with header x-bb-service-token, and reply
   "Started case <id>."; if text is "card" send a review card (step 3).
   On ChatAcknowledgement: pass. agent.include(protocol, publish_manifest=True). agent.run() under __main__.
3. cards.py: def card_message(narration: str, card_kind: str, card_payload: dict) -> ChatMessage that returns
   ChatMessage(timestamp=datetime.now(timezone.utc), msg_id=uuid4(), content=[TextContent(type="text",
   text=narration), MetadataContent(type="metadata", metadata={"card_protocol_version": "1",
   "requires_card_interaction": "true", "card_kind": card_kind, "card_payload": json.dumps(card_payload),
   "preferred_drawer_width_px": "540"})]). Check the field names of ChatMessage and MetadataContent in the
   installed uagents_core source (python -c "import uagents_core.contrib.protocols.chat as c; help(c)") and
   adjust if they differ. Test review payload:
   {"title": "Gate test", "summary_rows": [{"label": "Status", "value": "Agent reachable"}],
    "approve_cta": {"label": "Looks right", "primary": true, "selection": {"action": "gate_ok"}},
    "reject_cta": {"label": "Cancel", "selection": {"action": "gate_cancel"}}}
   Docs: https://innovationlab.fetch.ai/resources/docs/interactive-cards/asi-interactive-cards
4. Parse card replies: try json.loads(text) and read "action"; on failure search the text for "gate_ok" or
   "gate_cancel". Reply "Got it: <action>".
5. tests/test_cards.py: all metadata values are str; card_payload round-trips through json.loads.
6. Run: uv run python -m betterbill_agent.agent ; open the inspector URL from the log; Connect, Mailbox;
   then Agent Profile, Chat with Agent; send ping, case, card in ASI:One.
Do not: put AGENT_SEED or tokens in git; add business logic; call an LLM.
Verify: uv run ruff check . && uv run pytest
Done: gate checklist passes; screenshot of ASI:One chat in the PR. Open the PR
"feat(agents): Fetch hello agent for gate test".
```

---

### A-03 Letter core: templates, claim validator, wording rules
- **Branch:** `a/letter-core` | **Time:** 75 min | **Depends on:** A-01; C's wording list (use the shared-context list until it arrives)
- **Goal:** everything about a letter that can be pure: template rendering, the model-output schema, the claim check, and a deterministic fallback letter.
- **Files:** `packages/core/src/letters/model-schema.ts`, `packages/core/src/letters/check-claims.ts`, `packages/core/src/letters/wording.ts`, `packages/core/src/letters/render.ts`, `packages/core/src/letters/fallback.ts`, `packages/core/src/letters/index.ts`, `packages/core/test/letters.test.ts`
- **Acceptance:** fallback letter for the sample bill passes `checkLetterClaims` and `checkWording`; any amount, code, or flag id not backed by a flag fails the check.
- **Tests:** unit, at least 15 cases including adversarial model outputs.

```
Task A-03: letter core (branch a/letter-core). Pure TypeScript in packages/core. No IO.
1. model-schema.ts (zod):
   export const LetterModelOutputSchema = z.object({
     subject: z.string().max(90),
     opening: z.string().max(400),
     paragraphs: z.array(z.object({ flagId: z.string(), text: z.string().max(500) })).max(8),
     closingRequest: z.string().max(400),
   });
   export type LetterModelOutput = z.infer<typeof LetterModelOutputSchema>;
   export type LetterKind = "letter" | "itemized_request";
   export type LetterClaim = { flagId: string; paragraphIndex: number; amountCents: number; tier: Tier };
2. wording.ts:
   export const BANNED = ["illegal","fraud","fraudulent","overcharge","overcharged","overcharging","scam",
     "lawsuit","sue","attorney","guarantee"];
   export function checkWording(text: string): string[]  // returns banned words found, case-insensitive,
   whole-word match. Also flag em dash U+2014 and en dash U+2013 as problems "dash".
3. check-claims.ts:
   export function checkLetterClaims(out: LetterModelOutput, flags: Flag[], lines: Line[]):
     { ok: boolean; problems: string[]; claims: LetterClaim[] }
   Rules (each failure pushes a plain problem string):
   a. every paragraph.flagId exists in flags; each flag appears at most once;
   b. every flag passed in appears in exactly one paragraph;
   c. opening, subject, and closingRequest contain no "$" and no digit sequence longer than 4 (account last 4
      is allowed);
   d. every money amount in a paragraph (regex /\$\s?[\d,]+(?:\.\d{2})?/g) parses to cents equal to that
      paragraph's flag.amountCents or to the chargeCents of one of the flag's lines;
   e. every token matching /\b[A-Z0-9]\d{3}[A-Z0-9]\b/ in a paragraph equals a code on one of the flag's lines;
   f. a paragraph for a flag with tier "estimate" must contain the word "estimate";
   g. a paragraph for a flag with tier "published" must contain "published";
   h. checkWording finds nothing anywhere.
   claims[] lists one entry per valid paragraph.
4. render.ts: export function renderLetter(input: { kind: LetterKind; bill: Bill; flags: Flag[];
   out: LetterModelOutput; patientName: string; today: string }): string
   Deterministic layout, plain text, lines joined with \n:
   "{today}" / "" / "To: Billing Office, {bill.hospital.name}" / "Account ending in {last4 or 'not shown'}" /
   "Subject: {out.subject}" / "" / out.opening / "" / each paragraph text separated by blank lines / "" /
   "Evidence" / one bullet per flag: "- {flag.title}: {TIER_LABEL[flag.tier]}. {flag.evidence.detail}"
   plus " Source: {sourceUrl}, captured {capturedAt date}" when present / "" / out.closingRequest / "" /
   "Thank you," / "{patientName}" / "" / "Prepared with BetterBill. BetterBill is informational, not legal or
   medical advice."
   TIER_LABEL: confirmed "Confirmed from your bill", rule "Billing rule", published "Hospital's published
   price", estimate "Estimate". Money as $1,234.56 using a local formatCents (or core's formatter if one
   exists: rg "formatCents|formatMoney" packages/core).
5. fallback.ts: export function fallbackModelOutput(kind: LetterKind, flags: Flag[], lines: Line[]):
   LetterModelOutput. Dispute: subject "Request to review charges on my bill"; opening "I am writing about
   my bill. I reviewed the itemized charges and some lines do not look right. Please review them."; one
   paragraph per flag built from a per-lever sentence:
   duplicate: "The line {description} ({code}) for {amount} appears more than once on {serviceDate}. Please
   remove the extra charge."
   units: "The line {description} ({code}) lists {units} units. That is more than the billing rule allows.
   Please check the units."
   eob_mismatch: "My insurer's explanation of benefits says I owe {eobAmount}. The bill asks for
   {amount}. Please correct the balance." (use flag.amountCents as the difference; only amounts that pass
   rule d)
   published_price: "The charge for {description} ({code}) is {charge}. That is higher than your own
   published price for this service. Please review it."
   assistance: "Based on your published financial assistance policy, I may qualify. This is an estimate.
   Please send me the application."
   missing_itemization: "My statement does not list each charge. Please send a complete itemized bill."
   closingRequest: "Please send a corrected itemized statement and hold collection on the amounts above
   while you review. Please reply in writing."
   Itemized request: subject "Request for an itemized bill"; opening "Please send me a complete itemized
   bill for my account."; paragraphs only for missing_itemization flags; closingRequest "Please include
   each service date, code, units, and charge. Please reply in writing."
6. Tests: fallback passes checks for each lever; model output with an extra $ amount fails; unknown flagId
   fails; missing flag fails; code not on the line fails; "overcharge" fails; em dash fails; estimate without
   "estimate" fails; renderLetter snapshot for the sample bill (85025 duplicate $84.00).
Do not: call Gemini here; use Date.now() inside pure functions (take `today` as input).
Verify: bun run --filter @betterbill/core test
Done: PR "feat(core): letter templates and claim checks", tag `contract`.
```

---

### A-04 Gemini drafter and `action.draftLetter`
- **Branch:** `a/letter-draft` | **Time:** 75 min | **Depends on:** A-03, B's router stub for `action.draftLetter`, B's Sentry helper
- **Goal:** server-side draft with Gemini, validated, retried once, then fallback; persists `Action` and `action.drafted` event.
- **Files:** `packages/api/src/services/gemini.ts`, `packages/api/src/services/letter-drafter.ts`, `packages/api/src/services/events.ts`, `packages/api/src/routers/action.ts` (handler body only), `packages/api/src/services/fakes.ts`, `packages/api/test/action-draft.int.test.ts`, `.env.example`, `apps/web/.env.schema`, `scripts/measure-letters.ts`
- **Acceptance:** sample case returns a letter with `claims.length === flags.length`; Gemini timeout or invalid output returns the fallback with `usedFallback: true`; letter draft span visible in Sentry.
- **Tests:** integration through oRPC with `BB_FAKE_PROVIDERS=1`; one manual live run logged.

```
Task A-04: Gemini letter drafter (branch a/letter-draft).
Docs: https://ai.google.dev/gemini-api/docs/structured-output (read it; as of 2026-10-17 the JS example uses
import { GoogleGenAI } from "@google/genai"; const client = new GoogleGenAI({ apiKey });
client.interactions.create({ model, input, response_format: { type: "text", mime_type: "application/json",
schema } }) and reads interaction.output_text). If the installed SDK exposes a different method, use the one
in the docs page for the installed version and note it in the PR.
1. bun add @google/genai --filter @betterbill/api
2. services/gemini.ts: export async function generateJson<T>(opts: { system: string; input: string;
   schema: object; timeoutMs: number }): Promise<unknown>. Uses env GEMINI_API_KEY and GEMINI_MODEL
   (default "gemini-3.8-flash"). Wrap in Promise.race with a timeout that rejects Error("GEMINI_TIMEOUT").
   Wrap in B's Sentry span helper (rg "startSpan" packages/api) with name "letter.draft.gemini".
   Use z.toJSONSchema(LetterModelOutputSchema) for the schema (zod 4).
3. services/fakes.ts: when process.env.BB_FAKE_PROVIDERS === "1", generateJson returns
   fallbackModelOutput(...) re-worded slightly; sendEmail and startCall return fake ids (used by A-06, A-08).
4. services/events.ts: export async function appendEvent(db, e: Omit<CaseEvent,"id"|"at">):
   Promise<CaseEvent>. Load current events for the case, compute nextStatus(deriveStatus(events), e.type)
   (throws TransitionError, map it to ORPCError "CONFLICT"), insert the event, update case.status, all in
   one transaction. Never update or delete events. B's handlers call this too.
5. services/letter-drafter.ts: export async function draftLetter(db, input: { caseId; kind; flagIds? }):
   Load bill and flags (all flags if flagIds missing; only flags with tier confirmed, rule, published, or
   estimate). System prompt (exact):
   "You write short, polite letters from a patient to a hospital billing office. Write at a grade 6 to 8
   level. Sentences under 20 words. Use only the facts in FLAGS and LINES. Write exactly one paragraph per
   flag and put that flag's id in flagId. Mention only dollar amounts and codes that appear in that flag or
   its lines. Never say illegal, fraud, overcharge, scam, or lawsuit. Never threaten. If a flag's tier is
   estimate, say it is an estimate. If the tier is published, say the hospital's own published price.
   Do not put dollar amounts in the subject, opening, or closingRequest. Return JSON only."
   Input: JSON.stringify({ kind, hospital: bill.hospital.name, flags: [...minimal fields], lines: [...only
   lines referenced by flags, without patient data] }).
   Flow: generateJson (timeout 9000 ms) to LetterModelOutputSchema.safeParse to checkLetterClaims. If not ok,
   retry once with "Fix these problems: <problems>" appended (timeout 5000 ms). If still not ok or any error,
   use fallbackModelOutput and set usedFallback true. Render with renderLetter (patientName from the case,
   synthetic). Compute draftHash = await sha256Hex(text). Insert Action { kind, draft: text, recipient:
   env EMAIL_TEST_INBOX, approvedAt: null, sentAt: null, outcome: null }. appendEvent type "action.drafted",
   actor "agent", summary "Draft ready for you", artifactRef approvalRef(action.id, draftHash).
   Log evlog fields: caseId, actionId, usedFallback, problemsCount, durationMs. Never log the letter body.
6. routers/action.ts draftLetter handler: validate input with zod, call draftLetter, return
   { action, draftHash, claims, usedFallback }.
7. Add env names to .env.example and apps/web/.env.schema: GEMINI_API_KEY, GEMINI_MODEL,
   EMAIL_TEST_INBOX, BB_FAKE_PROVIDERS.
8. Integration test packages/api/test/action-draft.int.test.ts (uses the CI Postgres and seeded sample case;
   call through oRPC's server-side client, check how B's other integration tests do it: rg
   "createRouterClient" packages/api): draft returns claims for every flag; status becomes action_pending;
   an event "action.drafted" exists; with fake generateJson returning a bad amount, usedFallback is true.
9. scripts/measure-letters.ts: for each synthetic bill in data/synthetic, create case, parse, confirm,
   audit, draft 3 times live; write p50, p95, claimCoverage, fallbackRate, bannedHits to
   data/eval/actions.json with "measuredAt" and "n". Add root script "measure:letters".
Do not: call Gemini from the browser; send the full bill or patient name to Gemini; skip checkLetterClaims.
Verify: bun run check-types && BB_FAKE_PROVIDERS=1 bun run test ; then one live call locally:
  curl the procedure or use the app, and record durationMs in the PR.
Done: PR "feat(api): Gemini letter drafting with claim checks".
```

---

### A-05 Approval flow (`action.approve` plus approval sheet)
- **Branch:** `a/approval-flow` | **Time:** 60 min | **Depends on:** A-04; D's case page route; D's `ApprovalSheet` (interim if missing)
- **Goal:** user sees the exact text, recipient, and data shared, then approves or cancels. Approval stores the draft hash.
- **Files:** `packages/api/src/routers/action.ts` (approve body), `packages/api/src/services/approval.ts`, `apps/web/src/features/actions/approval-sheet-interim.tsx`, `apps/web/src/features/actions/use-is-desktop.ts`, `apps/web/src/features/actions/letter-action-card.tsx`, `apps/web/src/routes/case/$id.tsx` (mount point only, coordinate with D), `packages/api/test/action-approve.int.test.ts`
- **Acceptance:** approve with a stale hash returns `CONFLICT` with copy "This draft changed. Please review it again."; cancel writes `action.cancelled`; sheet passes a11y checks (focus trap, labelled buttons, 44 px targets).
- **Tests:** integration for approve and cancel; Playwright in A-10.

```
Task A-05: approval flow (branch a/approval-flow).
Server:
1. services/approval.ts: export async function approveAction(db, { actionId, draftHash, consent }):
   load action and events; recompute sha256Hex(action.draft); if it differs from draftHash throw ORPCError
   "CONFLICT" with message "This draft changed. Please review it again."; if action.kind === "call" and
   consent !== true throw ORPCError "BAD_REQUEST" message "Please confirm the person agreed to the call.";
   appendEvent type "action.approved", actor "user", summary kind letter: "You approved the letter",
   itemized_request: "You approved the request", call: "You approved the call", artifactRef
   approvalRef(actionId, draftHash); set action.approvedAt. Also export cancelAction(db, { actionId }) that
   appends "action.cancelled" with summary "You cancelled it" (B adds the route name only if the team agrees;
   otherwise call it through action.approve with { cancel: true } and note it in the PR).
2. Wire action.approve handler.
Client (TanStack Start, React, TanStack Query via oRPC utils: rg "orpc\." apps/web/src to copy the pattern):
3. use-is-desktop.ts: export function useIsDesktop(): boolean using window.matchMedia("(min-width: 1024px)").
4. approval-sheet-interim.tsx: export function ApprovalSheetInterim(props) with exactly the props in
   section 3.2 of docs/plans/A-conversation-actions.md. Use Sheet, SheetContent, SheetHeader, SheetTitle,
   SheetDescription, SheetFooter from @betterbill/ui/components/sheet, Button, Checkbox, Label.
   SheetContent side={isDesktop ? "right" : "bottom"}
     className="bg-muted p-5 rounded-t-2xl lg:rounded-none lg:w-[480px] max-h-[90vh] overflow-y-auto pb-[calc(20px+env(safe-area-inset-bottom))]"
     data-testid="approval-sheet"
   Title (h2 class "text-[22px] leading-[28px] font-semibold"): letter "Review before we send",
     itemized_request "Review before we send", call "Review before we call".
   Description (class "text-sm leading-5 text-muted-foreground"): "Nothing is sent until you approve."
   Section label class "text-xs leading-4 font-medium text-muted-foreground uppercase tracking-wide mt-5 mb-2".
   Sections: "To" then recipient in "text-base leading-6"; letter: "Exactly what we will send", call:
   "Exactly what the assistant will say" then the text in
   <pre data-testid="approval-text" className="rounded-xl border bg-card p-4 text-sm leading-5 whitespace-pre-wrap font-sans max-h-[50vh] overflow-y-auto">;
   "What we share" then a <ul className="list-disc pl-5 text-sm leading-5"> of dataShared.
   If requireConsent: Checkbox id="consent" plus Label "The person at this number agreed to take a test call."
   Footer: <Button className="h-12 w-full rounded-xl lg:h-11" data-testid="approve-button"
     disabled={approving || (requireConsent && !consent)}> label letter/itemized "Approve and send", call
     "Approve and call" ; <Button variant="outline" className="h-12 w-full rounded-xl lg:h-11"
     data-testid="cancel-button"> "Cancel". On mobile stack vertically with gap-3; on lg: side by side.
   Focus ring default from tokens (ring-2 ring-ring ring-offset-2). Respect prefers-reduced-motion
   (motion-reduce:transition-none on SheetContent).
5. letter-action-card.tsx: export function LetterActionCard({ caseId }). Card classes:
   "rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(11,27,43,0.06),0_8px_24px_rgba(11,27,43,0.06)]".
   h3 "Your dispute letter" ("text-lg leading-6 font-semibold"); body "We wrote it from the flags above.
   Every point links to its evidence." ("text-sm leading-5 text-muted-foreground").
   Button "Send the letter" (h-12 w-full rounded-xl lg:h-11): calls action.draftLetter, shows Skeleton
   while loading with caption "Writing your letter. This takes a few seconds.", then opens the sheet with
   recipient = action.recipient, text = action.draft, dataShared = ["Your name", "Hospital name",
   "Account number, last 4 digits only", "The lines listed in the letter"].
   Approve: action.approve({ actionId, draftHash }) then action.send (A-06; until A-06 merges, show toast
   "Approved. Sending is coming next." via Sonner). Cancel: cancel route, toast "Cancelled. Nothing was sent."
   On CONFLICT show the server message in an Alert and re-fetch the draft.
   Prefer D's ApprovalSheet from packages/ui/src/components/bb/approval-sheet if it exists (check with rg);
   otherwise use ApprovalSheetInterim. Keep the prop names identical so swapping is one import line.
6. Mount <LetterActionCard caseId={id} /> in the case route where D marks the actions slot (ask D; if no
   slot, add it below the flag list and above the footer, mobile first; on lg: inside the right column).
7. Integration test: approve with correct hash then status remains action_pending and approval event exists;
   approve with wrong hash gives CONFLICT; call approval without consent gives BAD_REQUEST; cancel writes
   action.cancelled and findApproval returns null.
Do not: compute anything about savings in the UI; let the user edit recipient in the demo; hide the full text
behind a "show more" (the whole text must be visible by scrolling).
Verify: bun run check-types && bun run test ; screenshots at 390 px and 1280 px.
Done: PR "feat(web): approval sheet and action.approve".
```

---

### A-06 Send to test inbox (`action.send`)
- **Branch:** `a/send-letter` | **Time:** 60 min | **Depends on:** A-05
- **Email provider decision (21:00, write it in the PR):** use Photon email only if all are true: D's domain is connected in Photon with DNS records verified, and Photon confirms an outbound-first send (its docs on 2026-10-17 only show replying with `photon.projects.sendMessage` to a received email, threading by `spaceId`, `senderId`, `parentMessageId`). Otherwise use **Resend** (`resend.emails.send`). Default: Resend. If Photon email works later, switch with `EMAIL_PROVIDER=photon` in a follow-up PR.
- **Files:** `packages/api/src/services/email.ts`, `packages/api/src/services/send.ts`, `packages/api/src/routers/action.ts` (send body), `apps/web/src/features/actions/letter-action-card.tsx`, `apps/web/src/features/actions/case-timeline.tsx`, `packages/api/test/action-send.int.test.ts`
- **Acceptance:** letter arrives in the test inbox; `action.sent` event has the provider message id in `summary`; send without approval returns `FORBIDDEN`; recipient outside `EMAIL_ALLOWLIST` returns `FORBIDDEN`; failure writes `action.send_failed` and the UI offers "Try again".

```
Task A-06: send to test inbox (branch a/send-letter).
1. bun add resend --filter @betterbill/api
2. services/email.ts: export async function sendEmail({ to, subject, text }): Promise<{ provider: string;
   messageId: string }>. If BB_FAKE_PROVIDERS === "1" return { provider: "fake", messageId: "fake_<uuid>" }.
   If EMAIL_PROVIDER === "resend" (default): new Resend(process.env.RESEND_API_KEY).emails.send({ from:
   process.env.EMAIL_FROM, to, subject, text }); read { data, error } and throw on error.
   If EMAIL_PROVIDER === "photon": leave a clear `throw new Error("PHOTON_EMAIL_NOT_CONFIGURED")` stub with a
   TODO pointing to https://photon.codes/docs/beta/get-started/email . Do not guess Photon parameters.
   Check the Resend docs for the installed SDK version if the method signature differs.
3. services/send.ts: export async function sendAction(db, { actionId }):
   load action and events; if action.kind === "call" throw BAD_REQUEST "Use call.start for calls.";
   const hash = await sha256Hex(action.draft); assertApproved(events, actionId, hash) and map errors to
   ORPCError "FORBIDDEN" message "Please approve the letter first.";
   recipient must be in EMAIL_ALLOWLIST (comma-separated, case-insensitive) else FORBIDDEN
   "This demo only sends to the test inbox.";
   if an action.sent already exists for this action return it (idempotent);
   subject = first line starting with "Subject: " in the draft, without the prefix;
   prefix the subject with "[BetterBill demo] " and add a first line to the body:
   "This is a demo message from BetterBill sent to a test inbox. It uses a synthetic bill."
   On success: appendEvent "action.sent", actor "system", summary "Letter sent to the test inbox (<provider>
   <messageId>)", artifactRef approvalRef(actionId, hash); set action.sentAt.
   On failure: appendEvent "action.send_failed", actor "system", summary "Letter not sent: <short reason>";
   rethrow ORPCError "BAD_GATEWAY" "We could not send it. Nothing was sent. Try again."
   Wrap in a Sentry span "action.send".
4. Wire action.send. In letter-action-card.tsx: after approve succeeds call action.send; success toast
   "Sent to the test inbox."; failure shows ErrorState (or Alert) with "Try again" button that calls
   action.send again (approval still valid).
5. case-timeline.tsx: export function CaseTimeline({ caseId }) using event.list. Map events to
   { id, at, title: EVENT_TITLES[type], detail: summary, done: true }. Prefer D's ActivityTimeline from
   packages/ui/src/components/bb/activity-timeline; interim: <ol className="relative ml-3 border-l-2
   border-[var(--mint)]"> each <li className="mb-6 ml-6"> with a <span className="absolute -left-[13px]
   flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mint-soft)]"><Check
   className="h-4 w-4 text-[var(--mint)]" strokeWidth={1.75} aria-hidden /></span>, title
   "text-base leading-6 font-medium", time "text-xs leading-4 text-muted-foreground" formatted
   with Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric",
   minute: "2-digit" }). Heading "Your case activity" (h2 classes from tokens).
6. Add EMAIL_PROVIDER, RESEND_API_KEY, EMAIL_FROM, EMAIL_ALLOWLIST to .env.example and .env.schema.
7. Integration tests: send without approval FORBIDDEN; approve then send gives status "sent" and one
   action.sent; second send returns the same event; recipient not allowlisted FORBIDDEN; fake provider throw
   writes action.send_failed and status stays action_pending; approvalCoverage(events).ratio === 1.
Do not: send to any address the user types; include full account numbers; log the letter body.
Verify: bun run test ; one live send to the test inbox, screenshot in the PR (hide the address).
Done: PR "feat(api): send approved letter to test inbox".
```

---

### A-07 Fetch adapter full flow (only if the 17:00 gate passed)
- **Branch:** `a/fetch-flow` | **Time:** 120 min (coding agent, A reviews) | **Depends on:** A-02, A-04, A-05, A-06; B's OpenAPI handler and service token
- **Goal:** complete the primary workflow inside ASI:One with pasted bill text and review cards. Adapter holds only session state and formatting.
- **Files:** `agents/fetch-adapter/src/betterbill_agent/api_client.py`, `agents/fetch-adapter/src/betterbill_agent/flow.py`, `agents/fetch-adapter/src/betterbill_agent/agent.py`, `agents/fetch-adapter/src/betterbill_agent/cards.py`, `agents/fetch-adapter/tests/test_flow.py`, `agents/fetch-adapter/Dockerfile`
- **Acceptance:** in ASI:One: paste sample bill text, lines review card, "Looks right", flags message plus detail card, "Draft the letter", full letter text plus review card, "Approve and send", terminal card "Letter sent". API errors produce "Something went wrong on our side. Nothing was sent. Reply retry to try again."

```
Task A-07: Fetch adapter flow (branch a/fetch-flow). Python 3.11, uv. No business logic in Python.
1. api_client.py: class BetterBillApi with httpx.AsyncClient(base_url=BETTERBILL_API_BASE, timeout=30,
   headers={"x-bb-service-token": BB_SERVICE_TOKEN}). One method per procedure: case_create, bill_parse_text,
   bill_confirm_lines, audit_run, action_draft_letter, action_approve, action_send, event_list. Keep the
   HTTP paths in a dict ROUTES at the top (get the real paths from B's OpenAPI spec: curl
   $BETTERBILL_API_BASE/spec.json or ask B). Retry once on 502/503/timeout. Raise ApiError(code, message).
2. flow.py: async def handle_text(state: dict, text: str, api) -> list[ChatMessage]. State per sender saved in
   ctx.storage under key f"session:{sender}": {"step", "caseId", "actionId", "draftHash"}.
   Steps:
   - start: if text is "sample" use the sample bill text from GET of the seeded sample (ask B) or tell the
     user to paste; if text has fewer than 40 chars reply "Paste the text of your hospital bill, or type
     sample to try a sample bill." Else case_create then bill_parse_text.
     Send narration "I read {n} lines from your bill. Check them before I look for problems." plus review
     card {"title": "Check these lines", "summary_rows": first 8 lines as {"label": description[:40],
     "value": "$84.00 x 1"} plus a row {"label": "More", "value": "{n-8} more lines"} if needed,
     "approve_cta": {"label": "Looks right", "primary": true, "selection": {"action": "confirm_lines"}},
     "reject_cta": {"label": "Paste again", "selection": {"action": "restart"}}}.
   - confirm_lines: bill_confirm_lines, audit_run. Narration: one short paragraph per flag (max 5):
     "{title}. {explanation} {Tier label}. Amount: {money}." then "Confirmed: {money}. Potential:
     {low} to {high}. These are estimates. BetterBill is informational, not legal or medical advice."
     Detail card {"title": "What looks wrong", "summary_rows": [{"label": title, "value": f"{money},
     {tier label}"}...], "ctas": [{"label": "Draft the letter", "primary": true, "selection":
     {"action": "draft_letter"}}]}.
   - draft_letter: action_draft_letter(kind "letter"). Narration = "Here is the exact letter. Nothing is sent
     until you approve.\n\n" + action.draft. Review card {"title": "Approve this letter?", "summary_rows":
     [{"label": "To", "value": recipient}, {"label": "Points", "value": f"{len(claims)}, each with
     evidence"}, {"label": "We share", "value": "Name, hospital, account last 4, listed lines"}],
     "approve_cta": {"label": "Approve and send", "primary": true, "selection": {"action": "approve"}},
     "reject_cta": {"label": "Cancel", "selection": {"action": "cancel"}}}.
   - approve: action_approve(actionId, draftHash) then action_send. Terminal detail card with metadata
     is_terminal "true" (no CTAs): {"title": "Letter sent", "summary_rows": [{"label": "To", "value":
     recipient}, {"label": "Status", "value": "Sent to the test inbox"}]}. Approval must come only from a
     card selection or the exact text "approve"; never auto-approve.
   - cancel: cancel route; reply "Cancelled. Nothing was sent."
   Parse selections: json.loads(text).get("action"); on failure, search text for each known action token.
3. Every handler catches ApiError and sends the plain error copy above; log with ctx.logger (no bill text).
4. Dockerfile: python:3.11-slim, install uv, uv sync --frozen, CMD ["uv","run","python","-m",
   "betterbill_agent.agent"]. Run it on a teammate laptop or a small host; mailbox mode means no public port
   is needed (per Fetch docs). Keep AGENT_SEED stable so the address does not change.
5. tests/test_flow.py with respx mocks: full happy path produces cards in order; ApiError gives the error
   copy; approve without a prior draft replies "There is nothing to approve yet."; metadata values are str.
Do not: compute flags, savings, or letter text in Python; call Gemini or any LLM; store bill text beyond the
session; approve on any message other than the approve selection.
Verify: uv run ruff check . && uv run pytest ; then a full run in ASI:One, share the chat (Share chat under
Current chat) and save the URL for A-12.
Done: PR "feat(agents): ASI:One flow with review cards".
```

---

### A-08 Outbound call: setup and `call.start`
- **Branch:** `a/call-start` | **Time:** 90 min | **Depends on:** G2 passed; Photon SMS number or dedicated line; ElevenLabs agent
- **Goal:** approved call script, ElevenLabs places the call through the Photon SIP trunk to an allowlisted phone.
- **Manual setup (A, not the coding agent), from https://photon.codes/docs/beta/cookbooks/voice/elevenlabs :**
  1. Photon: Voice, Lines, "Set up default" (or open the SIP profile), SIP, Create profile, Outbound calls, SHA-256, Enable outbound. Save the password. Note server, port, username. Media encryption Auto. (Beta cookbook shows `sip.photon.codes:5061`; the stable Spectrum page shows `sip.spectrum.photon.codes` port 5061. Use what the dashboard shows. UNVERIFIED which applies.)
  2. ElevenLabs: create agent "BetterBill billing caller". First message (exact): `Hi, this is an automated assistant calling on behalf of a patient, {{patient_first_name}}. This call may be recorded and transcribed. Is it okay to continue?` System prompt: see the prompt below (paste the same text). Configure analysis data collection fields `reference_number`, `billing_response`, `next_step`, `follow_up_date` (UI names UNVERIFIED). Enable the end-call tool if offered (UNVERIFIED).
  3. ElevenLabs: Deploy, Phone Numbers, Import number, From SIP Trunk; label "Photon"; Photon number in E.164; outbound address `sip.photon.codes:5061` (no `sip:` prefix), transport TLS, media encryption Allowed, codecs G.722, PCMU, PCMA, Photon username and password. Assign the agent. Copy the phone number id into `ELEVENLABS_PHONE_NUMBER_ID` (where the id is shown is UNVERIFIED; it may be in the URL or via the phone numbers API).
  4. Smoke: "Outbound call", "Send Test Call" to the teammate phone. Confirm two-way audio.
- **Files:** `packages/core/src/call.ts`, `packages/core/test/call.test.ts`, `packages/api/src/services/elevenlabs.ts`, `packages/api/src/services/call.ts`, `packages/api/src/routers/call.ts`, `packages/api/src/routers/action.ts` (draft call script), `apps/web/src/features/actions/call-action-card.tsx`, `packages/api/test/call.int.test.ts`
- **Acceptance:** `call.start` without approval and consent returns `FORBIDDEN`; number outside `CALL_ALLOWLIST` returns `FORBIDDEN`; with approval the teammate phone rings and the first words are the disclosure.

```
Task A-08: outbound call start (branch a/call-start).
1. packages/core/src/call.ts (pure):
   export const DISCLOSURE = "Hi, this is an automated assistant calling on behalf of a patient.";
   export type CallVars = { patient_first_name: string; hospital_name: string; account_last4: string;
     disputed_items: string; ask: string };
   export function buildCallVars(bill: Bill, flags: Flag[], patientFirstName: string): CallVars
     disputed_items: up to 3 flags as "{title}, {amount}" joined by "; " (no codes, no dates of birth, no
     insurance ids); ask: "Please review these items and tell me the next step and a reference number.";
     account_last4 from bill.accountRefMasked last 4 digits or "not available".
   export function renderCallScript(vars: CallVars): string  // the exact text shown in the approval sheet:
     "{DISCLOSURE} This call may be recorded and transcribed. Is it okay to continue?\n\nIf yes: I am calling
     about account ending in {account_last4} at {hospital_name}. The patient found items that look wrong:
     {disputed_items}. {ask}\n\nIf no: Thank you. I will end the call now.\n\nThe assistant will not share
     anything else. It will not agree to payments."
   export const CallOutcomeSchema = z.object({ status: z.enum(["done","failed","no_consent"]),
     summary: z.string(), referenceNumber: z.string().nullable(), billingResponse: z.string().nullable(),
     nextStep: z.string().nullable(), followUpDate: z.string().nullable(), durationSecs: z.number().nullable(),
     transcript: z.array(z.object({ role: z.enum(["agent","user"]), message: z.string(), t: z.number() })),
     recorded: z.boolean(), source: z.enum(["live","recorded_fallback"]) });
   export function checkDisclosure(transcript): boolean  // first agent turn starts with DISCLOSURE
   export function isAllowedNumber(e164: string, allowlist: string): boolean
   Unit tests: vars never include more than 3 items; script starts with DISCLOSURE; disallowed number false.
2. Call drafts: extend services/letter-drafter.ts or add services/call-draft.ts with draftCall(db, {caseId,
   to}) that creates Action { kind: "call", draft: renderCallScript(vars), recipient: to } and appends
   action.drafted. Expose it through action.draftLetter with kind "call" only if B agrees; otherwise ask B to
   accept kind "call" in that input (contract PR). Do not store vars separately: recompute them at call
   time from the same bill and flags and assert renderCallScript(vars) === action.draft, else
   FORBIDDEN "This call script changed. Please review it again."
3. services/elevenlabs.ts:
   export async function startOutboundCall({ to, vars }): Promise<{ conversationId: string | null;
     sipCallId: string | null }>. POST https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call with
   header "xi-api-key": ELEVENLABS_API_KEY (confirm header name in the ElevenLabs API reference) and JSON
   { agent_id: ELEVENLABS_AGENT_ID, agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID, to_number: to,
     conversation_initiation_client_data: { dynamic_variables: vars } }.
   Response fields per docs: success, message, conversation_id, sip_call_id. Throw if success is false.
   export async function getConversation(id) : GET https://api.elevenlabs.io/v1/convai/conversations/{id}
   returning the raw JSON (status initiated | in-progress | processing | done | failed; transcript[] with role,
   message, time_in_call_secs; analysis.transcript_summary, analysis.data_collection_results; metadata.
   call_duration_secs). Fakes when BB_FAKE_PROVIDERS === "1".
4. services/call.ts: export async function startCall(db, { actionId }): load action (kind call), events;
   assertApproved (FORBIDDEN "Please approve the call first."); approval event must include consent (store
   "consent=yes" in that event summary in A-05; check it); isAllowedNumber(action.recipient, CALL_ALLOWLIST)
   else FORBIDDEN "This demo only calls numbers on the test list."; if a call.started exists for this action,
   return it; startOutboundCall; appendEvent "call.started" actor "system" with
   artifactRef approvalRef(actionId, hash) (same format as action.sent, so approvalCoverage works unchanged)
   and summary `Call started (elevenlabs:${conversationId})`. callStatus (A-09) reads the conversation id
   from that summary with the regex /elevenlabs:([\w-]+)/.
   Rate limit: refuse if more than 3 call.started events in the last 10 minutes across all cases.
5. routers/call.ts: call.start handler calls startCall.
6. call-action-card.tsx: Card (same classes as A-05). h3 "Call the billing office for me"; body "The
   assistant says it is automated, shares only what you see, and never agrees to pay." Recipient: a Select
   of numbers from a server function that returns CALL_ALLOWLIST masked as "(•••) •••-1234" labels
   "Billing office (test phone)". Button "Call for me" (h-12 w-full rounded-xl lg:h-11) drafts the call and
   opens the approval sheet with kind "call", requireConsent true, dataShared ["Patient first name",
   "Hospital name", "Account number, last 4 digits only", "Up to 3 items and amounts"]. Approve: action.approve
   with consent then call.start; toast "Calling now." Disable the button while a call is active.
7. Integration tests (fake provider): start without approval FORBIDDEN; without consent FORBIDDEN; number not
   allowed FORBIDDEN; happy path creates call.started; second start idempotent; approvalCoverage 1.
Do not: call any number not in CALL_ALLOWLIST; place calls from tests; pass DOB, insurance ids, full account
numbers, or diagnosis words in vars; let the agent agree to payment.
ElevenLabs system prompt to paste in the dashboard (exact):
"You are an automated assistant calling a hospital billing office on behalf of a patient. You already said
you are automated and asked to continue. If the person says no, thank them and end the call. If yes: say you
are calling about account ending in {{account_last4}} at {{hospital_name}}. Say the patient found items that
look wrong: {{disputed_items}}. Then: {{ask}}. Share nothing else. Do not give dates of birth, insurance
numbers, or medical details. Do not agree to pay, do not set up payment plans, and do not accept settlements.
If asked for something you do not have, say the patient will follow up in writing. Never say illegal, fraud,
or overcharge. Before ending, repeat back any reference number and next step you heard. Keep each turn under
two sentences. End the call politely within three minutes."
Verify: bun run test ; one live call to the teammate phone; note the time and consent in chat.
Done: PR "feat(api): approved outbound call through Photon and ElevenLabs".
```

---

### A-09 Call status, transcript, and outcome card
- **Branch:** `a/call-outcome` | **Time:** 75 min | **Depends on:** A-08
- **Goal:** poll the call, store the transcript and structured outcome once, show the outcome card and the transcript.
- **Files:** `packages/api/src/services/call.ts` (status), `packages/api/src/services/call-outcome.ts`, `packages/api/src/routers/call.ts`, `apps/web/src/features/actions/call-outcome-card.tsx`, `packages/api/test/call-status.int.test.ts`, `packages/core/test/call.test.ts`

```
Task A-09: call outcome (branch a/call-outcome).
1. services/call.ts: export async function callStatus(db, { actionId }): if action.outcome is set, return
   { status: "done" or parsed status, outcome: CallOutcomeSchema.parse(JSON.parse(action.outcome)) }.
   Else read conversationId from the call.started summary (regex /elevenlabs:([\w-]+)/), getConversation(id). Map ElevenLabs status:
   initiated to "ringing", in-progress and processing to "in_progress", done to "done", failed to "failed".
   On done: build the outcome with services/call-outcome.ts; save JSON string to action.outcome; appendEvent
   "call.completed" actor "system" summary "Call finished. Reference: <ref or 'not given'>". On failed:
   appendEvent "call.failed" summary "Call did not connect." (once).
2. services/call-outcome.ts: export async function buildOutcome(conv): CallOutcome. transcript from
   conv.transcript (skip null messages; t = time_in_call_secs). From analysis.data_collection_results read
   reference_number, billing_response, next_step, follow_up_date values (log the raw shape once; adjust to
   the real field structure). If analysis is missing or all values are empty, call Gemini (generateJson,
   timeout 8000) with system "Extract facts from this call transcript. Use null when a fact was not said.
   Do not guess." and a zod schema for the four fields. summary = analysis.transcript_summary or "Call
   finished." status "no_consent" if the first user turn after the disclosure contains "no" and the call
   lasted under 20 s. recorded true, source "live". Check checkDisclosure(transcript) and log the result.
3. call-outcome-card.tsx: export function CallOutcomeCard({ actionId }) polling call.status with TanStack
   Query refetchInterval 3000 until done or failed (stop after 6 minutes, then show "Still waiting for the
   call result. Refresh in a minute.").
   Card classes as A-05. States:
   ringing: LoadingState or Skeleton plus "Calling the billing office..." (aria-live="polite").
   in_progress: "On the call now." with a pulsing mint dot (motion-reduce:animate-none).
   done: h3 "Call summary"; if source is recorded_fallback show a pill above the title
     <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-[var(--amber-soft)] text-[#92400E]">
     Recorded rehearsal call</span>; rows in a <dl className="mt-4 grid grid-cols-1 gap-3 text-sm leading-5">
     with dt "text-muted-foreground" and dd "font-medium tabular-nums": "Reference number", "What they said",
     "Next step", "Follow up by"; null shows "Not given on the call". Then summary paragraph. Then Accordion
     item "Read the full transcript" with each turn: speaker label "Assistant" or "Billing office" in
     "text-xs leading-4 font-medium text-muted-foreground", message "text-sm leading-5", time "0:42".
   failed: ErrorState or Alert "The call did not connect. Nothing was agreed." with Button "Try again"
     (requires a new approval: it drafts a new call action and opens the sheet).
   no_consent: "The person asked us not to continue. The assistant ended the call."
   Footer caption "BetterBill is informational, not legal or medical advice."
4. Mount under CallActionCard when a call action exists; timeline shows call events via CaseTimeline.
5. Tests: unit for status mapping and outcome building from a fixture conversation JSON saved at
   packages/api/test/fixtures/elevenlabs-conversation.json (write a synthetic fixture matching the documented
   fields); integration: status done saves outcome once and appends call.completed once on repeated polls.
Do not: store audio files; show the transcript before the call ends if it is partial (show it only on done);
invent outcome values.
Verify: bun run test ; one live call, screenshot of the outcome card at 390 px and 1280 px.
Done: PR "feat(web): call transcript and outcome card".
```

---

### A-10 Approval smoke tests (integration plus Playwright)
- **Branch:** `a/e2e-approval` | **Time:** 45 min | **Depends on:** A-06; B/D Playwright config in `e2e/`
- **Files:** `e2e/approval.spec.ts`, `packages/api/test/flow.int.test.ts`
- **Acceptance:** runs in CI on both projects (iPhone 14 and Desktop 1280x800) with `BB_FAKE_PROVIDERS=1`.

```
Task A-10: approval smoke (branch a/e2e-approval).
1. packages/api/test/flow.int.test.ts: seeded sample case: bill.parseText to bill.confirmLines to audit.run
   to action.draftLetter to action.approve to action.send through the oRPC server client; assert statuses
   new, lines_confirmed, audited, action_pending, sent; assert approvalCoverage ratio 1; assert the letter
   passes checkLetterClaims and checkWording.
2. e2e/approval.spec.ts (Playwright; reuse the projects in e2e/playwright.config.ts, check names with rg
   "projects" e2e): test "letter needs approval":
   go to "/" , click "Try a sample bill" (role button), click "Looks right", wait for flags, click
   "Send the letter", expect getByTestId("approval-sheet") visible, expect getByTestId("approval-text") to
   contain "Prepared with BetterBill", expect it to contain the first flag title, click "Cancel", expect toast
   "Cancelled. Nothing was sent.", expect timeline to not contain "Letter sent".
   Then "Send the letter" again, click "Approve and send", expect toast "Sent to the test inbox.", expect
   timeline to contain "You approved it" before "Letter sent".
   On mobile assert the sheet's bounding box bottom equals the viewport bottom (bottom sheet); on desktop
   assert it is on the right (x greater than half the viewport width).
   Assert approve and cancel buttons have height at least 44.
3. Add the spec to CI's e2e job if it is not picked up by glob.
Do not: hit real Gemini, Resend, or ElevenLabs (BB_FAKE_PROVIDERS=1 in the CI env).
Verify: bunx playwright test e2e/approval.spec.ts --project=<mobile name> and --project=<desktop name>
Done: PR "test(e2e): approval flow smoke on mobile and desktop".
```

---

### A-11 Labelled recorded fallback
- **Branch:** `a/call-fallback` | **Time:** 30 min | **Depends on:** A-09 and one successful rehearsal call
- **Goal:** if the live call fails at judging, show the real rehearsal call, clearly labelled.
- **Files:** `data/demo/recorded-call.json`, `packages/api/src/services/call.ts`, `apps/web/src/features/actions/call-outcome-card.tsx`

```
Task A-11: recorded fallback (branch a/call-fallback).
1. Save the outcome JSON of the best rehearsal call (from action.outcome in the local or preview DB) to
   data/demo/recorded-call.json with source "recorded_fallback" and add "recordedAt" (ISO) and
   "recordedWith": "teammate test phone". It must be a real call we placed, never written by hand.
2. In callStatus: if the env DEMO_CALL_FALLBACK === "1" and the live call fails or times out after 90 s,
   return that outcome with source "recorded_fallback" and append event "call.completed" with summary
   "Showing a recorded rehearsal call (live call failed)". Never return the fallback when the live call
   succeeded.
3. The card already shows the amber "Recorded rehearsal call" pill (A-09); add caption under it:
   "Recorded on {recordedAt formatted}. The live call did not connect."
Do not: present the recording as live anywhere in UI or copy.
Verify: bun run test ; force failure with a non-answering allowlisted number.
Done: PR "feat(api): labelled recorded call fallback".
```

---

### A-12 Fetch README and Submission Agent (only if Fetch is in)
- **Branch:** `a/fetch-readme` | **Time:** 30 min plus 20 min submission | **Depends on:** A-07; C's Devpost and video URLs by 10:30
- **Files:** `README.md` (Fetch section), `agents/fetch-adapter/README.md`
- **Acceptance:** README has the agent name, `agent1q...` address, Agentverse profile URL, ASI:One shared chat URL, run instructions, and both badges: `![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)` and `![tag:hackathon](https://img.shields.io/badge/hackathon-5F43F1)`. Submission Agent shows "Submitted" by 11:30.

```
Task A-12: Fetch README (branch a/fetch-readme). Docs only, no code.
1. In README.md add section "Fetch.ai agent" with: the two badges (exact markdown above), agent name
   "betterbill", its address, Agentverse profile URL, ASI:One shared chat URL, one paragraph: "The agent is
   a thin adapter. It calls BetterBill's TypeScript API over HTTP. All rules, savings, and letters live in
   packages/core." Run steps: cd agents/fetch-adapter; uv sync; cp .env.example .env; set AGENT_SEED,
   BETTERBILL_API_BASE, BB_SERVICE_TOKEN; uv run python -m betterbill_agent.agent; connect mailbox in the
   inspector. Test: in ASI:One, type "sample".
2. Mirror the run steps in agents/fetch-adapter/README.md.
Do not: include the seed, tokens, or any real personal data.
Done: PR "docs: Fetch agent README for submission".
```
**Submission steps (A, by hand, from the Fetch submission doc, read 2026-10-17):**
1. Collect the ASI:One shared chat URL (asi1.ai, search, "Share chat" under Current chat) and the Agentverse agent profile URL.
2. Team lead messages the LA Hacks ASI:One Submission Agent, chooses create a team as lead, fills: project name, name, email, team size, the problem solved, public GitHub URL, Devpost URL, demo video URL; optional table number and bonus fields (number of agents, agent profile URLs, number of shared chats, shared chat URLs). Review and confirm. Share the Team ID.
3. Each teammate messages the Submission Agent, joins with the Team ID, name, and email. Status turns from "Incomplete" to "Submitted" when all have joined.
4. Confirm "Submitted" in chat by 11:30. The lead can edit until the deadline (12:00 per the hackpack).
Decide at 16:00 who is team lead for the Submission Agent (A by default).

---

## 7. Docker and CI responsibilities for A

- **Local:** use the shared `docker-compose.yml` Postgres only. A never runs `db:push` against Tiger Data. A's tables (action, event) are B's Drizzle schema; if A needs a column, A asks B for a migration PR.
- **Fakes in CI:** set `BB_FAKE_PROVIDERS=1` in the CI env for unit, integration, and e2e jobs. No live Gemini, email, or call in CI, ever.
- **CI steps A adds (in B's `.github/workflows/ci.yml`, via a small PR or by asking B):**
  - Integration tests from A-04 to A-10 run in the existing Postgres service job.
  - `e2e/approval.spec.ts` runs in the Playwright job on both projects.
  - Python adapter job, only when Fetch is in, triggered on changes under `agents/fetch-adapter/**`:
    ```yaml
    adapter:
      runs-on: ubuntu-latest
      defaults: { run: { working-directory: agents/fetch-adapter } }
      steps:
        - uses: actions/checkout@v4
        - uses: astral-sh/setup-uv@v6   # check the latest major on the action's README
        - run: uv python install 3.11
        - run: uv sync --frozen
        - run: uv run ruff check .
        - run: uv run pytest -q
    ```
- **Adapter container:** `agents/fetch-adapter/Dockerfile` (A-07). Run with `docker build -t bb-agent agents/fetch-adapter && docker run --env-file agents/fetch-adapter/.env bb-agent`. Keep one running instance during judging; the seed fixes the address.
- **Secrets:** A's keys go to Vercel (Preview and Production) and nowhere else. CI needs none of A's keys.

---

## 8. Testing details

**Unit (Vitest, `packages/core`)**
- `case-machine.test.ts`: every legal transition; every illegal transition throws; out-of-order input; approval invalidated by cancel and by re-draft; `approvalCoverage` cases.
- `letters.test.ts`: fallback letters per lever pass; adversarial model outputs fail for: unknown flag id, duplicated flag, missing flag, extra dollar amount, amount in opening, code not on the line, banned word, em dash, estimate without "estimate", published without "published"; render snapshot.
- `call.test.ts`: script starts with the disclosure; vars capped at 3 items and contain no codes; allowlist parsing; disclosure check on fixtures; status mapping; outcome from a fixture.

**Integration (oRPC server client, CI Postgres, fakes on)**
- Draft: claims cover all flags; fallback when the fake model returns bad JSON or times out.
- Approve: hash mismatch CONFLICT; call without consent BAD_REQUEST; cancel invalidates.
- Send: FORBIDDEN without approval; allowlist; idempotent; failure event; final status `sent`.
- Call: FORBIDDEN cases; idempotent start; status polling writes `call.completed` once.
- Full flow test (A-10) asserts the status sequence and approval coverage of 1.

**E2E (Playwright, `e2e/approval.spec.ts`)**
- Mobile (iPhone 14 project) and desktop (1280x800): exact text visible before approval, cancel sends nothing, approve then "Letter sent" in the timeline, bottom sheet vs right sheet, 44 px targets.

**Live checks (manual, logged in team chat with time)**
- One live Gemini draft per synthetic bill (measure script).
- One live email to the test inbox.
- Each call attempt: time, number label, consent given, result.

---

## 9. Strengthening options (pick one after G2; A1 recommended)

Recommendation: **A1**. It reuses A-08 and A-09, adds the most memorable 30 seconds for Photon and ElevenLabs, and has no undocumented API. A2 depends on receiving images over Photon iMessage, which the docs read on 2026-10-17 do not cover, and shared lines cannot send an unsolicited first message (fine for "user texts first", but reminders need a reply window that is UNVERIFIED).

### A1 Judge takes the call
- **Branch:** `a/judge-call` | **Time:** 2 h | **Depends on:** A-09
- **Goal:** a judge holds the "billing office" phone with a 3-line script; the agent calls live; the outcome card fills in on screen.
- **Files:** `docs/DEMO-CALL.md` (script card text, for C to print), `apps/web/src/features/actions/live-call-panel.tsx`, `apps/web/src/routes/case/$id.tsx` (mount), `packages/api/src/services/call.ts` (live transcript in progress, optional)

```
Task A1: judge-takes-the-call (branch a/judge-call).
1. docs/DEMO-CALL.md: the printed card for the judge (exact text):
   "You are the billing office. Answer the call.
    1. When asked if it is okay to continue, say: Yes, go ahead.
    2. When the items are read, say: I can review those. Your reference number is B-4417.
    3. Then say: We will send a corrected statement in 10 business days."
   Add the consent line C reads aloud first: "This is a test call to this phone. It will be transcribed.
   Do you agree to take it?" Only call after a clear yes. Note: the judge's own number is never stored; the
   phone is a team-held test phone in CALL_ALLOWLIST.
2. live-call-panel.tsx: export function LiveCallPanel({ actionId }) shown on lg: in the right column and on
   mobile above the outcome card while a call is active. Big status line (h2 tokens): "Calling the billing
   office", "On the call", "Call finished". A timer with tabular-nums. Under it a short list of what the
   assistant will share (from the approved script). When done, scroll the CallOutcomeCard into view and
   highlight the reference number row with bg-[var(--mint-soft)] text-[#065F46] for 2 s
   (motion-reduce: no animation).
3. Optional, only if ElevenLabs returns partial transcript during in-progress (check one live call's GET
   response): show the last two turns live. If not available, do not fake it.
4. Rehearse 3 times with a teammate as the judge; log results.
Do not: call a judge's personal phone; skip the consent line; show a fabricated reference number (B-4417 only
appears because the judge says it).
Verify: live rehearsal; screenshots at 390 and 1280 px.
Done: PR "feat(web): live call panel for judge-takes-the-call".
```

### A2 Text a bill (Photon iMessage), audit back by text, reminders
- **Branch:** `a/text-a-bill` | **Time:** 2 h (risky) | **Depends on:** G2; Photon shared iMessage line assigned
- **Goal:** user texts bill text (or a photo, if attachments are supported) to the Photon line, receives a short audit summary and a link, then a reminder on request.
- **Files:** `packages/api/src/services/photon.ts`, `packages/api/src/services/text-intake.ts`, `scripts/photon-poll.ts`, `packages/core/src/sms-copy.ts`, `packages/core/test/sms-copy.test.ts`

```
Task A2: text-a-bill (branch a/text-a-bill). Read first: https://photon.codes/docs/beta/get-started/imessage
and https://photon.codes/docs/beta/api-client/making-requests . Use plain fetch to https://api.photon.codes
with Authorization: Bearer PHOTON_API_KEY (the TS client needs Node 24).
1. Find the HTTP routes for listMessages and sendMessage in the API reference (the docs show the SDK names
   photon.projects.listMessages and photon.projects.sendMessage, with path { id: PHOTON_PROJECT_ID },
   header idempotency-key, and body { spaceId, senderId, parentMessageId, content: { type: "text",
   format: "plain", text } }). Write services/photon.ts with listReceived(sinceIso) and reply(msg, text).
   If the route paths are not in the docs, stop and ask; do not guess.
2. scripts/photon-poll.ts (long-running, runs on a laptop for the demo, not on Vercel): every 2 s list
   received messages since start; for each new message from the configured demo handle: if the text has at
   least 40 chars, call the same core path as bill.parseText, bill.confirmLines (auto-confirm is NOT
   allowed: reply with the line count and ask "Reply YES if these lines look right, or open the link to
   fix them."), then on YES run audit.run and reply with sms-copy.
   If the message has an attachment and the API exposes its URL (check the message JSON), pass it to
   bill.parsePhoto; otherwise reply "Please paste the bill text for now."
3. packages/core/src/sms-copy.ts: export function auditSms(savings, flags, link): string, max 600 chars:
   "BetterBill checked your bill. {n} items look wrong. Confirmed: {money}. Potential: {low} to {high}
   (estimate). See the evidence and approve a letter here: {link}. Not legal or medical advice."
   Reminder: "Reminder: your BetterBill letter is ready to review: {link}". Unit test length and wording.
4. Sending the letter or calling still requires the web approval sheet. A text never triggers an outbound
   action to the hospital. Reminders only when the user texts "remind me" (append event "reminder.requested";
   tag the PR contract because it is a new event type and add it to EventType with from "any" to "same").
Do not: send unsolicited first messages; text anyone other than the demo handle; put secrets in the script.
Verify: text the line from a teammate's iPhone; screenshot the thread.
Done: PR "feat(api): text-a-bill over Photon iMessage".
```

---

## 10. Fallbacks, cut order, and risks

**Cut order for A (first to go at the top)**
1. A2 or A1 option (whichever was picked).
2. Live call at judging: switch to the labelled recorded call (A-11). Say "This is a recorded rehearsal call" out loud.
3. Fetch adapter (drop at 17:00 if the gate fails; drop at 02:00 if A-07 is not merged; never half-ship it in the README).
4. Call outcome extraction by Gemini (keep ElevenLabs summary and transcript only).
5. Itemized-bill request template (keep the dispute letter).
6. Photon email (Resend stays).
**Never cut:** one approved letter sent to the test inbox, the approval sheet with exact text, the approval guard, the event timeline.

**Risks**
| Risk | Likelihood | Mitigation |
|---|---|---|
| Photon voice needs an SMS number or dedicated line, not a shared line; plan may need payment (Free plan has no included voice minutes; dedicated lines are Business only) | High | Ask at 15:00; budget a small paid SMS number; if not possible by 00:00, use ElevenLabs' own telephony option if available (UNVERIFIED) and say Photon was not used for the call; keep Photon in A2 |
| SIP host differs between beta and stable docs | Medium | Use the value the dashboard shows; test with "Send Test Call" before wiring code |
| Call consent and recording rules (California generally requires all-party consent to record confidential calls; legal detail UNVERIFIED, not legal advice) | Medium | Verbal consent before dialing, consent checkbox in the approval sheet, disclosure plus recording notice in the first sentence, team-held phones only |
| Model latency or bad output from Gemini | Medium | 9 s timeout, one retry, deterministic fallback letter that passes the same checks |
| Vercel function time limit on long work (plan limits UNVERIFIED) | Medium | Calls are async (start returns fast, client polls); letter draft capped near 15 s |
| ASI:One renders cards differently or routes selections as prose | Medium | Parse JSON first, then tokens; narration text carries all the content so plain text still works |
| Adapter address changes | Low | Fixed `AGENT_SEED` stored in a team password manager |
| Email lands in spam | Medium | Test inbox is the Resend account owner; check spam folder in rehearsal |
| Partial events on failure | Low | `appendEvent` runs in a transaction; send and call are idempotent |

---

## 11. Safety rules (A enforces these in code and in the demo)

1. **Approval before every outbound action.** `action.send` and `call.start` call `assertApproved` with the hash of the exact text. Any edit or re-draft needs a new approval. Approval coverage must read 100%.
2. **Allowlists.** Email only to `EMAIL_ALLOWLIST`; calls only to `CALL_ALLOWLIST`. No user-entered recipients in the demo.
3. **Disclosure script.** Every call opens with: "Hi, this is an automated assistant calling on behalf of a patient." followed by the recording notice and a consent question. If the answer is no, the agent ends the call.
4. **Minimum data.** Calls share only: patient first name (synthetic), hospital name, account last 4, up to 3 items with amounts. Letters share name, hospital, account last 4, and the flagged lines. No DOB, insurance ids, diagnoses, or full account numbers. Gemini gets flags and referenced lines only.
5. **No commitments.** The call agent never agrees to pay, set up a plan, or accept a settlement.
6. **Synthetic data only.** No real patient documents. Demo emails carry a "[BetterBill demo]" subject prefix and a synthetic-bill note.
7. **No real hospital calls or emails.** Only team-held test phones and the test inbox. A judge may hold the team's test phone, after saying yes.
8. **Wording.** Never "illegal", "fraud", or "overcharge" as a conclusion; every claim has its tier; letters end with the informational disclaimer.
9. **Labelled fallbacks.** A recording is always labelled as a recording, in UI and out loud.
10. **Logs.** Never log letter bodies, transcripts, or phone numbers in full; log ids, durations, and masked numbers.
11. **Rate limit.** At most 3 call starts per 10 minutes.

---

## 12. UNVERIFIED items

1. Photon hackathon guidelines (Notion page did not load): what Photon judges and whether Spectrum or Photon 2.0 use is required.
2. Fetch resources doc (Google Doc did not load). The submission doc did load through its text export.
3. Whether Photon email can send an outbound-first message (docs show reply only) and how long DNS verification takes.
4. Photon SIP host: `sip.photon.codes:5061` (beta cookbook) vs `sip.spectrum.photon.codes` port 5061 (stable Spectrum page).
5. How to buy a Photon SMS number on the Free plan, and whether a hackathon credit exists.
6. ElevenLabs auth header name (`xi-api-key` assumed; the outbound-call page did not show it), where the `agent_phone_number_id` is shown, analysis data collection setup, end-call tool, and whether the free tier allows SIP trunk import.
7. Whether ElevenLabs returns partial transcripts while a call is in progress.
8. ASI:One image input (plan uses pasted text).
9. Exact oRPC OpenAPI paths and the service-token middleware (B to provide).
10. Gemini SDK method in the installed `@google/genai` version (docs show `client.interactions.create` with `response_format`) and `gemini-3.8-flash` availability on the team's key.
11. Resend delivery rules without a verified domain.
12. Fetch Payment Protocol package and API (hackpack names it, gives no link). Not planned.
13. MLH Gemini and MLH ElevenLabs judging criteria.
14. California call recording consent details (legal, not verified here; not legal advice).
15. Vercel function time limits on the team's plan.
16. Fetch prize amounts (team figure only).
17. `astral-sh/setup-uv` current major version for CI.
