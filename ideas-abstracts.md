# LA Hacks AI Hackathon 2026: Two Project Abstracts and Grades

Scope notes
- Target event: LA Hacks AI Hackathon 2026. Track list and sponsor docs were read from live.lahacks.com/tracks and the linked Google Docs.
- Team: 2 people (second person not chosen yet). Form factor: web or desktop (Tauri). Pre-built scaffolding allowed.
- Prize facts below are what the docs state. Anything marked "unverified" or "unknown" was not in a doc I could read. Check the official rules before committing, especially whether one team can win several sponsor prizes.
- Grades are A to F and are my own estimates. They are not official scoring.

---

## Abstract 1: Hospital Bill Auditor, Requester, and Contester

### One-line pitch
An agent that gets your itemized hospital bill, audits it line by line against public price data and billing rules, and then requests corrections and contests errors for you, including by phone and web portal, with a human approving every outbound action.

### Problem
Hospital bills are opaque, frequently contain duplicate charges, upcoded procedures, unbundled items, and wrong insurance adjustments, and the process to dispute them is slow and intimidating. Most people never request an itemized bill, so errors go unchallenged.

### Core workflow
1. **Intake.** User uploads a statement, itemized bill, or Explanation of Benefits (photo or PDF), or forwards it by text/email.
2. **Parse.** A multimodal model extracts line items, billing codes (CPT/HCPCS, revenue codes), dates, units, charges, insurer adjustments, and balances into structured data.
3. **Audit.** Rules and models flag issues:
   - duplicate charges and implausible unit counts
   - procedure code bundling conflicts (unbundled services that should be billed together)
   - charges far above published hospital price-transparency ranges
   - mismatches between the bill and the EOB
   - missing insurer adjustments
   - possible out-of-network or surprise-billing situations (flag for review; not a legal determination)
4. **Request.** If the bill is a summary, the agent drafts and sends a request for an itemized bill and records the request date.
5. **Contest.** The agent drafts a dispute letter citing the flagged lines, then follows up:
   - web portal via a browser agent where the hospital has one
   - phone call via a voice agent, where the user has consented and the call is disclosed as AI-assisted
   - tracked reference numbers, promised callback dates, and escalation steps
6. **Track.** A case timeline shows every action, response, deadline, and next step. User approves each outbound message or call before it happens.

### Features
- Line-item audit with a plain-language explanation per flag ("charged twice for the same lab panel on the same day").
- Estimated savings range, clearly labeled as an estimate.
- Auto-generated itemized-bill request and dispute letters with correct reference numbers.
- Agentic outbound calling to billing departments with transcript, summary, and promised next steps.
- Browser-agent portal navigation for status checks and submission (only on test portals in the demo).
- Case timeline with deadline reminders by SMS.
- Evidence packet export (original bill, flags, citations, call transcripts) for appeals or a state regulator complaint.
- "Explain my bill" mode in plain language for people with low health literacy; multilingual output.

### Proposed tech stack
| Layer | Choice | Why |
|---|---|---|
| Document parsing | Gemini multimodal (MLH Gemini prize) | Reads photos of bills and EOBs into structured line items |
| Rules engine | Python service + public billing-edit and price-transparency data | Deterministic flags first, models for explanation |
| Voice / calls | Photon calling agent + ElevenLabs voice | Outbound calls to billing departments, spoken natural voice |
| Messaging | Photon (SMS/iMessage/WhatsApp) | User approvals, status nudges, no app required |
| Portal automation | Browser Use | Navigates billing portals and forms; stops before submit |
| Agent interface | Fetch.ai Agentverse + ASI:One, Agent Chat Protocol | Required for Fetch track; primary workflow demonstrable in ASI:One chat |
| Backend | Python (FastAPI) or TypeScript (Hono/Next API routes) | Matches your Hack Club and personal project stack |
| Storage | Postgres with Tiger Data (time-series case events) | Timeline of events, continuous aggregates for savings dashboards |
| Hosting | Vultr | MLH hosting prize, easy VM/containers |
| Observability | Sentry (Tracing, Session Replay, Logs, AI agent monitoring) | Needs 2+ products beyond error monitoring for the prize |
| UI | Web (Next.js) designed in Paper | Case timeline dashboard; Best Designed Hack criteria |
| Build assist | Devin | Best Use of Devin credit prize; use for rules engine and test generation |
| Domain | GoDaddy Registry domain | MLH Best Domain Name prize |

