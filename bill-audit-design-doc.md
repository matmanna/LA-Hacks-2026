# Redline (working name): Medical Bill Auditor and Contester. Design Doc, Track Analysis, Task Split

Reference point: **Goodbill**, an existing medical bill negotiation service. Companion: `bill-audit-prd.md`. Earlier thinking: `ideas-abstracts.md`, `care-navigator-design-doc.md`.

Status notes
- Event window: October 17 to 18, 2026 (per Paper's challenge page). Plan for about 22 hours and 4 people.
- Everything about Goodbill and other services below comes from their own pages or from comparison blogs I read on 2026-10-17. Comparison blogs are written by competitors and are secondary. Fees, features, and claims may have changed. Verify before using any figure in a pitch.
- Sponsor facts come from the LA Hacks track page and sponsor docs. Fetch.ai's pool is unverified. Photon's, Browser Use's, StepFun's, and Applied Intelligence's prizes are unknown.
- All demo bills are synthetic. Nothing here is medical or legal advice. Items marked UNVERIFIED were not confirmed in this session.
- No em dashes.

---

## 1. Summary

**Pitch:** "Photograph your hospital bill. Redline reads every line, shows you what looks wrong with the evidence, estimates what you could save, and drafts the request and the dispute. You approve each step, and the agent can make the call for you."

**What it does**
1. Reads a bill (photo, text, or link) into structured line items.
2. Audits it with rules and public benchmarks: duplicates, unit anomalies, unbundled codes, charges versus the hospital's published prices, and mismatches with the insurance explanation of benefits.
3. Screens for hospital financial assistance eligibility using the hospital's own published policy.
4. Estimates savings as a range with confidence tiers and shows the method.
5. Drafts an itemized-bill request and a dispute letter, and, with approval, places the call or sends the message.
6. Tracks the case and produces an evidence packet.

**Honest position:** Goodbill already does a version of steps 1 to 5 with human experts and hospital relationships. Redline's case rests on speed, visible evidence, user control, lower cost, and multi-channel access, not on having better negotiating leverage. At a hackathon the demo runs on synthetic bills, so the pitch must not claim real savings outcomes.

---

## 2. Reference analysis: Goodbill and other alternatives

### What Goodbill is (from its own pages)
| Item | Finding |
|---|---|
| Consumer flow | Patient authorizes Goodbill to get billing records from the hospital, provides insurance and medical record information, Goodbill's software and coding experts review the bill for coding errors and pricing discrepancies, then Goodbill negotiates with the hospital |
| Fee | 20% of the savings if a negotiation succeeds, capped at $1,000. Nothing if no savings. No fee if the patient rejects a negotiation letter or declines an offer |
| Savings claims | Its FAQ says average savings of 20 to 60% and as much as 95%, depending on the bill. One consumer guide says typically 20 to 30%. Figures vary by source |
| Eligibility | Hospital bills only, for now. Bills must be unpaid (no overpayment recovery). Bills in collections are not supported. Insured and uninsured patients can use it |
| Extras | Screens for 501(r) charity care eligibility (per a review of its process; its FAQ does not describe it) |
| Privacy | Says it uses data only to analyze and negotiate and does not sell personal data |
| Direction | Its homepage pitches an "intelligent savings engine for self-funded plans" for employers and third-party administrators, with stages from provider search through bill resolution. It cites 13K+ employers, 600K+ members, and record retrieval from 6K+ providers (company claims) |

### Other services (secondary sources, competitor-written, verify)
| Service | Model per a competitor's comparison page |
|---|---|
| Resolve Medical Bills | 10 to 25% tiered, refundable $249 to $499 deposit, $5,000 minimum bill |
| CareRoute Bill Defense | 18 to 25%, $1,000 cap (publisher of the comparison, so its claims favor itself) |
| Dollar For | Free nonprofit, helps with charity care at nonprofit hospitals |

### Where Redline can be better, and where it cannot
| Dimension | Goodbill | Redline | Honest caveat |
|---|---|---|---|
| Time to first insight | Needs records authorization, then analysis and negotiation. Its FAQ gives no timeline | Minutes from a photo, text, or link | Speed claims must be measured on the demo set |
| Evidence transparency | Software plus experts. How findings are shown to patients is not described on the pages I read | Every flag shows the line, the rule or benchmark, the source, and the date. You can verify without trusting us | Rules are only as good as our curated tables |
| User control | You authorize Goodbill to negotiate | Self-serve first. You approve every outbound message or call | Less hands-off for people who want it done for them |
| Cost to the user | 20% of savings, capped at $1,000 | Free audit, letters, and financial-assistance check. Optional assisted call at a lower success fee (hypothesis, see section 5) | Unit economics are unproven |
| Bill types | Hospital only, unpaid only | Audits hospital and professional lines. Benchmarks for professional charges are thinner (UNVERIFIED). Paid bills can be audited but recovery is manual | Negotiation leverage with providers is unproven |
| Charity care | Screens for 501(r) eligibility | Same, using the hospital's published policy, with the quoted threshold as evidence | Eligibility is an estimate, not a determination |
| Channels | App and web | ASI:One chat, SMS, and voice | Photon and ASI:One capabilities are unverified |
| Coverage and trust | Established brand, human coding experts, hospital relationships, BBB accreditation, HIPAA badge | None of these | Redline cannot claim real negotiation outcomes |
| Business model | Consumer fee plus a move toward employer plans and TPAs | Consumer self-serve first, B2B later | Goodbill is already moving into B2B |

### What this means
- Compete on **speed, evidence, control, and price**, not on negotiating power.
- Use an **assisted tier** where the agent makes the call, but frame it as a lower-cost option, not a replacement for a human expert.
- Say plainly in the pitch: Goodbill exists and is real. Redline is the self-serve, evidence-first alternative.

---

## 3. How the user saves money

Savings come from specific levers. Each lever has an evidence type and a confidence tier shown to the user.

| # | Lever | What the agent does | Data source | Confidence tier |
|---|---|---|---|---|
| 1 | Request an itemized bill | Detects summary-only statements and drafts the request. Unlocks the other levers | The bill itself | Process step |
| 2 | Duplicate or repeated charges | Flags identical lines or implausible repeats | Arithmetic on the itemized bill | **Confirmed by arithmetic** |
| 3 | Unit and quantity anomalies | Flags units beyond a plausible bound for the line | Rule table with source | Rule-based |
| 4 | Unbundled code pairs | Flags code pairs that coding edits say should not be billed separately | CMS NCCI edit tables (access and format UNVERIFIED). Note: CPT code descriptions are licensed by the AMA, so use code numbers and public HCPCS text only, and check licensing | Rule-based |
| 5 | Billed price versus published price | Compares the charge to the hospital's published standard charges (cash and negotiated prices) | Hospital price-transparency files (availability and format vary, UNVERIFIED) | Leverage |
| 6 | EOB reconciliation | Compares "patient responsibility" on the EOB to what the bill asks | User-provided EOB | Confirmed when both documents show different amounts |
| 7 | Financial assistance | Reads the hospital's published financial assistance policy, asks household size and income, estimates eligibility | Hospital website (nonprofit hospitals are expected to publish a policy under the IRS 501(r) rules, UNVERIFIED details) | Estimate |
| 8 | Negotiate or set a payment plan | Drafts a script and, if approved, places the call | The agent's findings | Outcome unknown |
| 9 | Surprise out-of-network billing | Flags situations that may fall under federal surprise-billing protections and points to the dispute route | Bill and EOB; scope of the law UNVERIFIED | Flag only |

### Savings estimate (shown on the result card)
- **Confirmed:** sum of lines flagged by arithmetic or an EOB mismatch.
- **Potential:** sum of lines flagged by rules or price leverage, with a range, not a point.
- **Financial assistance:** shown separately because it can change the whole bill.
- Always labelled an estimate, with the method visible and a reminder that results depend on the hospital.

### Illustrative example (synthetic, not a claim)
A synthetic $12,000 bill has $1,150 in confirmed errors and $2,400 in potential leverage, and the patient is not likely eligible for assistance. Total possible savings: $1,150 to $3,550. At a hypothetical 10% success fee, an assisted call would cost $115 to $355 versus $230 to $710 at Goodbill's published 20% rate (both below Goodbill's $1,000 cap). Numbers are illustrative only. Real outcomes are unknown.

