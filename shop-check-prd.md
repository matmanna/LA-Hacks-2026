# Shop Check: Product Requirements Document (PRD)

Version: hackathon MVP (October 17 to 18, 2026 event window). Companion to `shop-check-design-doc.md` and `escape-hatch-spec.md`.

Conventions: P0 = required for the demo, P1 = should have, P2 = stretch. "Demo merchant" means a mock subscription service we host, clearly labelled, used where a real in-flow cancel needs an account. No em dashes.

---

## 1. Overview

**Product:** Shop Check is a chat-based shopping assistant, delivered inside an ASI:One conversation. For a service or product link, it returns a verdict that combines how hard the service is to cancel (Exit Grade), the terms clauses that matter (red flags with quotes), and ranked alternatives by total commitment cost. After the user approves, it issues a spending-limited credential (simulated unless a Visa sandbox is confirmed) and cancels on the last day with an evidence receipt.

**One-line value:** know the cost of leaving before you commit, and leave cleanly with proof.

## 2. Problem

- People start trials and subscriptions without knowing how hard they are to leave, what the fine print allows, or what comparable options cost to exit.
- Virtual cards stop a charge but leave the contract open and produce weak evidence. Subscription managers act after the fact. Recommenders optimize for conversion, not for exit cost.
- Terms are long and rarely read. The relevant clauses are hard to find and compare.

## 3. Goals and non-goals

Goals
1. Produce a verdict for a real public service within about 90 seconds (target, to be measured).
2. Make every flag verifiable: a quote or measurement, a source, and a date.
3. Let the user compare same-category alternatives by total commitment cost and exit ease.
4. Demonstrate the full protected-trial loop, ending with an evidence receipt.
5. Complete the primary workflow entirely inside an ASI:One conversation.

Non-goals (hackathon)
- Browser extension, dashboard, maps, extra values lenses, leaderboard (P2 only).
- Handling real payment instruments or real user accounts.
- Giving legal advice or declaring a company non-compliant.
- Covering more than one category beyond the hero category.
- Mobile app.

## 4. Users

| Persona | Need |
|---|---|
| **Trial-wary shopper** (student or young professional) | Know whether a trial is safe before starting; avoid forgotten renewals |
| **Household budget keeper** | See the real cost and exit cost of a plan; compare options |
| **Cautious parent or caregiver** | Check a service for a family member and set a spend limit |

Judges and sponsors are secondary audiences: they need to see sponsor requirements met in the demo.

## 5. User stories

1. As a shopper, I paste a service link and get a verdict so I can decide whether to start.
2. As a shopper, I see which clauses are risky, each with the exact quote, so I can trust the flag.
3. As a shopper, I compare alternatives by total cost and exit ease so I can choose.
4. As a shopper, I approve a spend cap and last-day cancellation so I do not have to remember.
5. As a shopper, I get a receipt with proof of what happened so I can dispute a wrong charge.
6. As a merchant, I can reply to a finding so the result is fair.

## 6. Scope

| Priority | Item |
|---|---|
| P0 | ASI:One chat agent registered on Agentverse (Agent Chat Protocol) |
| P0 | Live capture of one real public service (home, cancel/help, pricing, terms pages) |
| P0 | Exit Grade with coverage and flagged dark patterns, labels from `step-5-preview` |
| P0 | Terms red flags by category with quotes and section references |
| P0 | Total commitment cost for the services in one category |
| P0 | Alternatives ranking with visible weights |
| P0 | Review card, simulated credential, time-skipped last-day cancel on the demo merchant |
| P0 | Evidence receipt and Sentry traces |
| P1 | Adjustable weights in chat |
| P1 | Decline-and-document log |
| P1 | Merchant reply field |
| P1 | Cached runs for every demo service |
| P2 | Photon: text-a-link verdict and reminders |
| P2 | Second category, leaderboard |
| P2 | Devin fix PR on the demo merchant repo, then re-grade |

## 7. Functional requirements