### Track and prize coverage
| Track / challenge | Fit | Prize (from docs) | Notes |
|---|---|---|---|
| Fetch.ai (ASI:One Agent Challenge) | Strong | Pool unverified ($5k in a 2026 pre-event listing; not in the doc) | Must register on Agentverse, use Agent Chat Protocol, complete primary workflow inside ASI:One, submit via Submission Agent + Devpost + public repo |
| Photon (messaging/calling agent) | Strong | Unknown | Calling and SMS are central; guidelines doc (Notion) not read |
| Browser Use | Good | Unknown | Portal navigation and form filling; "personal agent that handles tedious workflows" |
| Applied Intelligence (track) | Strong | No prize listed on the card | Healthcare is named in the track description |
| Sentry | Good | 1st: guaranteed interview for each member (internship/new grad) | Needs Tracing + Replay (or similar) beyond errors |
| Best Use of Devin | Good | 1st: $5,000 Devin credits (single prize) | Judged on creativity, novelty, polish |
| Best Designed Hack (Paper) | Possible | Up to $1,500 | Not read in detail; page says design fundamentals, ease of use, personal craft |
| MLH: Gemini, ElevenLabs, Vultr, Tiger Data, Domain | Natural | Swag-level (Google swag, earbuds, portable screens, Stream Deck Mini, digital gift card) | Each is separate; only enter where the product truly uses it |
| Visa | Weak | 1st: $2,000 | Payments angle is thin unless the tool also handles payment plans |
| Workday | Weak | Not read | Not a fit |
| Base44 | Weak | 1st: $1,500, runner-up: $500 | Must be built substantially in Base44, so conflicts with the custom stack |
| Model Learning (track) | Optional | Unknown | Only if there is a trained classifier for billing anomalies with evaluation |

### Novelty
- Combines document understanding, rules-based auditing, and agentic outbound action (call + portal + SMS) in one case-management loop.
- The unusual part is the closed loop: it does not stop at "here are the errors"; it requests and contests on the user's behalf, tracks follow-through, and produces an evidence packet.
- Public price data and billing-edit tables give an external reference, not just LLM opinion.

### Priorities (24 to 36h, two people)
Must-have (demo path):
1. Bill photo to structured line items.
2. Five or six deterministic flags with explanations.
3. One outbound action approved by the user (dispute letter or call).
4. ASI:One chat as the interface (Fetch requirement) with a clear single workflow.

Should-have:
5. Voice call to a test line with transcript and summary.
6. Case timeline view.
7. Sentry Tracing + Replay wired into agent runs.

Nice-to-have:
8. Browser Use portal demo on a mock hospital portal.
9. EOB cross-check.
10. Multilingual output.

### Risks and constraints
- **Privacy and health data.** Bills contain sensitive information. Use synthetic or consented sample bills only in the demo; never log full documents in third-party tools; redact before sending to any service you do not control; display clear consent and storage controls.
- **Not legal or medical advice.** Label every output as informational. Do not claim a charge is illegal; say it is inconsistent with a published rule or price range and recommend asking the billing department.
- **Calling real hospitals.** Calls to real billing departments have consent, recording-disclosure, and abuse risks. For the demo, call a test line you own. In real use, disclose the call is AI-assisted and let the user listen or approve first.
- **Accuracy.** False flags erode trust. Keep deterministic rules narrow, show confidence, and always show the source for each flag.
- **Scope.** Many moving parts. Cut calling or portal automation first if time runs short.
- **Fetch constraint.** The primary workflow must complete entirely inside an ASI:One conversation without a custom frontend. A web dashboard is a bonus, not the main path.

---

## Abstract 2: Consumer Rights Watchdog and Leaderboard