---

## 4. Product design

### User journey (ASI:One conversation)
1. User sends a bill (pasted text, a link, or an image if ASI:One supports it, UNVERIFIED).
2. Redline reads it and shows the line items back for confirmation.
3. Audit card: flags by lever, evidence per flag, savings estimate range.
4. Financial-assistance card: asks household size and income, shows the policy quote and an estimate.
5. Action card: choose itemized-bill request, dispute letter, or an assisted call.
6. Approval card: exactly what will be sent or said and to whom.
7. Agent sends or calls. Transcript and result return as a card.
8. Case timeline with deadlines and SMS reminders. Evidence packet export.

### Architecture
| Component | Role | Tooling |
|---|---|---|
| Orchestrator | ASI:One conversation, cards, approvals | Fetch.ai uAgents, Agent Chat Protocol, Agentverse |
| Bill reader | Photo or text to structured line items | StepFun `step-5-preview` (image), Gemini (text and cleanup) |
| Rules engine | Deterministic audit and savings estimate | Python, curated rule tables with sources |
| Benchmark capture | Reads the hospital's price-transparency file and financial assistance policy | Browser Use on real public hospital pages |
| Assistance screener | Applies the policy thresholds to user inputs | Python plus quoted policy text |
| Letter writer | Itemized-bill request and dispute letter with citations | Gemini with templates |
| Voice and messaging | Outbound calls and SMS | Photon, ElevenLabs |
| Evidence store | Cases, flags, sources, transcripts | Postgres, Tiger Data for case events |
| Observability | Traces and logs for every step | Sentry |
| Viewer (optional) | Redline view of the bill | Web page linked from chat |

### The redline view (design hero)
A page that shows the bill like an edited document: flagged lines highlighted, margin notes with the evidence, running savings total, and a clear visual language. It carries the design-prize pitch (Paper) and gives judges something memorable to see. The ASI:One chat remains the primary interface.

