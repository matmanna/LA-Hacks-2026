# Shop Check: Design Doc and Grades

An all-in-one shopping assistant that combines the Escape Hatch loop, cancellation grading, terms-of-service red flags, and value alternatives in one ASI:One chat flow.

Companion docs: `escape-hatch-spec.md` (Exit Grade rubric, service list, dark-pattern taxonomy), `shop-check-prd.md` (requirements), `values-lens-design-doc.md`.

Status notes
- Event: the Paper challenge page lists LA Hacks as October 17 to 18, 2026. Plan for roughly 22 hours and a team of 4 (lead on agents and Python, research, backend, UI/UX). For 2 people, see section 12.
- Sponsor facts come from the track page and sponsor docs read earlier. Prize amounts are quoted only where a doc stated them. Fetch.ai's pool is unverified. Photon's, Browser Use's, StepFun's, and Applied Intelligence's prizes are unknown.
- Legal items are informational, not legal advice. The Exit Grade rubric cites California Business and Professions Code section 17602 from a FindLaw reproduction. Confirm on the official site.
- Anything marked UNVERIFIED was not confirmed in this session.
- No em dashes.

---

## 1. Summary

**Pitch:** "Before you buy or start a trial, paste the link. Shop Check tells you how hard it is to quit, what the fine print really says, and what the cheaper and easier-to-leave alternatives are. Then, if you go ahead, it limits what the merchant can charge and cancels for you on the last day."

**One pipeline, four features.** A single capture-and-analyze pipeline (fetch public pages, screenshot them, read them, score them) feeds one verdict card:
1. **Exit Grade:** how hard it is to cancel (the Cancel Speedrun engine).
2. **Terms red flags:** clauses that matter, each quoted with its source.
3. **Value alternatives:** same-category options ranked by total commitment cost and exit ease, not taste.
4. **Escape Hatch:** after approval, a spending-limited credential (simulated unless a Visa sandbox is confirmed) and a scheduled cancellation with an evidence receipt.

**Why all-in-one is risky:** the blind panel punished Values Lens for scope. Shop Check avoids that only by sharing the pipeline and cutting everything else (no extension, no dashboard, no maps, no extra lenses).

---

## 2. Principles

1. **Evidence or silence.** Every flag and every number shows its source, a quote or measurement, and a capture date. Missing evidence is "not found," never a pass.
2. **No quote, no label.** A red flag needs the exact clause text. A dark-pattern label needs quoted on-screen text or a measured value.
3. **The user approves every action that costs money or sends anything.**
4. **Real public pages are graded live.** In-flow screens that need an account are demonstrated on a labelled demo merchant. The product says which is which.
5. **Informational, not advice.** Wording is "does not meet the checked requirement" or "this clause says," never "illegal."
6. **Chat-first.** The whole primary workflow starts and ends in an ASI:One conversation (Fetch rule).
7. **Right of reply.** Merchants can submit a correction that is shown beside the result.

---

## 3. User journey (inside ASI:One)

1. User: "Check Spotify Premium before I start the trial." (a link or a service name; no file upload needed).
2. Shop Check shows progress, then a **verdict card**:
   - Exit Grade (A to F) with coverage and flagged dark patterns
   - top terms red flags, each with a quote
   - total commitment cost over a chosen horizon
   - the top 3 alternatives and why they rank higher or lower
3. User taps **compare alternatives** or **start protected trial**.
4. **Review card:** merchant, trial end date, spend cap, last-day cancel action, what data is stored.
5. On approval, Shop Check issues the credential (**SIMULATED** label shown on screen unless a real Visa sandbox is confirmed).
6. **Last day** (time-skipped in the demo): the agent runs the cancel flow on the demo merchant and returns an **evidence receipt** (steps, timings, screenshots, trace link).
7. If the merchant attempts a charge outside the terms, the credential declines it and logs the attempt as dated evidence (decline-and-document).

---

## 4. Architecture

