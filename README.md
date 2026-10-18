# BetterBill

**Your billing advocate for hospital bills.** Snap a photo of the bill. BetterBill reads every line, shows what looks wrong with the proof behind it, checks if you qualify for free or cheaper care, drafts the letter and the call, and acts only after you approve.

Built in 24 hours at LA Hacks 2026. Free to check. [Live app](https://betterbill.matmanna.dev) · [Demo video](https://vimeo.com/matmanna/betterbillgg) · [Try the sample bill](https://betterbill.matmanna.dev/check)

[![Watch the BetterBill trailer on Vimeo (2:56)](docs/screenshots/trailer-thumbnail.jpg)](https://vimeo.com/matmanna/betterbillgg)

▶ **[Watch the trailer on Vimeo (2:56)](https://vimeo.com/matmanna/betterbillgg)** · [download the MP4](betterbill-demo.mp4)

> All bills in this repo and the demo are synthetic. Hospital prices, policies and laws are real public sources, captured with dates and hashes. BetterBill is informational, not legal or medical advice.

---

## Why this matters

| | | Source |
|---|---|---|
| **6 in 10** | adults with health care debt cut back on food, clothing and basic household items (63%) | [KFF Health Care Debt Survey](https://www.kff.org/health-costs/issue-brief/kff-health-care-debt-survey/), Jun 16, 2022 |
| **$220 billion** | at least this much medical debt is owed by people in the U.S. | [Peterson-KFF Health System Tracker](https://www.kff.org/health-costs/issue-brief/the-burden-of-medical-debt-in-the-united-states/), Feb 12, 2024 |
| **45%** | "Close to half (45%) of insured adults ages 19 to 64 got a medical bill in the past year they thought insurance should have covered." | Commonwealth Fund Health Care Affordability Survey 2023 (n = 5,602), [published Aug 1, 2024](https://www.commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf) |
| **Up to 80%** | of medical bills contain errors, billing advocates estimate. The AMA put it at 7.1% of paid claims in 2013. | CNBC, Mar 27, 2016 ([republished by NBC News](https://www.nbcnews.com/business/consumer/it-s-time-get-second-opinion-paying-medical-bill-n545626)) |

Checking a bill takes knowledge of codes, unit limits, price files, charity care law and the patience to call. BetterBill does that work and shows its work.

## How it works

| Step | What happens | Built with |
|---|---|---|
| **1. Snap** | Photo (up to 3 pages) or pasted text. The model only transcribes. It never does math. | StepFun `step-5-preview`, deterministic text parser, Gemini cleanup |
| **2. Confirm** | "Did we read your bill right?" then "Did you get all of these?" You fix misreads and mark services you never got. | Web and native confirm flows |
| **3. Proof** | A deterministic rules engine checks duplicates, units against CMS limits, bill vs EOB, the hospital's own published price, missing itemization and "not received". Every flag carries an evidence tier and a source. | `packages/core` (pure TypeScript, unit tested) |
| **4. Help paying** | Screens 8 checks: the hospital's assistance policy, state charity care law (9 jurisdictions), collection limits, 501(r), No Surprises Act, Medicare itemized rights, insurance applied, income vs 2026 poverty guidelines. If the policy is not on file, a Browser Use agent finds it live. | `packages/core/src/assistance`, Browser Use |
| **5. Act** | Gemini drafts the letter. The call has a goal and a script. You approve once, and the approval is saved with a hash of the exact text. Then email goes out and the advocate calls billing. | Gemini, Photon, ElevenLabs |
| **6. Follow** | Case timeline, evidence packet you can share with family, a lawyer or a doctor, and "What we did for you". | Postgres on Tiger Data, Sentry |

Evidence tiers, shown with an icon and a label on every amount: **Confirmed from your bill**, **Billing rule**, **Hospital's published price**, **Estimate**, **You told us**.

## What we measured

Measured, not promised. Every number comes from a file in this repo, with the date it was run.

| Result | What it means | Source |
|---|---|---|
| **22 of 22** | seeded errors caught on 11 synthetic bills (duplicate 4/4, units 5/5, bill vs EOB 2/2, published price 10/10, missing itemization 1/1) | [`data/eval/results.json`](data/eval/results.json), run 2026-10-18 03:35 UTC |
| **0** | false flags on the 3 clean bills | same |
| **22 / 22** | precision: every flag raised was a planted error | same |
| **0.012 ms** | audit time, p50 (20 runs per bill) | same |
| **88.8%** | line recall on 35 phone photos of printed synthetic bills (flat, angled, crumpled, dim, dim and angled); 28 of 35 read perfectly | [`data/eval/extraction.json`](data/eval/extraction.json), Oct 17, 2026 |
| **26.2 s** | photo to lines, p50 (p90 58.3 s), live `step-5-preview` | same |
| **$1,916.85** | less than billed on the $12,000 sample bill SB-01: $1,756.85 MRI above Cedars-Sinai's published cash price, $84.00 duplicate blood count, $76.00 extra blood draws | `audit.run` on [`SB-01`](data/synthetic/bills/SB-01.json); price from [`capture.json`](data/hospitals/cedars-sinai/capture.json) |
| **1 of 3** | in-scope reporter findings caught on 5 recreated KFF Health News "Bill of the Month" cases (1 of 13 overall; the rest are outside what a bill checker can see) | `results.json`, [`data/benchmark/botm`](data/benchmark/botm) |
| **12 of 12** | synthetic bills screened for assistance, 8 checks each, 28 of 28 "may help" findings cite their source | [`data/eval/assistance.json`](data/eval/assistance.json), Oct 18, 2026 |

Honest limits: the team planted the seeded errors, so 22 of 22 shows the rules work as designed, not real-world accuracy. The Bill of the Month number shows what we miss. There is no ground truth for who qualifies for assistance; the hospital decides, so every assistance result is labelled an estimate.

## Track: Applied Intelligence

| What it asks | What we built | Proof | Where we go further |
|---|---|---|---|
| A real problem, a working product, a measured result | End to end bill check on web and phone: photo in, proof, assistance, letter, live call, shareable packet | This README's [measured results](#what-we-measured); 89 merged PRs | We publish our misses (Bill of the Month 1 of 3) and keep every claim sourced |

## Challenges

"Not verified live" means the code and tests exist but this README does not claim a live run.

| Challenge | What it asks | What we built | Proof | Where we go further |
|---|---|---|---|---|
| **StepFun** | `step-5-preview` at runtime; reliability; user understanding and control | Bill photo reader with per-line confidence and a total reconciliation check; patient confirms or fixes every line | [`reader/stepfun.ts`](packages/api/src/reader/stepfun.ts), #53, #58; 88.8% line recall, p50 26.2 s on 35 photos | Measured across 5 photo conditions; saved readings (`cache_first`) keep the demo working if the model is slow; reconciliation caught 4 of 7 imperfect reads |
| **Sentry** | Tracing, Logs, AI agent monitoring | Browser to server traces, `orpc.*` and hero-path spans, structured logs, Session Replay, browser profiling, `gen_ai` spans for StepFun and Gemini grouped by case | [`docs/SENTRY.md`](docs/SENTRY.md), [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md), #59, #68, #69 | No bill text, prompts, images or model output on any span, and a test proves it ([`aiSpan.test.ts`](packages/api/src/aiSpan.test.ts)); replay blocks bill content |
| **Browser Use** | An agent on real public pages, structured output, used in the product | Captured Cedars-Sinai and UCLA price files and assistance policies; in-app live lookup of a missing hospital policy, with a view-only "Watch the agent" link | #15, #41, #98, #99; Cedars-Sinai price file 883,973,507 bytes, SHA-256 in [`capture.json`](data/hospitals/cedars-sinai/capture.json); UCLA policy run 145 s, $0.033 | Agent quotes are kept only if they appear word for word in the downloaded PDF (11 kept, 4 dropped for UCLA); the found policy feeds the screener right away |
| **Photon** | Use Photon to reach people | Approved letters go out through the Photon email API; calls ride a Photon SIP trunk imported into ElevenLabs | [`services/email.ts`](packages/api/src/services/email.ts), [`services/call.ts`](packages/api/src/services/call.ts), #67 | Stable idempotency keys on retries; sends only to an allowlist, only after approval. Live calls over the Photon line verified; email inbox delivery not verified live |
| **ElevenLabs** | ElevenLabs is load-bearing | Conversational AI agent places the billing call, then `call.status` pulls the transcript and a structured outcome (reference number, next step, follow-up date) | [`services/elevenlabs.ts`](packages/api/src/services/elevenlabs.ts), [`call-outcome.ts`](packages/api/src/services/call-outcome.ts), #49 | Disclosure first, at most 3 items, no codes or ids spoken; script is rebuilt and compared to the approved one before dialing; 3 calls per 10 minutes. Live calls verified |
| **Gemini** | Gemini is load-bearing | Drafts every letter from the flags; cleans up pasted text when the parser misses more than 30% of rows | [`services/gemini.ts`](packages/api/src/services/gemini.ts), [`letter-drafter.ts`](packages/api/src/services/letter-drafter.ts), #40, #84 | A claim checker rejects any dollar amount Gemini did not get from the bill or the evidence; measured 4.1 to 5.4 s per letter on 4 bills (#84) |
| **Tiger Data (MLH)** | Postgres on Tiger Data, actually used | Cases, bills, flags, actions and an append-only case event log | [`packages/db`](packages/db), CI job `migrate-shared` in [`ci.yml`](.github/workflows/ci.yml) (green on the latest `main` run) | Schema changes reach the shared database only through committed migrations run by CI on `main` |
| **Vercel** | Deployed on Vercel | One Vercel project (Services config, TanStack Start) with per-PR previews | [`vercel.json`](vercel.json), [betterbill.matmanna.dev](https://betterbill.matmanna.dev) | Env sync scripts for preview and production; OG images and manifest (#56, #91) |
| **Paper** | Design fundamentals and craft | One design for web, iOS and Android, designed in Paper; the phone app was built frame by frame from it | #72 to #88 (native), #56 (OG images from Paper), [`/design`](apps/web/src/routes/design.tsx) gallery | Shared tokens on web and native: ink balance card, mint savings, cobalt actions, Instrument Serif; tier badges never rely on color alone |

## Screens

All web captures are from the latest `main` (sample bill SB-01, synthetic) at 390 x 844 and 1440 x 900.

### Web, phone

| Landing | Check a bill | Confirm lines | Results |
|---|---|---|---|
| <img src="docs/screenshots/web-phone-landing.jpg" width="200" alt="Landing page on a phone"> | <img src="docs/screenshots/web-phone-check.jpg" width="200" alt="Check a bill"> | <img src="docs/screenshots/web-phone-confirm.jpg" width="200" alt="Confirm lines"> | <img src="docs/screenshots/web-phone-results.jpg" width="200" alt="Results with flags"> |

| Evidence | Approval | Activity | Evidence packet |
|---|---|---|---|
| <img src="docs/screenshots/web-phone-evidence-units.jpg" width="200" alt="Evidence sheet for the units flag"> | <img src="docs/screenshots/web-phone-approval.jpg" width="200" alt="Approval sheet with the exact letter"> | <img src="docs/screenshots/web-phone-activity.jpg" width="200" alt="Case activity timeline"> | <img src="docs/screenshots/web-phone-packet.jpg" width="200" alt="Shared evidence packet"> |

| Packet: help paying | For plans |
|---|---|
| <img src="docs/screenshots/web-phone-packet-help.jpg" width="200" alt="Packet help paying section"> | <img src="docs/screenshots/web-phone-for-plans.jpg" width="200" alt="For plans landing page"> |

### Web, desktop

| Landing | Results, full insights |
|---|---|
| <img src="docs/screenshots/web-desktop-landing.jpg" width="420" alt="Landing page on desktop"> | <img src="docs/screenshots/web-desktop-results.jpg" width="420" alt="Results with bill table"> |

| Check a bill | Confirm lines |
|---|---|
| <img src="docs/screenshots/web-desktop-check.jpg" width="420" alt="Check a bill on desktop"> | <img src="docs/screenshots/web-desktop-confirm.jpg" width="420" alt="Confirm lines on desktop"> |

| Evidence | Approval |
|---|---|
| <img src="docs/screenshots/web-desktop-evidence-units.jpg" width="420" alt="Evidence side sheet"> | <img src="docs/screenshots/web-desktop-approval.jpg" width="420" alt="Approval dialog"> |

| Activity | Evidence packet |
|---|---|
| <img src="docs/screenshots/web-desktop-activity.jpg" width="420" alt="Activity timeline on desktop"> | <img src="docs/screenshots/web-desktop-packet.jpg" width="420" alt="Evidence packet on desktop"> |

| For plans |
|---|
| <img src="docs/screenshots/web-desktop-for-plans.jpg" width="420" alt="For plans landing on desktop"> |

### Phone app (Expo, iOS and Android)

Captured in Expo web at 390 x 844 from the latest `main` against a local API.

| Scan | Did we read it right? | Did you get these? | Results |
|---|---|---|---|
| <img src="docs/screenshots/native-scan.jpg" width="200" alt="Scan screen"> | <img src="docs/screenshots/native-confirm.jpg" width="200" alt="Confirm reading step"> | <img src="docs/screenshots/native-care.jpg" width="200" alt="Care received step"> | <img src="docs/screenshots/native-results.jpg" width="200" alt="Results"> |

| Flag detail | Bills (home) | What we did for you |
|---|---|---|
| <img src="docs/screenshots/native-flag.jpg" width="200" alt="Flag detail"> | <img src="docs/screenshots/native-home.jpg" width="200" alt="Home with tab bar"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/9-receipt.jpg?raw=true" width="200" alt="What we did for you receipt"> |

Free or cheaper care (from #96 and #99):

| Free care card | Questions | Live rule checklist | Result |
|---|---|---|---|
| <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/1-results-card.jpg?raw=true" width="200" alt="Free care card on results"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/2-questions.jpg?raw=true" width="200" alt="Household and income questions"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/4-checklist-done.jpg?raw=true" width="200" alt="Rule checklist"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/5-result.jpg?raw=true" width="200" alt="May qualify for free care"> |

| Share sheet | Policy lookup running | Lookup steps | Policy found |
|---|---|---|---|
| <img src="https://github.com/matmanna/betterbill/blob/c/screens/assist/6-share-sheet.jpg?raw=true" width="200" alt="Share sheet"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/lookup/1-checklist-looking-up.jpg?raw=true" width="200" alt="Checklist looking up policy"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/lookup/3-bill-progress.jpg?raw=true" width="200" alt="Browser Use lookup steps"> | <img src="https://github.com/matmanna/betterbill/blob/c/screens/lookup/4-bill-found.jpg?raw=true" width="200" alt="Policy found"> |

## Feature map

- **Reading:** photo (StepFun, 1 to 3 pages, per-line confidence, totals reconciled), pasted text (deterministic parser, Gemini cleanup fallback), saved readings for known photos, summary bills routed to "ask for your itemized bill" on the same case (#53, #14, #58, #82, #86, #87).
- **Rules:** duplicate, units vs CMS MUE, bill vs EOB, hospital's published price, missing itemization, patient-reported "not received" (#12, #21, #85). Savings and balance math in integer cents; the UI never computes money.
- **Assistance:** screener over captured hospital policies, federal rules and 8 states (CA, NY, WA, MD, IL, CO, OR, MA), 29 rules with citations and verbatim quotes; income is asked as a range and never stored (#89, #93, #95, #101).
- **Live agent:** Browser Use finds a missing hospital policy in the background, shows each step, and sends a local reminder when it is ready (#98, #99).
- **Actions:** Gemini letter with a claim checker, call script with a goal, one approval with consent, email via Photon, call via ElevenLabs on a Photon line, transcript and outcome card (#40, #47, #48, #49, #67, #84).
- **Sharing:** evidence packet link with sources, SHA-256 hashes, status in plain words and the free care result; print or save as PDF; revocable; redacted (#62, #78, #97).
- **Accounts:** check without an account; an anonymous session moves to your account when you sign up (#60). Better Auth on web and native.
- **Plans and employers:** `/for-plans` lander with a claim review console, measured results, and bulk checkout (#37, #70, #90).
- **Apps:** TanStack Start web app (mobile first, full insights on desktop) and an Expo app with tabs for Bills, Scan and Account (#66, #72 to #81, #87, #88, #96).

## Key decisions

| Decision | Why |
|---|---|
| The model only transcribes; a deterministic rules engine in pure `packages/core` computes every flag and dollar | Money must be reproducible and testable, never guessed by a model (#12, #53) |
| An evidence tier and a source on every amount | Patients and billing offices can check each claim themselves |
| Ask, don't accuse | CMS allows up to 4 blood counts a day, so a repeat line is a question for billing, not a verdict. `bun run copy:check` flags banned wording |
| An explicit approval event, with a hash of the exact draft, before any email or call | Nothing goes out that the patient did not read; a call is refused if its script no longer matches the approved one (#47, #49, #79) |
| Synthetic bills only; real public prices, policies and laws | No patient data at a hackathon, but real evidence for every comparison |
| Saved photo readings with `cache_first` | Live reads took 10 to 66 s and timed out under load; a labelled saved reading keeps the demo honest and fast (#58, #82) |
| No bill content in Sentry | Traces show timing and outcomes, never bill text, prompts, images or letters, and a test enforces it (#68, #69) |
| Anonymous audit, account to act | Value before sign-up; approving, sending and calling can require an account (`BB_REQUIRE_ACCOUNT`) (#60) |
| The shared packet is redacted | Found in review: a share link exposed ids and a recipient. Now ids are replaced, recipients masked, unapproved drafts and income left out (#78, #97) |
| Shared database changes only through CI migrations | Nobody runs `db:push` against Tiger Data; CI applies committed migrations on `main` |
| Fee only on confirmed savings | We never charge on an estimate (#70) |
| Agent quotes must match the source word for word | A browser agent can misquote; we keep a limit only when a verbatim quote states it (#98) |
| Expo SDK 57, not 58 | The store build of Expo Go only ran SDK 57, so the app opens on any phone without a custom build (#66) |

## What's real, what's in progress

- **Real on `main`:** reading, confirm, rules, savings, assistance screener, live policy lookup, letters, approval, packet, Polar sandbox checkout, Sentry wiring, web and native apps.
- **Verified live:** outbound ElevenLabs calls over the Photon line, after approval.
- **Not verified live in this README:** Photon email delivery to an inbox, a real Polar checkout.
- **Sample call:** on sample bills the phone app replays a scripted call labelled "Sample call" (`DEMO_CALL_SCRIPT` in [`use-call-flow.ts`](apps/native/lib/use-call-flow.ts)); no number is dialled. The call audio in the demo video is an ElevenLabs text-to-speech stand-in.
- **Demo video phone screens:** some are mockups from the team's design file rather than the running app. The screenshots above are the running app.
- **Scheduling a call** ("Pick a time") says coming soon. The app is not in the app stores; it runs in Expo Go.

## Pricing

- **Patients:** free to check. If you choose, BetterBill keeps 10% of savings **confirmed from your bill**, capped at $1,000, nothing on estimates ([`payments.ts`](packages/core/src/payments.ts); demo values).
- **Plans and employers:** bulk bill review for members, with a pilot sign-up on [`/for-plans`](https://betterbill.matmanna.dev/for-plans). Polar runs in sandbox; there is no revenue yet.

## Architecture

```
apps/web        TanStack Start: routes, UI, /api/rpc (oRPC), /api/v1 (OpenAPI adapter), /api/auth
apps/native     Expo Router phone app (same API and auth)
packages/core   Pure TypeScript: schemas, reader output parsing, rules, savings, assistance screener, letters, call script
packages/api    Thin oRPC routers; StepFun, Gemini, Photon, ElevenLabs, Browser Use, Polar clients; Sentry spans
packages/db     Drizzle schema, migrations, seed
packages/ui     shadcn components plus BetterBill components (Money, TierBadge, EvidenceSheet, ApprovalSheet, ...)
agents/         Fetch.ai uAgents adapter (Python, no business logic)
data/           Synthetic bills, Bill of the Month cases, hospital captures, regulations, eval results, wording rules
```

Rules for contributors: business logic in `packages/core`, thin routers, money in integer cents, no keys in client code. See [AGENTS.md](AGENTS.md) and [docs/plans/00-shared-context.md](docs/plans/00-shared-context.md).

## Run it locally

Needs Bun 1.3.12+ and Docker. Python 3.11 and uv only for the Fetch adapter and capture scripts.

```bash
bun install
cp .env.example apps/web/.env     # set BETTER_AUTH_SECRET (32+ chars); never commit this file
docker compose up -d db           # local Postgres (host port 5434 via docker-compose.override.yml; match DATABASE_URL)
bun run db:push                   # local database only, never a shared one
bun run db:seed
bun run dev                       # web app on http://localhost:3001
```

- No model keys? The sample bill and saved photo readings still work. `BB_READER_MODE=cache_only` never calls a model.
- Nothing is emailed or called unless `EMAIL_ALLOWLIST` or `CALL_ALLOWLIST` lists the recipient. `BB_FAKE_PROVIDERS=1` is for tests.
- Variable names and defaults: [`.env.example`](.env.example) and [`apps/web/.env.schema`](apps/web/.env.schema). Native app: [apps/native/README.md](apps/native/README.md).

| Command | What it does |
|---|---|
| `bun run test` / `bun run test:integration` | Unit tests / integration tests against Postgres |
| `bun run check-types`, `bun x biome ci .` | Types, lint and format |
| `bun run e2e` | Playwright specs on a phone and a desktop viewport |
| `bun run eval:all`, `bun run eval:assistance` | Rebuild `data/eval/results.json` and `assistance.json` ([docs/EVAL.md](docs/EVAL.md)) |
| `bun run copy:check`, `bun run data:check` | Wording rules; bundled data matches `data/` |

**Deploy:** Vercel (`bun run deploy`, env sync with `bun run env:preview` or `env:production`). CI on every PR runs Biome, types, unit and integration tests and the build, with `BB_READER_MODE=cache_only`. On `main`, CI applies migrations to the shared Tiger Data database.


## Team

[@matmanna](https://github.com/matmanna) · [@sdrucquer](https://github.com/sdrucquer) · [@AbhinavDasari-pennstate](https://github.com/AbhinavDasari-pennstate) · [@vs-githjk](https://github.com/vs-githjk)

Built from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack). Product names and logos belong to their owners; their use here means "built with", not partnership.