### Evidence rules
| Tier | Source | Label |
|---|---|---|
| 1 | Arithmetic on the user's bill or a mismatch between bill and EOB | "Confirmed from your documents" |
| 2 | Rule table with a cited source | "Rule-based (source, date)" |
| 3 | Hospital's published price or policy, captured live | "From hospital's published data (date)" |
| none | Not found | "Not found" |

Rules: every flag has a line reference, a source, and a date; no model opinion counts as evidence; missing data is shown as "not found"; all estimates are labelled; no flag says a charge is illegal.

---

## 5. Business model and marketability

### How Redline makes money (hypotheses, unvalidated)
1. **Free self-serve:** audit, letters, and financial-assistance screening. This is the acquisition tier.
2. **Assisted tier:** the agent makes the call or sends the dispute. Charged as a success fee below Goodbill's 20%, capped, or as a flat fee. Unit costs to measure: model usage, voice minutes, telephony, SMS, support, and compliance.
3. **Employer and benefits channel:** employees get the audit as a benefit (Goodbill is moving toward employers and plans, so this will be contested).
4. **Community and nonprofit partners:** free audits through organizations that help patients, in the way Dollar For helps with charity care.
5. **Aggregated insights:** de-identified, aggregated error patterns for payers and hospital billing teams. Needs legal review and strong consent. A later option, not a launch plan.

### Marketability
| Question | Assessment |
|---|---|
| Real pain | High. Large bills, confusing statements, and low confidence in disputing them |
| Willingness to pay | Moderate for a success fee. Consumers pay when savings are clear and risk is zero |
| Competition | Goodbill, Resolve, CareRoute, advocates, and nonprofits. The category exists and has funded players |
| Differentiation | Speed, visible evidence, user control, lower cost, SMS and voice. Not negotiating leverage |
| Moat | Weak early. Over time: curated rule tables, hospital-specific benchmarks, and outcome data |
| Regulatory exposure | High: health data handling, call consent and recording rules, and boundaries on legal and medical advice |
| Hospital acceptance | Unknown. Hospitals may not respond to automated callers. Needs a human-in-the-loop option |
| Unit economics | Unproven. Must be measured before any fee is promised |

### What would need to be true for this to be viable
- The audit finds real, verifiable errors often enough that users trust it.
- Hospitals respond to agent-assisted disputes (or a human handles escalation).
- Cost per assisted case stays well below the fee.
- Privacy and compliance work can be done without a large upfront cost.

### Validation plan
- Interview 8 to 10 people who recently got a large hospital bill: what they did, what stopped them, what they would pay for.
- Interview 3 to 5 billing advocates or hospital financial counselors about what actually works.
- Test the audit on 10 anonymized or synthetic bills with known errors and measure recall.
- Ask 5 people whether they would send an agent-written dispute letter.

---

## 6. Track and prize analysis (best B to A fits)

| Track | Prize (from docs) | Fit now | Hero role | How to lift the fit | Priority |
|---|---|---|---|---|---|
| **Applied Intelligence** | No prize listed | **A** | Healthcare is named in the brief | State one clear user and a measured result | Anchor |
| **Fetch.ai** | Pool unverified | **A-** | Chat agent runs the whole audit and dispute workflow | Registered agent, Agent Chat Protocol, whole flow in ASI:One, Interactive Cards, Submission Agent and Devpost, public repo | Headline |
| **Photon** | Unknown | **A-** | Calls to billing departments and SMS reminders | Place one real call to a test line you control, with transcript; SMS case reminders | Primary |
| **MLH Gemini** | Google swag kits | **A-** | Text cleanup, letter drafting, clause and statement extraction | Make it load-bearing in the letter writer | Supporting |
| **MLH ElevenLabs** | Wireless earbuds | **B+** | Natural voice on calls | Use for the call and for a short spoken summary | Supporting |
| **StepFun** | Unknown | **B to B+** | `step-5-preview` reads the bill photo and the EOB | Make the photo reader the hero. Show reliability and let users confirm and edit lines (the doc rewards user control) | Primary |
| **Sentry** | Interview for each team member | **B to B+** | Traces and logs on every parse, rule, and call | Tracing plus Logs plus agent monitoring. Show one bug found through a trace. Replay only on our viewer (UNVERIFIED) | Primary |
| **Browser Use** | Unknown | **B** | Reads real public hospital pages (price-transparency file and financial assistance policy) live | Live capture of one real hospital's public pages, so the demo has a real-data moment | Supporting |
| **Paper** | 1st $1,500, 2nd $1,000, 3rd $500 | **C+ to B** | The redline view and cards | One polished redline page with a distinct visual identity | Supporting, needs a design owner |
| Best Use of Devin | 1st: $5,000 credits | C+ | Build assist | Skip unless time allows | Skip |
| veri.studio / Model Learning | Not stated / unknown | C+ / C | A fine-tuned line-item extractor with a measured before/after | Only if the extractor work is already needed | Skip |
| Vultr, Tiger Data, Snowflake | Swag | C+ / C / C | Hosting, case events, analytics | Use where free | Opportunistic |
| Visa, Base44, Intuit, Workday, Solana | Various | D | No natural role | Skip | Skip |