| Component | Role | Tooling |
|---|---|---|
| Orchestrator agent | ASI:One conversation, planning, cards, approvals | Fetch.ai uAgents or plain Python, Agent Chat Protocol, Agentverse |
| Capture agent | Opens public pages (service home, help/cancel page, pricing, terms), takes screenshots, records clicks and timing | Browser Use |
| Visual labeler | Reads screenshots, labels dark patterns with quoted text | StepFun `step-5-preview` |
| Terms agent | Extracts clauses by category from terms text, with quotes | Gemini (MLH) |
| Scorer | Deterministic Exit Grade and total commitment cost, no model in the loop | Python |
| Alternatives agent | Pulls comparison data for same-category services, ranks with visible weights | Python, curated category lists |
| Credential agent | Issues a spending-limited credential, logs authorization attempts | Visa sandbox if confirmed, otherwise a labelled simulation |
| Scheduler | Holds the cancel-on-last-day job (time-skippable) | Python |
| Evidence store | Runs, quotes, screenshots, traces, receipts | Postgres, Tiger Data (MLH) for time series |
| Observability | Traces and logs for every agent step | Sentry |

Data flow: link in, capture, label and extract, score, verdict, approval, credential, schedule, receipt.

---

## 5. Scoring components

- **Exit Grade:** six criteria over 100 points (online cancel parity, short prominent path, no-login fallback, no obstruction, terms disclosed, exit costs stated), shown with coverage. Defined in `escape-hatch-spec.md` section 2 and grounded in California B&P 17602 subdivisions. Not a legal finding.
- **Terms red flags:** categories listed in the PRD (auto-renewal and price change, cancellation limits, fees and committed terms, arbitration and class waiver, unilateral changes, data sharing, content license, refund limits). Each flag requires a quote, a section reference, and a capture date.
- **Total commitment cost (TCC):** price over the chosen horizon plus stated exit costs plus any measured fee delta, with each component sourced and dated. Unknown components show "not found."
- **Alternatives ranking:** weighted combination of TCC, Exit Grade, and red-flag count. Weights are visible and user-adjustable. Defaults are an arbitrary starting point and should be tuned on the golden set.

---

## 6. Evidence and trust rules

| Tier | Source | Label |
|---|---|---|
| 1 | Live capture of a public page by the agent, with timestamp and screenshot | "Observed (date)" |
| 2 | Quoted text from published terms or help pages | "Stated on page" |
| 3 | Measured on the labelled demo merchant (full in-flow) | "Demo merchant" |
| none | Not found | "Not found" |

Rules: show capture date on every item; mark stale items; keep run artifacts (screenshots, DOM text hash, trace ID); allow a merchant reply; do not store personal data beyond the session; never enter real credentials or payment details on any real site.

---

## 7. Features

Hero (demo path)
1. Link or name in, verdict card out for one real service, live.
2. Exit Grade with flagged patterns and quotes.
3. Top terms red flags with quotes.
4. Alternatives view for one category with total commitment cost.
5. Review card and simulated credential.
6. Time-skipped last-day cancel on the demo merchant, with an evidence receipt.
7. Sentry traces for every step.

Supporting
8. Adjustable ranking weights.
9. Decline-and-document log.
10. Merchant right-of-reply field.

Stretch
11. Photon: text a link, get a short verdict back; trial-ending reminder by SMS.
12. Second category.
13. Leaderboard of graded services.
14. Devin opens a fix PR on the demo merchant repo, then the agent re-runs the grade.

---

## 8. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Agents and chat | Fetch.ai uAgents, Agent Chat Protocol, Agentverse, ASI:One Interactive Cards | Card details and image input are UNVERIFIED; the flow needs only a link or name |
| Browser | Browser Use | API and rate limits to confirm |
| Vision | StepFun `step-5-preview` | Must be called at runtime for that prize |
| Language | Gemini (MLH) | Clause extraction and summaries |
| Scoring | Python, deterministic | No model in the score |
| Storage | Postgres, Tiger Data (MLH) | Evidence and time series |
| Hosting | Vultr (MLH) | Services and the demo merchant |
| Observability | Sentry: Tracing, Logs, AI agent monitoring (must-have). Session Replay (stretch, see risks) | Needs 2+ products beyond error monitoring |
| Design | Paper | Verdict card, grade HUD, receipt |
| Messaging | Photon | Stretch |
| Build assist | Devin | Optional |
| Domain | GoDaddy Registry (MLH) | Cheap add-on |

---

## 9. Track and prize coverage

