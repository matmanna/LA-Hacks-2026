# BetterBill

**Your billing advocate for hospital bills.** Snap a photo of the bill. BetterBill reads every line, shows what looks wrong with the proof behind it, checks if you qualify for free or cheaper care, drafts the letter and the call, and acts only after you approve.

Built in 24 hours at LA Hacks 2026. Free to check. [Live app](https://betterbill.matmanna.dev) · [Demo video](https://vimeo.com/matmanna/betterbillgg) · [Try the sample bill](https://betterbill.matmanna.dev/check)

<a href="https://vimeo.com/matmanna/betterbillgg">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/trailer-thumbnail.jpg">
    <source media="(prefers-color-scheme: light)" srcset="docs/screenshots/trailer-thumbnail-light.jpg">
    <img src="docs/screenshots/trailer-thumbnail-light.jpg" alt="Watch the BetterBill demo walkthrough on Vimeo (2:56)">
  </picture>
</a>

▶ **[Watch the trailer on Vimeo (2:56)](https://vimeo.com/matmanna/betterbillgg)** · [download the MP4](betterbill-demo.mp4)

> All bills in this repo and the demo are synthetic. Hospital prices, policies and laws are real public sources, captured with dates and hashes. BetterBill is informational, not legal or medical advice.

---

## Why this matters

| | | Source |
|---|---|---|
| **6 in 10** | adults with health care debt cut back on food, clothing and basic household items (63%)[^kff-debt] | [KFF Health Care Debt Survey](https://www.kff.org/health-costs/issue-brief/kff-health-care-debt-survey/), Jun 16, 2022 |
| **$220 billion** | at least this much medical debt is owed by people in the U.S.[^peterson] | [Peterson-KFF Health System Tracker](https://www.kff.org/health-costs/issue-brief/the-burden-of-medical-debt-in-the-united-states/), Feb 12, 2024 |
| **45%** | "Close to half (45%) of insured adults ages 19 to 64 got a medical bill in the past year they thought insurance should have covered."[^cf] | Commonwealth Fund Health Care Affordability Survey 2023 (n = 5,602), [published Aug 1, 2024](https://www.commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf) |
| **Up to 80%** | of medical bills contain errors, billing advocates estimate. The AMA put it at 7.1% of paid claims in 2013.[^cnbc] | CNBC, Mar 27, 2016 ([republished by NBC News](https://www.nbcnews.com/business/consumer/it-s-time-get-second-opinion-paying-medical-bill-n545626)) |

Checking a bill takes knowledge of codes, unit limits, price files, charity care law and the patience to call. BetterBill does that work and shows its work.

## How it works

| Step | What happens | Built with |
|---|---|---|
| **1. Snap** | Photo (up to 3 pages) or pasted text. The model only transcribes. It never does math. | StepFun `step-5-preview`, deterministic text parser, Gemini cleanup |
| **2. Confirm** | "Did we read your bill right?" then "Did you get all of these?" You fix misreads and mark services you never got. | Web and native confirm flows |
| **3. Proof** | A deterministic rules engine checks duplicates, units against CMS limits[^mue], bill vs EOB, the hospital's own published price, missing itemization and "not received". Every flag carries an evidence tier and a source. | `packages/core` (pure TypeScript, unit tested) |
| **4. Help paying** | Screens 8 checks: the hospital's assistance policy, state charity care law (9 jurisdictions)[^states], collection limits, 501(r)[^fed], No Surprises Act[^fed], Medicare itemized rights[^fed], insurance applied, income vs 2026 poverty guidelines[^fpl]. If the policy is not on file, a Browser Use agent finds it live. | `packages/core/src/assistance`, Browser Use |
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
| **$1,916.85** | less than billed on the $12,000 sample bill SB-01: $1,756.85 MRI above Cedars-Sinai's published cash price[^cedars], $84.00 duplicate blood count, $76.00 extra blood draws | `audit.run` on [`SB-01`](data/synthetic/bills/SB-01.json); price from [`capture.json`](data/hospitals/cedars-sinai/capture.json) |
| **1 of 3** | in-scope reporter findings caught on 5 recreated KFF Health News "Bill of the Month" cases[^botm] (1 of 13 overall; the rest are outside what a bill checker can see) | `results.json`, [`data/benchmark/botm`](data/benchmark/botm) |
| **12 of 12** | synthetic bills screened for assistance, 8 checks each, 28 of 28 "may help" findings cite their source | [`data/eval/assistance.json`](data/eval/assistance.json), Oct 18, 2026 |

Honest limits: the team planted the seeded errors, so 22 of 22 shows the rules work as designed, not real-world accuracy. The Bill of the Month number shows what we miss. There is no ground truth for who qualifies for assistance; the hospital decides, so every assistance result is labelled an estimate.

## Track: Applied Intelligence

| What it asks | What we built | Where we go further |
|---|---|---|
| A real problem, a working product, a measured result | End to end bill check on web and phone: photo in, proof, assistance, letter, live call, shareable packet[^track] | We publish our misses (Bill of the Month 1 of 3) and keep every claim sourced |

## Challenges

"Not verified live" means the code and tests exist but this README does not claim a live run.

| Challenge | What it asks | What we built | Where we go further |
|---|---|---|---|
| **StepFun** | `step-5-preview` at runtime; reliability; user understanding and control | Bill photo reader with per-line confidence and a total reconciliation check; patient confirms or fixes every line[^stepfun] | Measured across 5 photo conditions; saved readings (`cache_first`) keep the demo working if the model is slow; reconciliation caught 4 of 7 imperfect reads |
| **Sentry** | Tracing, Logs, AI agent monitoring | Browser to server traces, `orpc.*` and hero-path spans, structured logs, Session Replay, browser profiling, `gen_ai` spans for StepFun and Gemini grouped by case[^sentry] | No bill text, prompts, images or model output on any span, and a test proves it ([`aiSpan.test.ts`](packages/api/src/aiSpan.test.ts)); replay blocks bill content |
| **Browser Use** | An agent on real public pages, structured output, used in the product | Captured Cedars-Sinai and UCLA price files and assistance policies; in-app live lookup of a missing hospital policy, with a view-only "Watch the agent" link[^browseruse] | Agent quotes are kept only if they appear word for word in the downloaded PDF (11 kept, 4 dropped for UCLA); the found policy feeds the screener right away |
| **Photon** | Use Photon to reach people | Approved letters go out through the Photon email API; calls ride a Photon SIP trunk imported into ElevenLabs[^photon] | Stable idempotency keys on retries; sends only to an allowlist, only after approval. Live calls over the Photon line verified; email inbox delivery not verified live |
| **ElevenLabs** | ElevenLabs is load-bearing | Conversational AI agent places the billing call, then `call.status` pulls the transcript and a structured outcome (reference number, next step, follow-up date)[^elevenlabs] | Disclosure first, at most 3 items, no codes or ids spoken; script is rebuilt and compared to the approved one before dialing; 3 calls per 10 minutes. Live calls verified |
| **Gemini** | Gemini is load-bearing | Drafts every letter from the flags; cleans up pasted text when the parser misses more than 30% of rows[^gemini] | A claim checker rejects any dollar amount Gemini did not get from the bill or the evidence; measured 4.1 to 5.4 s per letter on 4 bills (#84) |
| **Tiger Data (MLH)** | Use Tiger Data as BetterBill's server-side system of record | The API persists cases, bills, itemized lines, EOBs, evidence-backed flags, actions, hospital price/policy captures and the append-only case event log in PostgreSQL through Drizzle[^tiger] | The web and phone clients never connect to the database directly. Local development and pull-request CI use disposable Timescale/Postgres containers; a `main`-only CI job can run migrations against a shared Tiger Data URL supplied as the `DATABASE_URL_SHARED` secret. The repository does not expose deployment secrets, so a live production connection is supported by configuration but is not claimed as verified here |
| **Paper** | Design fundamentals and craft | One design for web, iOS and Android, designed in Paper; the phone app was built frame by frame from it[^paper] | Shared tokens on web and native: ink balance card, mint savings, cobalt actions, Instrument Serif; tier badges never rely on color alone |

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
- **Assistance:** screener over captured hospital policies, federal rules and 8 states (CA, NY, WA, MD, IL, CO, OR, MA)[^states], 29 rules with citations and verbatim quotes; income is asked as a range and never stored (#89, #93, #95, #101).
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
| Ask, don't accuse | CMS allows up to 4 blood counts a day[^mue], so a repeat line is a question for billing, not a verdict. `bun run copy:check` flags banned wording |
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
data/           Synthetic bills, Bill of the Month cases, hospital captures, regulations, eval results, wording rules
```

### Tiger Data connection model

BetterBill's application server creates the Drizzle client from the server-only `DATABASE_URL`. It stores the durable case state and audit history there; clients call the typed API and never receive database credentials. For development, `docker compose` starts a local Timescale/Postgres instance. Pull requests run migrations and integration tests against a fresh CI service container. On pushes to `main`, the `migrate-shared` workflow migrates the shared database only when GitHub's `DATABASE_URL_SHARED` secret is configured. That workflow is the repository's evidence of shared-database support; whether the currently deployed app is connected to a live Tiger Data instance depends on its private Vercel environment variables and is not verifiable from this repository.

Rules for contributors: business logic in `packages/core`, thin routers, money in integer cents, no keys in client code. See [AGENTS.md](AGENTS.md) and [docs/plans/00-shared-context.md](docs/plans/00-shared-context.md).

## Run it locally

Needs Bun 1.3.12+ and Docker. Python 3.11 and uv only for the capture scripts.

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


## Works cited

Entries are numbered, and the footnotes above point to them by number. Law, price file and benchmark links were checked in October 2026 (access dates are in the files under `data/`).

1. ASPE, U.S. Department of Health and Human Services. "Poverty Guidelines." <https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines>
2. California Legislature. Health and Safety Code sections [127400](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=127400), [127405](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=127405) and [127425](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=127425).
3. Centers for Medicare & Medicaid Services. "Medicare NCCI Medically Unlikely Edits." <https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits>. Table: Facility Outpatient Hospital Services, effective Oct 1, 2026 (<https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip>).
4. Commonwealth Fund. Press release on the 2023 Health Care Affordability Survey (Gupta), Aug 1, 2024. <https://www.commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf>
5. CNBC. Report on medical bill errors, Mar 27, 2016, republished by NBC News: "It's time to get a second opinion before paying a medical bill." <https://www.nbcnews.com/business/consumer/it-s-time-get-second-opinion-paying-medical-bill-n545626>
6. KFF Health News. "Bill of the Month" series: surgery center billed one operation as two, Aug 21, 2024. <https://kffhealthnews.org/health-care-costs/bill-of-the-month-one-surgery-charged-for-two-collections-lawsuit/>
7. KFF Health News. "Bill of the Month": ER charge after leaving before being seen, Sep 29, 2026. <https://kffhealthnews.org/health-care-costs/emergency-room-not-treated-still-charged-illinois-bill-of-the-month-september-2026/>
8. KFF Health News. "Bill of the Month": critical care codes for a short ER stay, Apr 28, 2026. <https://kffhealthnews.org/health-industry/er-monitoring-anaphylactic-shock-allergic-reaction-bill-of-the-month-april-2026/>
9. KFF Health News. "Bill of the Month": full list price billed for a PET scan with a lower cash rate, Mar 3, 2026. <https://kffhealthnews.org/health-care-costs/insurers-pay-high-prices-premiums-coinsurance-cost-control-inflation-patients/>
10. KFF Health News. "Bill of the Month": four surgical screws billed at $15,076, May 14, 2018. <https://kffhealthnews.org/health-industry/sticker-shock-jolts-oklahoma-patient-15076-for-four-tiny-screws/>
11. CMS. "Medical Bill Rights." <https://www.cms.gov/medical-bill-rights>
12. Colorado Department of Health Care Policy and Financing. "Colorado Hospital Discounted Care." <https://hcpf.colorado.gov/colorado-hospital-discounted-care>
13. Cornell Legal Information Institute. 42 U.S.C. 300gg-111 (No Surprises Act). <https://www.law.cornell.edu/uscode/text/42/300gg-111>
14. KFF. "KFF Health Care Debt Survey," Jun 16, 2022. <https://www.kff.org/health-costs/issue-brief/kff-health-care-debt-survey/>
15. Cornell Legal Information Institute. 42 U.S.C. 1395b-7 (Medicare itemized statements). <https://www.law.cornell.edu/uscode/text/42/1395b-7>
16. Illinois Health Care Report Card. "Hospital Uninsured Patient Discount Act." <https://healthcarereportcard.illinois.gov/hospital-uninsured-patient-discount-act>
17. Internal Revenue Service. "Requirements for 501(c)(3) Hospitals Under the Affordable Care Act, Section 501(r)," with [limitation on charges, 501(r)(5)](https://www.irs.gov/charities-non-profits/limitation-on-charges-section-501r5) and [billing and collections, 501(r)(6)](https://www.irs.gov/charities-non-profits/billing-and-collections-section-501r6). <https://www.irs.gov/charities-non-profits/charitable-organizations/requirements-for-501c3-hospitals-under-the-affordable-care-act-section-501r>
18. Maryland General Assembly. Health-General section 19-214.1 (2026 session). <https://mgaleg.maryland.gov/2026RS/Statute_Web/ghg/19-214.1.pdf>
19. Massachusetts. "Health Safety Net for patients." <https://www.mass.gov/info-details/health-safety-net-for-patients>
20. Peterson-KFF Health System Tracker. "The burden of medical debt in the United States," Feb 12, 2024. <https://www.kff.org/health-costs/issue-brief/the-burden-of-medical-debt-in-the-united-states/>
21. Cedars-Sinai Medical Center. Standard charges file (machine-readable price file). <https://www.cedars-sinai.org/content/dam/cedars-sinai/billing-insurance/documents/951644600_CEDARS-SINAI-MEDICAL-CENTER_standardcharges.json>, listed at <https://www.cedars-sinai.org/cms-hpt.txt>. Captured with date and hash in [`capture.json`](data/hospitals/cedars-sinai/capture.json).
22. Cedars-Sinai Medical Center. "Price transparency." <https://cedars-sinai.org/price-transparency.html>
23. UCLA Health. Ronald Reagan UCLA Medical Center [standard charges](https://www.uclahealth.org/sites/default/files/cms-hpt/956006143_ronald-reagan-ucla-medical-center_standardcharges.json) and [machine-readable files page](https://www.uclahealth.org/patient-resources/billing-insurance/price-transparency/machine-readable-files).
24. New York State Senate. Public Health Law section 2807-k. <https://www.nysenate.gov/legislation/laws/PBH/2807-K>; Oregon Legislature. ORS chapter 442. <https://www.oregonlegislature.gov/bills_laws/ors/ors442.html>; Washington State Legislature. RCW 70.170.060. <https://app.leg.wa.gov/RCW/default.aspx?cite=70.170.060>

## Notes

[^kff-debt]: Works cited 14. Survey of adults with health care debt; 63% cut back on food, clothing and basic household items.
[^peterson]: Works cited 20. Peterson-KFF estimate of medical debt owed in the U.S.
[^cf]: Works cited 4. Quote is from the press release; survey n = 5,602.
[^cnbc]: Works cited 5. The "up to 80%" figure is billing advocates' estimate as reported by CNBC; the AMA figure is 7.1% of paid claims in 2013.
[^mue]: Works cited 3. CMS NCCI Medically Unlikely Edits, facility outpatient hospital table effective 2026-10-01 (subset in [`data/rules`](data/rules/SOURCES.md)).
[^states]: Works cited 2, 12, 16, 18, 19, 24. State and federal rules with section numbers are in [`data/regulations`](data/regulations).
[^fed]: Works cited 11, 13, 15, 17. 501(r) and No Surprises Act rules and Medicare itemized-statement rights, with quotes in [`data/regulations/federal.json`](data/regulations/federal.json).
[^fpl]: Works cited 1. 2026 poverty guidelines, copied into [`data/hospitals/fpl-2026.json`](data/hospitals/fpl-2026.json).
[^botm]: Works cited 6 to 10. Recreated cases are in [`data/benchmark/botm`](data/benchmark/botm).
[^cedars]: Works cited 21 and 22. Price file captured with date and SHA-256 in [`capture.json`](data/hospitals/cedars-sinai/capture.json).
[^track]: This README's [measured results](#what-we-measured); 89 merged PRs.
[^stepfun]: [`reader/stepfun.ts`](packages/api/src/reader/stepfun.ts), #53, #58; 88.8% line recall, p50 26.2 s on 35 photos.
[^sentry]: [`docs/SENTRY.md`](docs/SENTRY.md), [`docs/OBSERVABILITY.md`](docs/OBSERVABILITY.md), #59, #68, #69.
[^browseruse]: #15, #41, #98, #99; Cedars-Sinai price file 883,973,507 bytes, SHA-256 in [`capture.json`](data/hospitals/cedars-sinai/capture.json); UCLA policy run 145 s, $0.033.
[^photon]: [`services/email.ts`](packages/api/src/services/email.ts), [`services/call.ts`](packages/api/src/services/call.ts), #67.
[^elevenlabs]: [`services/elevenlabs.ts`](packages/api/src/services/elevenlabs.ts), [`call-outcome.ts`](packages/api/src/services/call-outcome.ts), #49.
[^gemini]: [`services/gemini.ts`](packages/api/src/services/gemini.ts), [`letter-drafter.ts`](packages/api/src/services/letter-drafter.ts), #40, #84.
[^tiger]: [`packages/db`](packages/db), CI job `migrate-shared` in [`ci.yml`](.github/workflows/ci.yml) (green on the latest `main` run).
[^paper]: #72 to #88 (native), #56 (OG images from Paper), [`/design`](apps/web/src/routes/design.tsx) gallery.

## Team

[@matmanna](https://github.com/matmanna) · [@sdrucquer](https://github.com/sdrucquer) · [@AbhinavDasari-pennstate](https://github.com/AbhinavDasari-pennstate) · [@vs-githjk](https://github.com/vs-githjk)

Built from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack). Product names and logos belong to their owners; their use here means "built with", not partnership.