### FR-1 Conversation and cards
- FR-1.1 The agent is registered on Agentverse and implements the Agent Chat Protocol. Acceptance: discoverable and usable from asi1.ai; the primary workflow completes without a custom frontend.
- FR-1.2 Input is a service name or URL. Acceptance: both forms resolve to the same service; unknown services return a clear "not supported yet" with the supported list.
- FR-1.3 Cards: verdict, alternatives, review, receipt. Acceptance: each card renders as an Interactive Card if supported, otherwise as formatted text with the same fields. (Card capability is UNVERIFIED.)
- FR-1.4 Progress is streamed while capture runs. Acceptance: user sees at least three progress updates and a final result.

### FR-2 Capture
- FR-2.1 The capture agent opens the service's public home, help or cancel page, pricing page, and terms page. Acceptance: for each of the demo services, page text and a screenshot are stored with a timestamp.
- FR-2.2 Record click count, elapsed time, and the path from the help entry point to the cancel control or login wall. Acceptance: path stored as an ordered list of steps with timing.
- FR-2.3 Handle blocked or empty pages. Acceptance: on failure the system retries once, then uses the cached run and labels it "cached (date)".
- FR-2.4 Rate-limit and read-only. Acceptance: no form submission, no login attempt, no credential entry on real sites.

### FR-3 Exit Grade
- FR-3.1 Compute the six-criterion Exit Grade defined in `escape-hatch-spec.md` section 2. Acceptance: score, grade, coverage percentage, and the evidence for each criterion are shown.
- FR-3.2 Cap the grade at B when coverage is under 60%. Acceptance: tested on a page with little observable evidence.
- FR-3.3 Never score missing evidence as a pass. Acceptance: criteria with no evidence show "not observed."
- FR-3.4 Wording is informational. Acceptance: no output contains "illegal" or "non-compliant" as a conclusion.

### FR-4 Dark-pattern labeling
- FR-4.1 Call `step-5-preview` with each screenshot to label patterns from the taxonomy (confirmshaming, forced chat, hidden link, save-offer loop, phone-only; optional forced survey, mail-only, pause as default, re-authentication trap). Acceptance: the call is made at runtime and logged in the trace.
- FR-4.2 A label requires quoted on-screen text or a measured value, a screenshot ID, and a confidence. Acceptance: labels without a quote or measurement are discarded.
- FR-4.3 Default is no label. Acceptance: on the hand-labeled golden set, false-positive rate is reported.

### FR-5 Terms red flags
- FR-5.1 Extract clauses by category: auto-renewal and price change, cancellation limits (notice periods, cutoff times), fees and committed terms, refund limits, arbitration and class-action waiver, unilateral changes, data sharing or sale, broad content license, trial-to-paid conversion terms. Acceptance: each flag includes the exact clause quote, the section or heading, the page URL, and the capture date.
- FR-5.2 Verify that every quote appears verbatim in the captured text. Acceptance: flags whose quote is not found in the captured text are dropped.
- FR-5.3 Severity is rule-based (for example "fee on cancellation" is higher than "terms may change"), not model opinion. Acceptance: severity table is documented and shown.
- FR-5.4 Label as informational. Acceptance: a visible "not legal advice" line on the card.

### FR-6 Total commitment cost and alternatives
- FR-6.1 TCC over a horizon (default 12 months) equals recurring price times months after any trial, plus one-time fees, plus stated exit costs (early termination fee or committed-period remainder), plus any measured fee delta. Acceptance: each component shows its source and date; unknown components show "not found" and are excluded from the sum with a note.
- FR-6.2 Alternatives come from a hand-curated category list (3 to 5 services). Acceptance: the hero category has at least 4 services with captured pricing and Exit Grades.
- FR-6.3 Ranking combines TCC, Exit Grade, and red-flag count with visible weights (defaults are an arbitrary starting point). Acceptance: changing a weight reorders results and the card shows the weights used.
- FR-6.4 No paid placement and no affiliate links in rankings. Acceptance: none present.