Targets for the best chance: **9 tracks at B or better** (Applied, Fetch, Photon, Gemini, ElevenLabs, StepFun, Sentry, Browser Use, Paper). Major-prize tracks fit: Fetch, Sentry, Paper (3 of 7). Prize stacking across sponsors is unverified.

Fetch caveat: the primary workflow must complete inside ASI:One. Image input there is unverified, so the fallback is pasted text or a link to an upload page. The redline viewer is optional and must not be required to finish the workflow.

---

## 7. Task split for 4 people (about 22 hours)

### Contracts agreed in hour 0 to 1 (everyone)
- **Bill JSON:** lines with id, date, description, code, units, charge; totals; source reference.
- **Flag JSON:** id, line ids, lever, evidence (quote, rule, or source), amount, confidence tier, source URL, captured date.
- **Case JSON:** timeline events, approvals, artifacts.

### Roles
| Person | Owns | Primary deliverables |
|---|---|---|
| **A: Lead (agents, Python)** | Fetch agent, ASI:One cards, orchestration, approvals, Photon and ElevenLabs call flow, submission | Agent answering in ASI:One by hour 2; approval flow; one real call to a test line; submission package |
| **B: Backend and data** | Bill reader (StepFun and Gemini), rules engine, benchmark capture (Browser Use), storage, Sentry | Bill JSON from a photo; rules producing Flag JSON; live capture of one hospital's public pages; traces |
| **C: Research and content** | Rule tables with sources, synthetic bills with seeded errors, financial assistance logic and policy quotes, letter templates, legal wording, golden set, competitor facts, sponsor requirements | 10 synthetic bills with known errors; rule table; two letter templates; evaluation numbers; disclaimers |
| **D: UI/UX and design** | Cards, redline viewer, case timeline, brand, demo video, Paper pitch | Card layouts by hour 6; redline page by hour 16; demo video by hour 21 |

### Timeline
| Hours | A: Lead | B: Backend | C: Research | D: UI/UX |
|---|---|---|---|---|
| 0 to 2 | Hello-world agent in ASI:One, Agentverse registration | Repo, schemas, Sentry wired, StepFun call working on one synthetic bill | Contracts, rule table skeleton, 3 synthetic bills | Visual direction, card wireframes |
| 2 to 6 | Chat flow: bill in, line items shown for confirmation | Bill reader to Bill JSON, line confirmation | 10 synthetic bills with seeded errors, EOB samples | Card designs: line list, audit card |
| 6 to 10 | Audit card wired, flags displayed | Rules engine v1: duplicates, units, EOB mismatch | Pairs table (unbundling) and sources; policy quotes for 1 hospital | Audit card and savings estimate designs |
| 10 to 14 | Action and approval cards, letter generation | Browser Use capture of 1 real hospital's price file and financial assistance policy; assistance screener | Letter templates, call script, disclaimers | Redline viewer build |
| 14 to 18 | Photon call to a test line, ElevenLabs voice, transcript card | Benchmark rule (billed versus published), cached runs | Evaluation on the 10 synthetic bills, test-line roles and call script | Case timeline, polish pass |
| 18 to 20 | Reliability pass, fallbacks | Traces review, fix one bug found via a trace | Final numbers, README facts, pitch lines | Demo video recording |
| 20 to 22 | Submission via Fetch Submission Agent and Devpost | Final fixes, repo cleanup | Rehearsal, Q and A prep | Final video, assets, rehearsal |

### Gates
- **Hour 3:** agent answering in ASI:One, one bill read into JSON, Sentry traces visible.
- **Hour 9:** audit card shows real flags for a synthetic bill.
- **Hour 14:** letter approved and sent to a test inbox, hospital pages captured live.
- **Hour 18:** one call placed to a test line with transcript.
- **Hour 20:** feature freeze. Only fixes and rehearsal after this.

### Cut order if behind
1. ElevenLabs spoken summary, then Browser Use portal ideas.
2. Voice call (use a recorded call and say so).
3. Benchmark comparison (billed versus published).
4. Redline viewer polish (use cards only).
5. Assistance screener (keep the policy quote only).
Never cut: ASI:One as the interface, bill photo to confirmed lines, at least three rule levers with evidence, one letter, the evidence trail in Sentry.

---

## 7A. Roadmap (easy and core first, then if time permits)

This reorders the work from section 7 by difficulty. Owners and role definitions in section 7 still apply. Two changes from section 7: **text input comes before image input**, and the **Fetch adapter moves behind a feasibility gate** (see section 7A.3) because ASI:One image and card support are unverified.

Architecture rule that makes the order work: one **core service** holds the logic (bill reading, rules, savings, letters). Everything else is a thin **adapter** on top: the mobile web app first, then the ASI:One agent, then Photon. Build the core and the web adapter first. Add other adapters only if they are cheap.

### 7A.1 Difficulty ladder
| Level | Items |
|---|---|
| **Easy** | Repo install and git, env, schemas and contracts, Vercel preview, mobile layout basics, text-bill input, line confirmation screen, duplicate-charge rule, unit-anomaly rule, savings math, letter template, approval card, Sentry wiring |
| **Medium** | Bill photo reading with `step-5-preview`, EOB mismatch rule, financial assistance screener, redline viewer, seeded evaluation numbers, test-inbox send, Fetch adapter (if the gate passes) |
| **Hard** | Live capture of a real hospital's public pages, billed-versus-published price comparison, unbundled code pairs table, outbound call to a test line, cached fallbacks for every live step |

