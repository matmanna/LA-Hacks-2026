# BetterBill: Team Brief (as provided by the team, Sat 14:37 PDT)

Source: the team's final-idea breakdown, saved verbatim in substance for the agent plans. **Change applied on top of this brief:** demo work (script, rehearsal, video, Devpost, pitch) moves from Role D to **Role C (evidence)**. Role D (UI) builds until the 09:00 freeze and also owns the consumer and insurance-facing landing pages. See `00-shared-context.md` for the binding conventions.

---

LA Hacks AI 2026, UCLA, team of 4, final idea.

**BetterBill.** Photograph your hospital bill. BetterBill reads every line, shows what looks wrong with the evidence, estimates what you could save, drafts the dispute, and makes the call for you once you approve.

Times (PDT): updated 14:37 Sat, about 21h left. Freeze Sun 09:00. Submit Sun 12:00. Judging Sun 12:30.

**Final idea.** Reference: Goodbill. BetterBill is the self-serve, evidence-first medical bill checker: you see every reason a charge is flagged, and you approve every step before anything is sent.

Example cards from the brief:
- CBC w/ differential (85025), $84.00, listed twice. "Duplicate line, same date. Confirmed from your bill."
- MRI lumbar, no contrast (72148), $6,900.00. "The hospital's own published cash price is lower. Source: its price file, captured today."
- Possible savings (illustrative): $84 confirmed, $1,700 to $2,400 potential.

**Who:** someone with a confusing $12,000 hospital bill who doesn't know they can question it.
**Why:** 45% of insured workers got a bill they thought insurance should cover; fewer than half challenged it; 38% of those who did got it cut or removed (Commonwealth Fund, reported). VERIFY the source and wording before using in the pitch.
**When:** the day the bill arrives, before paying it or ignoring it.
**What:** photo in, then confirmed line items, an audit with evidence, a savings range, a financial-assistance check, a dispute letter, and an agent call you approve.
**How:** step-5-preview reads the photo; Gemini drafts. A deterministic rules engine flags errors. Browser Use captures the hospital's public prices and assistance policy. Photon and ElevenLabs place the call. Sentry and evlog trace everything.
**Versus Goodbill:** Goodbill takes 20% of savings (capped at $1,000), handles unpaid hospital bills only, and runs on human experts. BetterBill is faster, free to audit, shows every reason, and leaves you in control. We don't claim better negotiating power.

**Review notes (from the brief).** Strongest idea on human impact. As written B-minus (64); with fixes a solid B-plus, with real shots at Applied Intelligence, Fetch, Photon, StepFun, and Sentry.

Strengths: real, emotional, frequent pain; a clear money story; evidence tiers; load-bearing roles for StepFun, Photon, ElevenLabs, Browser Use, Sentry; core-plus-adapters design and gates.