### FR-7 Protected trial (Escape Hatch)
- FR-7.1 The review card shows merchant, trial end date, spend cap, last-day action, and data stored. Acceptance: the user must approve explicitly before anything is created.
- FR-7.2 The credential is spending-limited and merchant-locked. Acceptance: the card shows a clear "SIMULATED" label unless a real Visa sandbox credential is used; no real card number is ever displayed.
- FR-7.3 The scheduler holds a cancel job for the last trial day, and a "skip to last day" control exists for the demo. Acceptance: the job runs on the demo merchant and ends in a cancellation confirmation.
- FR-7.4 Decline-and-document: an authorization attempt outside the terms is declined and logged with merchant, amount, and time. Acceptance: demonstrated with a scripted attempt on the demo merchant.

### FR-8 Evidence receipt
- FR-8.1 The receipt lists steps, timings, screenshots, quotes used, credential events, and the trace link. Acceptance: all hero-path runs generate a receipt.
- FR-8.2 A merchant reply field appears on the result. Acceptance: a submitted reply is displayed beside the finding with a timestamp (P1).

### FR-9 Observability
- FR-9.1 Sentry Tracing and Logs capture each agent step, and AI agent monitoring is enabled where supported. Acceptance: one trace per user request, with spans for capture, labeling, extraction, scoring, and credential events.
- FR-9.2 Session Replay is optional (P2) and only on our own viewer UI. Acceptance: not required for the demo path. (Whether Replay can capture a headless browser on third-party sites is UNVERIFIED.)

## 8. Definitions

**Exit Grade bands:** A 90 or above, B 80 to 89, C 70 to 79, D 60 to 69, F below 60, capped at B under 60% coverage.

**Terms red-flag severity (initial):**
| Severity | Examples |
|---|---|
| High | Fee or lost balance on cancel, committed period with fees, arbitration with class waiver, sale of personal data |
| Medium | Price change on notice, short cancellation cutoff, narrow refund window, broad content license |
| Low | Terms may change, jurisdiction clauses |

**Dark-pattern detection rules:** see `escape-hatch-spec.md` section 4.

## 9. UX requirements

Verdict card fields: service name and capture date; Exit Grade, coverage, and the three biggest flags; top three red flags with quote and section; TCC over the horizon with components; top three alternatives with rank reasons; actions (compare, protect trial); disclaimer.

Review card fields: merchant, trial end date, spend cap, cancel date, data stored, SIMULATED label, approve and cancel buttons.

Receipt card fields: timeline of steps with timings, screenshots, quotes, credential events, trace link, merchant reply.

Design principles: one strong visual identity (speedrun HUD for the grade, receipt styling for the receipt); high contrast and clear hierarchy; no generic dashboard look; accessible text sizes; every number has a visible source.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Target verdict in about 90 seconds for a real service; cached runs under 10 seconds (targets, to be measured) |
| Reliability | Retry once on page failure, then fall back to cached run labeled with its date. Show confidence on every label |
| Privacy | No personal data stored beyond the session; only the link or name and approvals; delete after the demo |
| Security | No real credentials or card numbers handled; secrets in environment variables; public repo contains no keys |
| Accessibility | Text equivalents for every card element; no information conveyed by color alone |
| Compliance | Informational wording, cited rules, per-site notes on terms for automated reads |

## 11. Data model (summary)

- **Service:** id, name, category, URLs (home, help, pricing, terms), notes on policy for automated reads.
- **Capture:** service id, page type, URL, timestamp, text, DOM text hash, screenshot ref, steps and timings.
- **Label:** capture id, pattern, quoted text or measurement, confidence, screenshot id.
- **Clause:** capture id, category, quote, section, severity.
- **Score:** service id, rubric version, per-criterion points, coverage, grade, timestamp.
- **Price:** service id, plan, amount, period, captured date, source URL.
- **Trial:** user session id, service id, cap, end date, status.
- **CredentialEvent:** trial id, type (issued, authorization attempt, declined), amount, merchant, time.
- **Receipt:** trial id, steps, artifacts, trace id, merchant reply.