### 7A.2 Phases
| Phase | Hours | Goal | Tasks (easiest first) | Owners | Done when |
|---|---|---|---|---|---|
| **0 Foundation** | 0 to 2 | Everyone can run and deploy the app | `cd redline && bun install && git init`, first commit and push; fill `apps/web/.env`; Vercel preview on a phone; Sentry wired; mobile basics from 12.5; Bill, Flag, and Case JSON contracts; first 3 synthetic bills | Backend, UI/UX, Research | A phone loads the preview URL; contracts are in the repo |
| **1 Core loop (MVP spine)** | 2 to 6 | A pasted bill becomes confirmed lines and first flags | Text-bill input; line parsing and confirmation screen; duplicate rule; unit-anomaly rule; savings math; `/case/$id` page with a savings bar and flag list | Backend, UI/UX, Research | Paste a synthetic bill, fix a line, see two kinds of flags with evidence |
| **2 Action loop (shippable product)** | 6 to 10 | A user can act on what was found | Evidence tiers on every flag; savings estimate card (confirmed, potential, assistance placeholder); dispute letter from flags; approval card; send to a test inbox; Sentry traces on parse, rules, letter; Fetch feasibility test (gate 7A.3) | Backend, Lead, UI/UX | End-to-end on a phone: bill, flags, letter approved and sent. **This is the minimum that must exist.** |
| **3 Hero features** | 10 to 14 | The parts that win tracks | Bill photo reading with `step-5-preview` and user line edits (StepFun hero); EOB mismatch rule; financial assistance screener on one real hospital's published policy; itemized-bill request draft; redline viewer v1 | Backend, Research, UI/UX | Photo in, confirmed lines out; assistance card cites a real policy quote with a date |
| **4 Wow and proof** | 14 to 18 | Live moments and credibility | Call to a test line with Photon and ElevenLabs, transcript and outcome card; billed-versus-published comparison from the hospital's price file; cached runs for every live step; evaluation numbers on the 10 synthetic bills; Fetch adapter if gated in | Lead, Backend, Research | One real call transcript; evaluation numbers measured, not guessed |
| **5 Freeze and ship** | 18 to 22 | Submit something solid | Reliability pass (blocked page, bad photo, failed call); feature freeze at hour 20; demo video; README; Devpost; Fetch Submission Agent if applicable; rehearsal | Everyone | Public repo, working preview, video, submission done |

### 7A.3 Gates
| Gate | Hour | Pass condition | If it fails |
|---|---|---|---|
| **G0** | 2 | Phone loads the Vercel preview; contracts in repo | Fix before anything else |
| **G1** | 6 | Paste a bill, see flags with evidence on a phone | Cut Phase 3 scope, keep text-only |
| **Fetch gate** | 3 to 4 | Agent answers in asi1.ai; one interactive card renders; a text message reaches the core API and returns an audit in about 60 seconds; Submission Agent steps understood | **Drop Fetch.** Spend the hours on Paper polish, Photon, and Sentry |
| **G2** | 10 | End-to-end on a phone: bill, flags, letter approved and sent | Everything else pauses until this works |
| **G3** | 14 | Photo reading works; one real policy captured | Fall back to text-only demo with a recorded photo run |
| **G4** | 18 | One call placed and transcribed (or recorded fallback labelled) | Use the recorded call and say so |
| **Freeze** | 20 | Only fixes and rehearsal | Anything unfinished is cut from the demo |

### 7A.4 If time permits (in priority order)
1. **Unbundled code pairs** from a curated table with cited sources (check licensing first).
2. **SMS case reminders** and a case timeline view.
3. **Evidence packet export** (bill, flags, sources, letters, transcripts).
4. **Spoken result summary** with ElevenLabs.
5. **Redline viewer polish:** transitions, margin-note animation, dark mode, print view.
6. **Second hospital** to show the capture generalizes.
7. **Audit of already-paid bills** (flag only; recovery stays manual).
8. **Fine-tuned line-item extractor** with a measured before-and-after (adds veri.studio and Model Learning).
9. **Tiger Data** case-event time series and a simple savings-over-time view.
10. **Browser Use on a mock billing portal** for status checks.
11. **Fetch Payment Protocol or extra cards** if the adapter is already in.
12. **Multilingual output** for letters and summaries.
13. **Devin** to generate tests or the rules table scaffolding.
14. **Offline-friendly viewer** (service worker; compatibility with TanStack Start is unverified).

### 7A.5 Rules for the roadmap
- Finish a phase before starting the next unless it blocks no one.
- Never start a "hard" item before G2 passes.
- Every "if time permits" item must not touch the hero path. If it does, it is cut.
- Ask at each gate: "Can we demo this honestly?" If not, cut it now, not at hour 21.

## 8. Demo script (3 minutes)