| Track | Fit | Role | Prize (from docs) |
|---|---|---|---|
| Visa | A- | Covers discovery, decision, checkout, payments, post-purchase. Scoped credential. Trust and responsibility | 1st: $2,000. Judged on innovation 25%, UX 25%, technical 20%, commerce impact 15%, trust and responsibility 15% |
| Browser Use | A- | Capture engine; "agent that pays and completes transactions" | Unknown |
| Sentry | A- | Tracing, logs, agent monitoring as the evidence trail | Interview for each team member |
| Fetch.ai | B+ | Chat-first assistant, cards, Payment Protocol fit | Pool unverified |
| StepFun | B+ | Screenshot labeling and product-image reading | Unknown |
| Applied Intelligence | B+ | Consumer protection | No prize listed |
| MLH Gemini | B | Clause extraction | Google swag kits |
| Paper | B | Verdict card, HUD, receipt | 1st $1,500, 2nd $1,000, 3rd $500 |
| Photon | B- | Text-a-link verdict, reminders | Unknown |
| MLH Domain | B- | Add-on | Digital gift card |
| Tiger Data | C+ | Price and grade history | Stream Deck Mini |
| Vultr | C+ | Hosting | Portable screens |
| Best Use of Devin | C+ (B- with the fix-PR stretch) | Build assist or fix PRs | 1st: $5,000 Devin credits |
| veri.studio | C+ | Only with a fine-tuned clause classifier and a before/after result | Not stated |
| Model Learning | C | Same classifier with a real evaluation | Unknown |
| Snowflake | C | Cross-merchant benchmarks | Raspberry Pi 4 |
| MLH ElevenLabs | C- | Optional spoken summary | Wireless earbuds |
| Base44 | D | Would need to be built substantially in Base44 | 1st $1,500, runner-up $500 |
| Intuit, Workday, Solana | D | No natural role | Various |
| Espressif, QNX, Even Realities, Beyond the Digital, Creao | n/a | Hardware or a one-person rule | n/a |

Counts: 9 tracks at B- or better (excluding the domain add-on), 6 at B+ or better, about 4 major-prize tracks (Visa, Sentry, Fetch, Paper; Devin marginal). Prize stacking across sponsors is unverified.

---

## 10. Novelty and positioning

Existing alternatives, with what Shop Check adds
- **Virtual or temp cards:** stop a charge but do not end the contract, prove intent, or tell you whether to start. Shop Check binds the credential to graded terms, cancels, and keeps evidence.
- **Subscription managers:** list and cancel after you have subscribed. Shop Check grades before you start.
- **Terms summarizers:** summarize without checking the exit flow or quoting clauses against the page. Shop Check ties each flag to a quote.
- **Recommenders:** optimize for conversion and taste. Shop Check ranks by total commitment cost and exit ease, a signal recommenders lack.
- **Regulation (click to cancel and similar):** sets rules but does not measure individual services.

Differentiator: one verified pipeline across the whole decision (before, during, after purchase) with evidence at every step.

---

## 11. Business model and marketability (brief)

Revenue paths
- **Consumer:** free checks, paid for protected trials, monitoring, and recovered money (contingency fee).
- **Merchants and platforms:** private audit and fix-list reports; trust-score API for shopping agents. Public scores are never for sale.
- **Card issuers and wallets (hypothesis):** embed the verdict and the scoped credential.

Marketability notes
- Pain is real and widely shared; willingness to pay is low upfront for consumers, better for B2B audits and recovered-money fees.
- Competition: subscription managers, virtual-card services, terms summarizers, recommenders.
- Cold start: needs coverage on the services people actually use. Start with one category.
- Neutrality risk: selling to merchants you grade needs a firewall between audit and sales.
- Validation: interview 5 to 10 people about trial regret, and 3 to 5 growth or compliance people about audit reports.

---

## 12. Plan

| Role | Owns |
|---|---|
| Lead (agents, Python) | Fetch agents, ASI:One cards, orchestration, submission |
| Research | Terms taxonomy, golden set, rules table and citations, service and terms URLs, legal wording |
| Backend | Capture, scoring, labeler and clause extraction, credential simulation, storage, Sentry |
| UI/UX | Verdict card, grade HUD, receipt, comparison view, demo video |