## 12. Metrics and test plan

Hackathon success metrics
- The hero path completes end to end in the demo without manual intervention.
- Every displayed flag has a verifiable quote.
- Golden-set results are reported honestly in the demo.

Golden set
- Hand-label the public exit paths and terms pages of 10 services (from the verified list in `escape-hatch-spec.md`): Netflix, Spotify, Dropbox, Audible, YouTube Premium, SiriusXM, LinkedIn Premium, ChatGPT, Adobe, Peloton.
- Measure: label precision and recall against the hand labels, quote verification rate (target 100%), and Exit Grade agreement with a human grader.
- Report results as measured. Do not claim targets as results.

Tests
- Unit tests for the scorer (deterministic), TCC math, quote verification.
- Integration test: link in, verdict out, for a cached service and a live service.
- Failure tests: blocked page, empty body, label with no quote, unknown service.
- Demo rehearsal with the cut-order fallbacks.

## 13. Dependencies and integration notes

| Dependency | Needed for | Status |
|---|---|---|
| Fetch.ai Agentverse and ASI:One | Primary interface | Registration steps and card capabilities to confirm |
| Browser Use | Capture | Rules and limits not read |
| StepFun `step-5-preview` | Labeling | Access and limits to confirm |
| Gemini (MLH) | Clause extraction | Standard API |
| Visa sandbox | Credential | UNVERIFIED; use labelled simulation otherwise |
| Sentry | Traces and logs | Standard |
| Tiger Data, Vultr (MLH) | Storage and hosting | Optional |
| Photon | SMS (P2) | Beta access and rules not read |

## 14. Risks (summary)

See the risk table in `shop-check-design-doc.md` section 14. Top three: scope, live capture brittleness, and payment realism.

## 15. Milestones (22-hour plan)

| Hours | Milestone |
|---|---|
| 0 to 3 | Agent answering in ASI:One, Sentry wired, one real page captured, golden set started |
| 3 to 9 | Exit Grade on one real service, labeler working, verdict card in chat |
| 9 to 14 | Terms red flags with verified quotes, alternatives for one category |
| 14 to 18 | Review card, simulated credential, last-day cancel on demo merchant, receipt |
| 18 to 20 | Reliability pass, cached runs, golden-set numbers |
| 20 to 22 | Demo video, README, Devpost, Fetch Submission Agent, rehearsal |

Midpoint gate: agent answering, one real page graded end to end, traces emitting.

## 16. Open questions

1. Does ASI:One support the card types and any image input we want, or do we fall back to text?
2. Is a Visa sandbox available, and under what terms?
3. Which category is the hero (suggested: audio and media subscriptions, using Spotify, SiriusXM, Audible, YouTube Premium, and Netflix)?
4. Which terms URLs and pricing pages does the research role capture for each service?
5. What are Browser Use's and Photon's rules and limits?
6. Is the team 4 people or 2? The plan changes (see the design doc).
7. Can Sentry Session Replay be used here, or do we rely on Tracing, Logs, and agent monitoring?

## 17. Appendix: verified public cancel and help pages (from `escape-hatch-spec.md`)

| Service | URL |
|---|---|
| Netflix | https://help.netflix.com/en/node/407 |
| Spotify | https://support.spotify.com/us/article/cancel-premium/ |
| Dropbox | https://help.dropbox.com/accounts-billing/cancellations-refunds/cancel-subscription |
| Audible | https://help.audible.com/s/article/cancel-membership |
| YouTube Premium | https://support.google.com/youtube/answer/6308278 |
| SiriusXM | https://www.siriusxm.com/help/manage-or-cancel-service |
| LinkedIn Premium | https://www.linkedin.com/help/linkedin/answer/a545578 |
| ChatGPT | https://help.openai.com/en/articles/7232927-canceling-your-chatgpt-subscription |
| Adobe | https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html |
| Peloton (terms page) | https://www.onepeloton.com/membership-terms |

These help pages were readable logged out when checked. The real cancel control for each sits behind a login.