1. In ASI:One, send a synthetic bill photo. Lines appear for confirmation. Fix one misread line (shows user control).
2. Audit card: three flags with evidence. A duplicate lab charge is shown as confirmed. An unbundled pair is shown as rule-based with its source. A charge far above the hospital's published price is shown with a live-captured price from a real hospital's public page.
3. Financial assistance card: answer household size and income, see the quoted policy threshold and an estimate.
4. Savings estimate: confirmed amount, potential range, method visible.
5. Approve the dispute letter. Review what will be sent. Send to a test inbox.
6. Approve a call. The agent calls a test line (a teammate playing billing). Transcript and outcome return.
7. Open the redline view. Show the Sentry trace for the whole run.
8. Close: "Goodbill exists. Redline is the self-serve, evidence-first version: you see every reason, you approve every step."

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Health data privacy and compliance | Synthetic data only in the demo, minimal retention, no real record in third-party tools. A real launch needs a compliance review (HIPAA applicability depends on the setup, UNVERIFIED) |
| Reads as medical or legal advice | Informational wording, cited rules, "not legal advice" on every card, never say "illegal" |
| False flags erode trust | Deterministic rules first, tiered evidence, show sources, measure recall and false positives on the seeded set |
| Bill reading errors | User confirms lines before the audit; show the cropped source for each line |
| Public data access (price files, assistance policies, NCCI tables) | Pick one hospital whose files are accessible; cache; label date; verify licensing of any code descriptions |
| Calls to real hospitals | Use test lines you control; disclose the AI; ask permission to record where required (state rules vary, UNVERIFIED); rate-limit |
| Hospital does not respond to agents | Offer a human-in-the-loop escalation option |
| Scope | 3 to 5 levers in the hero path, defined cut order |
| Fetch constraint | Whole workflow in ASI:One; viewer is optional |
| Photon beta access and unknown rules | Request access early; keep a recorded fallback |
| Competitor comparison accuracy | Cite Goodbill's own pages for its facts; mark competitor-blog data as secondary |
| Unit economics unknown | State them as hypotheses, never as results |

---

## 10. Grades (A to F, my estimates, same rubric as earlier)

| Scope | Real demo | Track | Unique | Impact | Risk | Comm | Exp | Score | Grade |
|---|---|---|---|---|---|---|---|---|---|
| 5.5 | 6.5 | 8 | 5.5 | 8 | 5 | 6.5 | 7 | **64** | **B-** |

Earlier, the broader Hospital Bill Auditor scored 56.5 (C+). The gain comes from narrowing scope, adding a live real-data moment (public hospital pages), and making the StepFun and Sentry roles load-bearing.

Notes
- **Strengths:** highest impact of any idea, a strong fit with Applied, Fetch, Photon, and Gemini, and a clear savings story.
- **Weaknesses:** uniqueness is limited because Goodbill and others exist. Risk is high because of health data, calls, and the legal-advice boundary. Demo data is synthetic.
- **Design prize potential:** B with a polished redline page.
- **For comparison (earlier estimates):** cancel coach by text about 72, Exit Lighthouse and Escape Hatch about 69.5, Over-the-Shoulder about 75 before the Fetch-channel correction.
- **How to move toward B+:** measure recall on the seeded set and report it, run the live hospital-page capture, make the bill photo reader the StepFun hero, and polish the redline view.

---

## 11. Open items to verify
- Hospital price-transparency file availability and format for the chosen hospital.
- NCCI edit table access and any licensing limits on CPT code text.
- IRS 501(r) financial assistance policy requirements and how to read them reliably.
- Federal surprise-billing protections and their scope.
- HIPAA applicability for this product design.
- ASI:One image input and Interactive Card capabilities.
- Photon call and message capabilities, beta access, and rules.
- State call-recording and consent rules for the demo.
- Whether hospitals accept calls from automated agents.
- Goodbill's current fees and terms on its own site before quoting them.
- Fetch.ai prize pool.

## 12. Scaffolding and repo setup (mobile-first, TanStack Start, Vercel)

Status: the command below passed a Better-T-Stack **dry run**. The interrupted real run then **generated the project files** in `redline/` (created 2026-10-17 17:23, confirmed by listing the folder). It did **not** finish: there is no `node_modules` and no `.git`, so dependencies are not installed and git is not initialized. Nothing else has been run since. To finish: `cd redline && bun install && git init`.

### 12.1 Environment checked
bun 1.3.12, node 22.23.2, npm 10.9.8, and pnpm 11.28.5 are installed. Use bun.

### 12.2 The scaffold command
Run from `/home/matmanna/projects/lahacks`. The repo folder will be `redline`. The planning docs stay in the parent folder.

```
bun create better-t-stack@latest redline \
  --frontend tanstack-start \
  --backend self \
  --runtime none \
  --api orpc \
  --database postgres --orm drizzle --db-setup none --manual-db \
  --auth none --payments none \
  --addons biome --examples none \
  --web-deploy vercel --server-deploy none \
  --package-manager bun --git --install \
  --no-render-title --disable-analytics --directory-conflict error
```

The web builder at https://www.better-t-stack.dev/new produces an equivalent command. I did not check its UI output, only the CLI flags and a dry run.