### One-line pitch
A browser-agent measurement engine that audits real consumer flows (cancel, refund, checkout, accessibility, fine print), publishes a public leaderboard with replayable evidence, and gives users a one-click evidence packet for complaints.

### Problem
Consumers lose time and money to friction: subscriptions that are easy to start and hard to cancel, refunds hidden behind chatbot loops, fees that appear only at checkout, sites that cannot be used without a mouse, and terms that no one reads. There is no neutral, repeatable measurement of how hostile a flow is.

### Core modules (all share one engine)
1. **Cancel Speedrun.** Agent runs the cancel flow on a site and records clicks, screens, dark-pattern steps (forced retention offers, hidden links), and total time.
2. **Refund Race.** Same approach for refund and return flows: steps, dead ends, chatbot handoffs, time.
3. **Price Ghost.** Adds an item to cart, proceeds to checkout, and records the total at each step. Output is advertised price versus final price with each hidden fee labeled. No purchase, no payment entry.
4. **Keyboard-Only Audit.** Agent completes real tasks (sign up, search, check out) using only keyboard input and reports which tasks fail and where.
5. **Fine Print Scan.** Extracts auto-renewal, arbitration, data-sharing, and cancellation clauses and scores them.
6. **Hall of Shame leaderboard.** Public board of results, each linked to a replay of the agent's run and a timeline of slow steps.
7. **Complaint to Evidence (Fetch.ai front door).** User describes a bad experience in ASI:One; the Fetch agent selects the matching module, runs it, and returns an evidence packet (steps, timings, screenshots, replay link) ready to attach to a complaint.

### Features
- Standardized scoring rubric per module (clicks, time, dark-pattern count, fee delta, task completion).
- Replay and trace for every run so results are verifiable, not claims.
- Public leaderboard with filters by category and trend over time.
- Re-run on schedule to show changes (does a site fix its cancel flow?).
- Evidence packet export for complaints or regulator submissions.
- Responsible-disclosure path: sites can see their score and fix before it is published.
- Open rubric and mock sites so others can reproduce results.

### Proposed tech stack
| Layer | Choice | Why |
|---|---|---|
| Browser automation | Browser Use | Core engine; track explicitly invites "tools that make websites more accessible" and "new browser-powered experience" |
| Reasoning/extraction | Gemini (MLH) for clause extraction and flow classification | Fine-print scoring, dark-pattern labeling |
| Agent interface | Fetch.ai Agentverse + ASI:One | Complaint-to-Evidence entry; required Fetch deliverables |
| Observability | Sentry Session Replay + Tracing + Logs | Replays of agent runs double as proof; satisfies "2+ products beyond errors" |
| Storage | Postgres with Tiger Data | Time-series of scores per site, continuous aggregates for trend charts |
| Backend | TypeScript (Hono/Bun) or Python (FastAPI) | Matches existing stack |
| Frontend | Next.js web app designed in Paper | Leaderboard and run viewer; Best Designed Hack criteria |
| Hosting | Vultr | MLH hosting prize |
| Commerce framing | Visa track narrative (Price Ghost) | Trust and responsibility criterion fits fee-transparency measurement |
| Messaging (optional) | Photon SMS | Text a site name, get a score back |
| Build assist | Devin | Harness, mock sites, and test generation |
| Domain | GoDaddy Registry domain | MLH Best Domain Name |

### Track and prize coverage
| Track / challenge | Fit | Prize (from docs) | Notes |
|---|---|---|---|
| Browser Use | Strong | Unknown | Core engine; agent turns a goal into action on the web |
| Sentry | Strong | 1st: guaranteed interview for each member | Replay + Tracing are the product, not an add-on |
| Fetch.ai | Good | Pool unverified | Complaint-to-Evidence can be completed in ASI:One |
| Applied Intelligence (track) | Strong | No prize listed on the card | Consumer protection is a clear real-world problem |
| Visa | Good | 1st: $2,000 | Price Ghost speaks to commerce impact and trust (15% of score) |
| Best Designed Hack (Paper) | Good | Up to $1,500 | Leaderboard and run viewer design |
| Best Use of Devin | Possible | 1st: $5,000 Devin credits | Judged on creativity, novelty, polish |
| MLH: Gemini, Tiger Data, Vultr, Domain | Natural | Swag-level | Each is a separate prize |
| Photon | Optional | Unknown | SMS entry point only |
| Base44 | Weak | 1st: $1,500, runner-up: $500 | Would require Base44 as primary builder |
| Model Learning (track) | Optional | Unknown | Only with a trained dark-pattern classifier and eval |