Risks and fixes:
- Synthetic bills invite "you planted the errors." Fix: also run on real published bills (KFF Health News "Bill of the Month") and report what BetterBill catches versus what reporters found.
- Goodbill exists, uniqueness is low. Fix: lead with the real-data moment (hospital's own published price undercuts the charge) and a measured recall number.
- The call is a teammate playing billing. Fix: hand a judge the "billing office" phone with a 3-line script; they take the agent's call live.
- Two languages. Fix: all logic in the TypeScript core behind oRPC; Python is only a thin Fetch adapter, only if the Fetch gate passes.
- Scope. Fix: hero path is 4 levers: duplicates, units, bill vs EOB, published price. Financial assistance is the 5th if time.

**Strengthening options (two per role, pick one, only after G2):**
| Role | Option | Why | Size |
|---|---|---|---|
| A | A1 Judge-takes-the-call | Most memorable 30 seconds (Photon, ElevenLabs) | 2h |
| A | A2 Text-a-bill via Photon, audit back by text, reminders | No app, second Photon channel | 2h |
| B | B1 Line confidence with source crops | StepFun judged on reliability and user control | 2h |
| B | B2 Evidence packet export (PDF or link) | Hand to the hospital; Applied Intelligence, Commit | 2h |
| C | C1 "Bill of the Month" benchmark (5 to 8 real published bills) | Answers "you planted errors"; real recall number | 2.5h |
| C | C2 Real LA hospital data (price file and assistance policy; brief says Cedars-Sinai lists a lumbar MRI cash price and LA General's file is saved) | Live, local, real data | 2h |
| D | D1 The redline view, hand-designed in Paper | Design-prize hero | 2.5h |
| D | D2 Share card and Polar pricing page | Launchable business (Commit Fellowship) | 1.5h |

**Roles (brief, before the demo change):**
- **A, Conversation and actions:** chat flow; approval card; letter generation (Gemini) and send to test inbox; outbound call (Photon plus ElevenLabs) and transcript card; Fetch adapter if gate passes; Fetch submission. Tracks: Fetch, Photon, ElevenLabs, Gemini.
- **B, Bill intelligence:** repo, Better Auth, evlog, Sentry, first Vercel preview; photo to Bill JSON with step-5-preview plus text input; rules engine (duplicates, units, bill vs EOB, published price); savings math with tiers; oRPC routes and Drizzle schema. Tracks: StepFun, Sentry, Tiger Data, Vercel.
- **C, Real data and evidence:** 10 synthetic bills with seeded errors plus EOBs; rule tables with sources; wording rules; Browser Use capture of a real hospital's price file and assistance policy; financial-assistance screener; measured evaluation numbers. Tracks: Browser Use, Applied Intelligence. **Now also demo lead** (moved from D).
- **D, Experience:** visual identity and mobile frames in Paper; case page (savings bar, flag list, evidence bottom sheet); upload screen with camera. **Now builds to freeze**, owns landing pages (consumer and insurance-facing), onboarding UI, unified shadcn design system, GoDaddy domain. Tracks: Paper, GoDaddy, Polar, Commit.

**Roadmap (clock time, PDT):**
| Time | A | B | C | D |
|---|---|---|---|---|
| Sat 14:40 to 16:00 Foundation | Chat flow skeleton; Fetch hello-world (gate test) | Scaffold, env, Better Auth, evlog, Sentry, first Vercel preview on a phone | Contracts written; first 3 synthetic bills | Visual direction and mobile frames in Paper |
| 16:00 G0 | Phone loads preview; contracts in repo. Fetch gate by 17:00 or drop Fetch | | | |
| 16:00 to 20:00 Core loop | Paste bill, confirm lines, see flags | Text parsing to Bill JSON; duplicate and unit rules; savings math | 10 synthetic bills and EOBs; rule table with sources | Case page with savings bar and flag list |
| 20:00 G1 | Paste a bill, see flags with evidence on a phone. Push. Show at 2 to 3 booths | | | |
| 20:00 to 00:00 Action loop | Dispute letter; approval card; send to test inbox | Photo reading with step-5-preview; bill-vs-EOB rule; traces | Browser Use capture of one real hospital's price file and assistance policy | Approval sheet, evidence sheet, upload screen with camera |
| 00:00 G2 | Minimum shippable: photo in, flags, letter approved and sent. Strengthening starts only after this | | | |
| 00:00 to 03:00 Hero and pick-ones | Call flow, or A1/A2 | Published-price rule; cached runs; B1/B2 | Assistance screener; evaluation numbers; C1/C2 | D1/D2, landing pages |
| 03:00 to 07:00 | Sleep in two shifts; one person keeps the app healthy | | | |
| Sun 07:00 to 09:00 Proof and polish | One real call placed and transcribed (or labelled recording) | Reliability pass | Final numbers; README facts; video; rehearse twice | Final polish, screenshots |
| 09:00 Freeze | Fixes only. Devpost by 10:30. Fetch submission by 11:30 if in. Opt into every qualifying track. Judging 12:30 | | | |

Cut order if behind: spoken summary, then live call (use a labelled recording), then published-price comparison, then redline polish, then assistance screener (keep the policy quote). Never cut: photo to confirmed lines, at least three rule levers with evidence, one letter, Sentry traces.

**Prize tracks (from the brief; Fetch amounts are the team's figures, not independently verified here):**
| Track | Prize | What earns it | Role | Fit |
|---|---|---|---|---|
| Applied Intelligence | Not listed | Healthcare named; one user, measured result | C | A |
| Fetch.ai | $1,500 / $1,000 / $500 (team figure) | Whole flow in ASI:One, only if 17:00 gate passes | A | A- |
| Photon | Not shown | Agent calls billing, texts reminders | A | A- |
| StepFun | Not shown | step-5-preview reads photo; user confirms and edits | B | B+ |
| Sentry | Interview per member | Tracing, Logs, AI agent monitoring; one bug found via trace | B | B+ |
| Browser Use | Not shown | Live capture of a real hospital's public pages | C | B |
| Paper | $1,500 / $1,000 / $500 | Hand-designed redline view (free Pro month, code LAHACKS26) | D | B |
| MLH Gemini | Swag | Letter drafting, statement extraction | A | A- |
| MLH ElevenLabs | Earbuds | Voice on the call | A | B+ |
| MLH Tiger Data, GoDaddy | Hardware, gift card | Postgres on Tiger Data; a domain | B, D | C+ |
| Commit Fellowship | Interview | Team project, real problem, Polar business model | D | B |
| Skip | | Visa, Base44, Intuit, Workday, Solana, Vultr, hardware, Devin | n/a | D |