### 12.3 Why these choices
| Choice | Reason |
|---|---|
| `tanstack-start` frontend, `--web-deploy vercel` | Your requirement. The dry run accepted this pair |
| `--backend self` with `--runtime none` | API routes live inside the TanStack Start app and ship to Vercel as one deployment. The CLI requires `runtime none` with `self` |
| `--api orpc` | Typed API with little boilerplate. You have used oRPC before |
| Postgres plus Drizzle, `--db-setup none --manual-db` | Skips auto-provisioning so `DATABASE_URL` can point at a Tiger Data Postgres instance (MLH prize). Any Postgres also works |
| `--auth none` | MVP uses synthetic data and no accounts. Add auth later if cases need owners |
| `--addons biome` | Lint and format only |
| No native frontend | Expo options exist (`native-uniwind`, `native-unistyles`) but the product is a chat agent plus a mobile web viewer |
| `--disable-analytics` | Turns off the CLI's usage telemetry |

### 12.4 Known incompatibility: the PWA addon
`--addons pwa` fails with TanStack Start. The CLI error says the PWA addon requires one of: `tanstack-router`, `react-router`, `solid`, or `next`. So mobile optimization is done by hand (next section). If installable-app behavior matters more than TanStack Start, `tanstack-router` is the supported route, but that changes your stated stack.

### 12.5 Mobile-first checklist (manual)
Apply in the first hour, then verify on a real phone.
1. **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover` in the root route head. Add `theme-color`.
2. **Web manifest:** `public/manifest.webmanifest` (name, short name, display `standalone`, colors, icons 192 and 512) linked from the root head. This gives "add to home screen" without a service worker.
3. **Safe areas:** pad fixed bars with `env(safe-area-inset-*)`.
4. **Touch targets:** at least 44 by 44 px; no hover-only actions.
5. **Camera upload:** `<input type="file" accept="image/*" capture="environment">` for the bill photo, with a fallback to the gallery.
6. **Layout:** single column, large readable text, high contrast, sticky savings total, bottom sheet for flag evidence, tap to expand.
7. **Performance:** compress uploaded images client-side before sending; keep the viewer light.
8. **Offline or service worker:** not needed for the demo. A service worker via a Vite PWA plugin is a stretch, and its compatibility with TanStack Start is UNVERIFIED.
9. **Test:** Chrome device emulation, then a real phone on a Vercel preview URL.

### 12.6 What Better-T-Stack generated (observed)
Read-only inspection of `redline/`:
- **Monorepo (Bun workspaces):** `apps/web` (TanStack Start app) and `packages/api`, `packages/db`, `packages/ui`, `packages/config`.
- **Vercel:** a root `vercel.json` using Vercel's `services` config (service `web`, root `apps/web`, framework `tanstack-start`, install command `cd ../.. && bun install`) with a catch-all rewrite to that service. A `.vercelignore` keeps `.env` files out of deployments. `scripts/sync-vercel-env.ts` syncs env vars to Vercel.
- **Root scripts (package.json):** `dev`, `build`, `check-types`, `dev:web`, `db:push`, `db:studio`, `db:generate`, `db:migrate`, `deploy:setup` (runs `bunx vercel link`), `dev:vercel`, `env:preview`, `env:production`, `deploy`, `deploy:prod`, `deploy:check`, `env:generate`, and `check` (Biome).
- **Env handling:** `apps/web/.env` and `.env.schema` exist (the project uses `varlock` to generate types from the schema). `.env` is local only.
- **Versions and metadata:** `bts.jsonc` records Better-T-Stack 3.47.0 and a reproducible command. Dependencies include oRPC, Drizzle, Tailwind 4, zod 4, TypeScript 6. The exact `reproducibleCommand` it recorded is the same flag set as in 12.2.
- **Not done yet:** `bun install`, `git init`, and any first build. Tailwind is present (UI package has `postcss.config.mjs`), so the mobile-first checklist can use it.
- **Still unconfirmed:** whether the TanStack Start app builds and deploys cleanly, and the exact limits of serverless functions on your Vercel plan.

### 12.7 Repo layout to aim for
```
lahacks/
  *.md                  planning docs (this folder)
  redline/              Better-T-Stack monorepo (generated)
    apps/web/           TanStack Start app; add /case/$id mobile-first viewer route here
    packages/api/       oRPC routers (cases, bills, flags, actions)
    packages/db/        Drizzle schema and migrations
    packages/ui/        shared UI components
    packages/config/    shared TS config
  agents/               Python service (NOT generated by Better-T-Stack)
    orchestrator, bill reader, rules engine, voice flow