### Novelty
- Treats consumer UX friction as a measurable, replayable quantity.
- Evidence is the product: every score links to a recording and trace.
- Shared engine means each new module is cheap to add, and the leaderboard compounds over time.

### Priorities (24 to 36h, two people)
Must-have (demo path):
1. Two mock sites with built-in friction (one cancel flow, one hidden-fee checkout).
2. Cancel Speedrun and Price Ghost modules with scores.
3. Public leaderboard showing runs from both sites.
4. Sentry Replay and Tracing linked to each run.

Should-have:
5. Refund Race module.
6. Complaint-to-Evidence through ASI:One.
7. Evidence packet export.

Nice-to-have:
8. Keyboard-Only Audit.
9. Fine Print Scan.
10. Scheduled re-runs and trend charts.

### Risks and constraints
- **Terms of service and legality.** Do not run automated cancel or checkout flows against live sites in the demo. Use mock sites you build, or sites that have consented. Publishing scores of real companies needs a disclosure and correction process.
- **No real credentials or purchases.** The agent never enters real account passwords or payment details; mock accounts only.
- **Fairness.** Scores must be reproducible and explainable; show the rubric and allow a company to dispute.
- **Brittleness.** Real sites change; keep the engine on a small set of targets with cached runs as a live-demo fallback.

---

## Combined option
Run the watchdog as the core product and ship the hospital bill auditor as a vertical module ("Medical Bills") that reuses the same evidence packet, Fetch interface, and Sentry replay layer. This lets you demo breadth (many consumer flows) and depth (one emotional, high-stakes case) in the same project, and keeps both stories coherent for judges. Because it doubles scope, treat the hospital module as stretch unless the watchdog engine is done by hour 12.

---

## Grades (A to F, my estimates)

| Factor | Hospital Bill Auditor | Consumer Rights Watchdog |
|---|---|---|
| Demo compellingness | B+ | A- |
| Fit in 24 to 36h (2 people) | C | B |
| Uniqueness | B+ | A- |
| Emotional / real-people impact | A | B+ |
| Track coverage | A- | A- |
| Prize and stakes | B | B+ |
| Safety, legal, and privacy risk (A = low risk) | D+ | B |
| Fit with your experience | B- | B+ |
| Form factor fit (web/desktop) | B (Fetch chat-only constraint) | B+ |
| Judge friendliness (clear story, verifiable results) | B | A- |
| **Overall** | **B** | **A-** |

### Notes on the grades
- **Demo:** the watchdog has a visual leaderboard and replays that tell the story without narration. The hospital tool's live call is strong but riskier and slower to set up.
- **Timeframe:** the hospital tool needs OCR, billing-rules logic, voice, and approvals. The watchdog can ship a thin slice (two mock sites, two modules) and still demo well.
- **Uniqueness:** both are novel. Medical bill advocacy products exist, so the agentic call-and-contest loop is the differentiator. Measuring dark patterns with replays is rarer in hackathon demos.
- **Risk:** the hospital tool handles health data and may place calls to real organizations. The watchdog's main risk is publishing real company scores, which mock sites avoid.
- **Experience:** the watchdog fits your web stack, data-analysis background (fraud-prevention work), and disclosure ethics. The hospital tool uses your voice/phone experience but adds a domain you have not shipped in.

### Recommendation
Build the watchdog first. Add the hospital bill module only after the shared engine, leaderboard, and Sentry replays work. If you can only do one story for judges, lead with the watchdog and show one medical-bill case as an example.