Timeline
- Hours 0 to 3: hello-world agent discoverable in ASI:One, Sentry wired, capture of one real page, golden set started.
- Hours 3 to 9: Exit Grade on one real service, labeler working, verdict card in chat.
- Hours 9 to 14: terms red flags with quotes, alternatives ranking for one category.
- Hours 14 to 18: review card, simulated credential, last-day cancel on the demo merchant, receipt.
- Hours 18 to 20: reliability pass (page changes, blocked fetch, bad label), cached runs for all demo services.
- Hours 20 to 22: demo video, README, Devpost, Fetch Submission Agent, rehearsal.

Must be true at the midpoint checkpoint: agent answering in ASI:One, one real page graded end to end, Sentry traces emitting.

Cut order if behind: Photon, Devin fix-PR, leaderboard, second category, adjustable weights, Interactive Card polish (use text), the last-day cancel (use a recorded receipt). Never cut: ASI:One as the interface, one real live grade, the `step-5-preview` call, quoted evidence, or the receipt.

For 2 people and 36 hours: merge research into the backend role and UI/UX into the lead's, grade 3 services (1 live, 2 cached), skip alternatives beyond a hand-built table.

---

## 13. Demo script (3 minutes)

1. In ASI:One: "Check Spotify Premium before I start the trial."
2. Progress shows live capture. Verdict card appears: Exit Grade, quoted red flags, total commitment cost.
3. Open alternatives: ranked list with reasons. Drag a weight, ranking reorders.
4. Review card: spend cap, last-day action, data stored. Approve.
5. Simulated credential issued (labelled). Skip to the last day.
6. Agent runs the cancel flow on the demo merchant. Receipt shows steps, timings, and a trace link.
7. Show a charge attempt outside the terms being declined and logged.
8. Close with the Sentry trace and the rule: no quote, no label.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope (all-in-one) | One pipeline, hero path only, defined cut order |
| ASI:One and Agentverse friction | Hello-world agent in the first 2 hours, text replies before cards |
| Live capture is brittle (blocks, empty bodies, JS pages) | Cached runs for every demo service, three live candidates, labelled demo merchant fallback |
| Labeler and clause extraction errors | No quote, no label, confidence shown, golden-set precision check |
| Payment realism and Visa claims | Clearly labelled simulation unless sandbox access is confirmed; no real card; no implied partnership |
| Terms and site policies for automated reads | Public pages only, low rate, cached, per-site terms noted |
| Legal wording | Informational only, cited rules, right of reply |
| Sentry Session Replay may not record a headless browser visiting third-party sites | Treat Tracing, Logs, and agent monitoring as the must-have; use Replay only on our own viewer UI (stretch); keep screenshots and traces as the run evidence |
| Photon image input and beta access | Not needed for the hero path; stretch only |
| ToS and clause volume (long pages) | Extract by category with section anchors; cap page length; cache |

---

## 15. Grades (A to F, my estimates, same rubric as before)

| Scope | Real demo | Track | Unique | Impact | Risk | Comm | Exp | Score | Grade |
|---|---|---|---|---|---|---|---|---|---|
| 4.5 | 7 | 8.5 | 6.5 | 6.5 | 6 | 7 | 7 | **65** | **B** |

Comparison with other ideas (from earlier scoring): Over-the-Shoulder about 75 before the Fetch-channel correction, Council Radar about 70, Escape Hatch 69.5, Exit Lighthouse 69.5, Watchdog 65, Values Lens 49.

Notes
- **Strengths:** the broadest earned track fit of any single idea except the care ideas, the best Visa fit so far, and a real-site demo.
- **Weaknesses:** scope is the main score drag. Uniqueness is moderate, because each piece has a competitor. The combination and the evidence trail are the differentiators.
- **Design prize potential:** B. The verdict card, grade HUD, and receipt are real surfaces, but chat hosts most of the UI.
- **Recommendation:** build it only as the single loop above. If scope slips at the checkpoint, fall back to Escape Hatch (grade, protect, cancel) and drop alternatives and clause analysis.

---

## 16. Open items to verify
- ASI:One Interactive Card capabilities and whether image input is supported.
- Visa Intelligent Commerce sandbox availability and terms.
- Browser Use and Photon rules (docs not read).
- StepFun access, rate limits, and image size limits.
- Whether Sentry Session Replay can be used for this evidence trail.
- Terms-of-service URLs for each demo service, and each site's policy on automated reads.
- Pricing page capture method for the alternatives view.
- California B&P 17602 cites against the official source.
- Fetch.ai prize pool.