```
The Fetch.ai agent is Python and runs as its own service. It can write cases through the web app's oRPC API or share the Postgres database. Pick one in hour 0 and write it in the contracts.

### 12.8 Vercel setup
1. Create a Vercel project from the `redline` repo (git push, then import) or run `bun deploy:setup` (which runs `bunx vercel link`). Use `bun env:preview` and `bun env:production` to sync env vars (check what the script reads before running it). `bun deploy` makes a preview deploy and `bun deploy:prod` a production deploy.
2. Add environment variables in Vercel and in a local `.env`: `DATABASE_URL`, `GEMINI_API_KEY`, `STEPFUN_API_KEY`, `SENTRY_DSN`, and later the Photon and ElevenLabs keys. Never commit them. Keep a `.env.example` with names only.
3. Deploy a preview on the first push and test it on a phone. Vercel previews give a URL per branch.
4. Confirm serverless limits for long steps (bill parsing, calls). Long jobs belong in the Python service, with the web app polling for results. Function time limits for your plan are UNVERIFIED.

### 12.9 First-hour checklist
| # | Task | Owner |
|---|---|---|
| 1 | `cd redline && bun install && git init`, first commit, push, invite teammates. Fill in `apps/web/.env` from `.env.schema` | Backend |
| 2 | `bun dev` works locally; one page loads on a phone via the Vercel preview | Backend and UI/UX |
| 3 | Mobile-first basics from 12.5 in the root layout | UI/UX |
| 4 | Drizzle schema from the PRD data model (case, bill, line, flag, action, event) | Backend |
| 5 | oRPC routes: create case, save parsed bill, list flags, approve action, get case | Backend |
| 6 | Sentry SDK in the web app (check Sentry's TanStack Start guidance for the right package) | Backend |
| 7 | `/case/$id` skeleton with the savings bar and a flag list | UI/UX |
| 8 | Python `agents/` skeleton with a hello-world agent registered on Agentverse | Lead |
| 9 | Agree the Bill, Flag, and Case JSON contracts and write them in the repo | Everyone |

### 12.10 Verification before trusting the scaffold
- `bun install` and `bun dev` succeed on a clean clone.
- `bun run build` succeeds, then a Vercel preview deploy succeeds.
- The viewer renders without horizontal scroll at 360 px width.
- No secrets are in git history.

### 12.11 Paper (paper.design) workflow for the design prize

What Paper is, from its own pages: a design canvas (browser or desktop) built on HTML and CSS, with an **MCP server** that lets coding agents read and write the design file. The MCP server is started by **Paper Desktop**. Paper's challenge page says submissions do **not** have to use Paper, and offers a free month of Paper Pro for a team of four with code `LAHACKS26` (separate from judging).

How it fits Redline
1. **UI/UX owner designs the mobile frames in Paper** at phone width: line confirmation, audit card, savings bar, assistance card, approval sheet, case timeline, and the redline viewer. Name frames after routes (for example `case-audit`, `line-confirm`, `approval-sheet`, `redline-viewer`).
2. **Define tokens in Paper** (colors, type scale, spacing, radius). Mirror them as CSS variables in the Tailwind theme in `redline/packages/ui` so design and code share names.
3. **Connect Claude Code to Paper over MCP** on the designer's machine (steps below). Select a frame in Paper, then ask the agent to implement it as a component in `redline/apps/web/src`, using the shared tokens.
4. **Use real data in designs.** The agent can pull content into frames, so load the synthetic bill and seeded flags to design real states (long descriptions, large totals, empty and error states).
5. **Iterate on a phone.** Push to a Vercel preview, review on a real device, edit in Paper, repeat.
6. **Commit design artifacts:** screenshots or exported frames in a `design/` folder, plus a short `DESIGN.md` listing tokens and frame-to-route mapping, so teammates without Paper see the intent.

Setup (from Paper's MCP docs)
- Install and open **Paper Desktop**. It runs the MCP server and installs the Paper CLI.
- Either click **Add to Claude** in Paper's MCP panel (with nothing selected), or run:
  `claude plugin marketplace add paper-design/agent-plugins && claude plugin install paper-desktop@paper`
- Restart Claude Code, run `/mcp` to confirm Paper is listed, and test with a small prompt such as creating a frame. The agent asks permission to use the server.
- Capabilities per the docs: read a selected frame, write layouts and content, turn a frame into code, pull outside content. The docs do not list individual tool names or the code export format.

Constraints to plan around
- **Paper Desktop must be running with the file open.** Reads and writes go to the open file on that machine, so only the designer's machine can use the MCP link. Plan for the designer to run the implementation loop, or to hand teammates frame screenshots and exported HTML and CSS.
- **Platform:** the docs mention WSL, which implies Windows and macOS desktops. Whether Paper Desktop runs on Linux is **unverified**. Assign the UI/UX role to a teammate on macOS or Windows, or use the browser version for design only (MCP needs Desktop).
- **MCP usage limits** change on upgrade to Pro (details not listed). Redeem the free Pro month early.
- **The agent can edit the design file.** Keep a copy or use version history before long agent sessions.
- **Export format:** Paper is HTML and CSS, but React and Tailwind export are not stated. Expect the agent to translate HTML and CSS into React with Tailwind classes.
- Whether the Figma-to-Paper token sync works for you is **unverified** and not needed here.

Design prize caution
- Judging is design fundamentals, ease of use, and personal craft that stands apart from clearly AI-generated designs. Hand-design the key frames and the visual identity in Paper. Use the agent to implement and to check consistency, not to invent the look.

## 13. Sources (accessed 2026-10-17)
- Goodbill FAQ: https://help.goodbill.com/en/articles/334657
- Goodbill pricing: https://help.goodbill.com/en/articles/254209
- Goodbill homepage: https://www.goodbill.com
- Competitor comparison (secondary, written by a competitor): https://www.careroute.ai/bill-defense/compare-medical-bill-negotiation-services
- Paper homepage: https://paper.design
- Paper MCP docs: https://paper.design/docs/mcp
- Paper challenge page for LA Hacks: https://paper.design/la-hacks
