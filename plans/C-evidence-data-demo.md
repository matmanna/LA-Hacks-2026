# Role C: Evidence, Data, and Demo Lead (BetterBill, LA Hacks AI 2026)

Binding context: `/home/matmanna/projects/lahacks/plans/00-shared-context.md` (wins on any conflict), `/home/matmanna/projects/lahacks/plans/00-team-brief.md`, `/home/matmanna/projects/lahacks/bill-audit-design-doc.md`, `/home/matmanna/projects/lahacks/bill-audit-prd.md`.
Written Sat 2026-10-17 about 15:00 PDT. All clock times are PDT. Research for this plan was done 2026-10-17 between 21:50Z and 22:05Z (14:50 to 15:05 PDT). Anything not confirmed is marked **UNVERIFIED**. No number in this file is invented; every figure has a source or is labelled synthetic.

---

## 1. Role summary

**Mission.** Make every claim BetterBill shows true, sourced, and measured, then turn the product into a 3-minute demo, a video, and a Devpost page that judges believe.

**Two phases.**
- **Evidence (now to about 01:00):** synthetic bills and EOBs with ground truth, rule tables with sources, a real Los Angeles hospital's price file rows and assistance policy captured with Browser Use, assistance screener inputs, the evaluation harness that writes `data/eval/results.json`, wording rules, and verified pitch numbers.
- **Demo (01:00 to 12:30):** script, rehearsal, booth feedback, video, Devpost, slides, Q and A, and submission.

**Tracks C supports.**
| Track | What C delivers | What judges must see |
|---|---|---|
| Applied Intelligence (healthcare) | One named user (a patient with a confusing $12,000 bill), measured recall and false-flag numbers, Bill of the Month benchmark (if C1) | A real user problem, a working product, and a measured result with N and date |
| Browser Use | Live capture of a real LA hospital's price transparency page, machine-readable file link, and financial assistance policy, with capture metadata | The agent navigating real public pages, structured output, and the captured price appearing in the app with source and date |
| All tracks (demo) | Script, video, Devpost, slides | The hero path working end to end, honest claims, every sponsor tool load-bearing |

**What judges need to see (C's checklist).** A real-data moment (hospital's own published price, captured today, with source link). A measured number (never a target). Evidence tiers on every flag. Clear user control (confirm lines, approve every action). Honest comparison with Goodbill. Traces in Sentry.

---

## 2. Role onboarding (15 minutes)

1. **Accounts.** GitHub repo access; Vercel team (view previews); Sentry (view traces for the demo); **Browser Use Cloud**: sign up, create an API key (docs: https://docs.browser-use.com/cloud/agent-signup.md), put it in `.env` as `BROWSER_USE_API_KEY`. New projects get a free allowance per the docs (https://docs.browser-use.com/cloud/guides/concurrency.md); the size is UNVERIFIED, so check the dashboard before running many tasks. Devpost (join the team's project page now, not at 10:00).
2. **Tools.** Bun 1.3.12+, Docker (`docker compose up -d db`), Playwright browsers (`bunx playwright install chromium`), Python 3.11+ with `uv` (for the Browser Use SDK, which is Python: `uv pip install --upgrade browser-use-sdk`), `exiftool` (strip phone photo metadata), `sha256sum`, `jq`. A printer and a phone for photo tests (find the venue printer by 18:00 or use a teammate's).
3. **Repo setup.** Follow shared context 14.1 steps 3 to 5. Read `AGENTS.md`. Branch names `c/<feature>`.
4. **Where data lives.**
| Path | Contents | Owner |
|---|---|---|
| `data/synthetic/bills/SB-XX.json` | Fixture: Bill, EOB, expected flags, context | C |
| `data/synthetic/rendered/SB-XX.png`, `.pdf`, `.html` | Rendered bills | C |
| `data/synthetic/photos/SB-XX-<cond>.jpg` | Printed and phone-photographed, EXIF stripped | C |
| `data/rules/mue-subset.json` | Units bounds with source (new folder; tell B) | C |
| `data/hospitals/<hospitalKey>/capture.json` + raw evidence | Captured price rows, policy quotes, hashes | C |
| `data/hospitals/fpl-2026.json` | HHS poverty guidelines | C |
| `data/benchmark/botm/BOTM-XX.json` | Bill of the Month recreations (C1) | C |
| `data/eval/results.json` | Evaluation output consumed by UI (`eval.results`) and pitch | C |
| `data/copy/wording.json` | Banned words, disclaimers, tier labels, call lines | C |
| `docs/EVAL.md`, `docs/DEMO.md` | Method and demo kit (already in the target layout) | C |

---

## 3. Interfaces (what C produces, for whom, by when)

| For | Artifact | Path | Handoff time |
|---|---|---|---|
| B | Fixture format and demo bill SB-01 | `data/synthetic/bills/SB-01.json` | **16:00 (G0)** |
| B | All 10 fixtures with expected flags | `data/synthetic/bills/*.json` | 18:30 |
| B | Units bounds table with sources | `data/rules/mue-subset.json` | 18:00 |
| B | Rendered PNG/PDF for photo reading tests | `data/synthetic/rendered/` | 19:30 |
| B | Phone photos for extraction eval | `data/synthetic/photos/` | 20:30 |
| B | Captured published prices (demo codes) | `data/hospitals/cedars-sinai/capture.json` | 22:00 |
| B | Assistance policy thresholds and FPL table | `data/hospitals/*/capture.json`, `data/hospitals/fpl-2026.json` | 23:30 |
| A | Letter wording rules, disclaimer, banned words | `data/copy/wording.json` | 19:00 |
| A | Call script lines and judge "billing office" card | `docs/DEMO.md` section "Call" | 23:00 (A1 decision at G2) |
| D | Verified numbers and safe wording (landing, slides) | Section 4 of this file, then `data/copy/wording.json` `facts` | 19:00, final 07:00 |
| D | Sample bill for the "Try a sample bill" button | SB-01 JSON + PNG | 19:30 |
| D | `results.json` for the measured-results card | `data/eval/results.json` | first version 00:30, final 07:00 |
| Everyone | Demo script and run order | `docs/DEMO.md` | 01:30 |

**Contract notes for B (confirm in chat at G0).**
- Fixtures embed the binding `Bill` and `Eob` shapes from shared context section 6 unchanged. Money in integer cents. Times ISO UTC. Line ids are deterministic (`sb01-l05`).
- Expected flags are matched by `lever` plus overlapping `lineIds`, not by `id`, `title`, or `explanation` (B generates those).
- Published prices and policy thresholds are JSON files; B decides whether `packages/core` imports them statically (keeps core pure) or the seed loads them into Postgres.
- C needs from B: the name and signature of the core audit entry point (expected something like `runAudit(bill, { eob, prices, rules })` in `packages/core/src/index.ts`; **confirm**), and whether `bill.parsePhoto` can be called from a Bun script against a local server.

---

## 4. The numbers that matter

### 4.1 Verification table

| # | Claim | Source URL | Verified? | Safe wording for pitch and UI |
|---|---|---|---|---|
| N1 | 45% of insured working-age adults got a bill or copay for a service they thought insurance should cover | Commonwealth Fund news release, Aug 1, 2024: https://www.commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf (issue brief: https://www.commonwealthfund.org/publications/issue-briefs/2024/aug/unforeseen-health-care-bills-coverage-denials-by-insurers, page returned 403 to my fetcher) | **Yes** (read the release text). Exact: "close to half (45%) of insured, working-age adults in the United States have received a medical bill or copayment in the past year for a service they thought should have been covered by their insurance." | "Close to half (45%) of insured adults ages 19 to 64 got a medical bill in the past year they thought insurance should have covered." Cite: Commonwealth Fund, 2023 survey, published 2024. **Do not say "insured workers"**: the population is insured adults 19 to 64, not employees. |
| N2 | Fewer than half challenged | Same release | **Yes**. Exact: "Among those who reported billing errors or coverage denials, fewer than half challenged them, mostly because they weren't aware they had the right to do so." | "Fewer than half pushed back, mostly because they didn't know they could." |
| N3 | 38% got the bill cut or removed | Same release | **Yes**. Exact: "more than one-third (38%) of those who disputed medical bills saw their balances reduced or eliminated." | "When people disputed, 38% saw the bill reduced or eliminated." |
| N3a | Survey method | Same release: Commonwealth Fund Health Care Affordability Survey, 2023, SSRS, April 18 to July 31, 2023; brief analyzes 5,602 insured adults under 65 | **Yes** | Footnote: "Commonwealth Fund Health Care Affordability Survey 2023 (n = 5,602 insured adults 19 to 64)." |
| N4 | Goodbill fee 20% of savings, cap $1,000, nothing if no savings | https://help.goodbill.com/en/articles/254209 | Yes per shared context (team verified 2026-10-17); C did not re-read | "Goodbill charges 20% of savings, capped at $1,000 (its help center, Oct 2026)." |
| N5 | Goodbill scope: hospital bills, unpaid, not collections | https://help.goodbill.com/en/articles/334657 | Yes per shared context | "Goodbill handles unpaid hospital bills with human experts." Never call it worse; say "different." |
| N6 | 2026 HHS poverty guideline, 48 states and DC: 1 person $15,960; 2 $21,640; 3 $27,320; 4 $33,000; 5 $38,680; 6 $44,360; 7 $50,040; 8 $55,720; +$5,680 each additional | https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines (Federal Register doc 2026-00755, Jan 15, 2026) | **Yes** (read 2026-10-17). Alaska and Hawaii differ (in `fpl-2026.json`) | "2026 HHS poverty guidelines." |
| N7 | LA County DHS Ability to Pay (ATP): free at or under 200% FPL, sliding scale above, for LA County residents | https://dhs.lacounty.gov/patient-information/get-coverage/financial-services/ (policy PDF: https://file.lacounty.gov/SDSInter/dhs/1131808_PolicyDocument.pdf; sliding scale: https://file.lacounty.gov/SDSInter/dhs/1141747_AbilityToPay_ATP_SlidingFeeScaleTable.pdf) | Page text **yes**; policy PDF not read (UNVERIFIED details) | "LA County's program says care is free at or under 200% of the poverty level (its website, captured DATE)." |
| N8 | Cedars-Sinai lists a cash price for lumbar MRI (72148) | MRF index https://www.cedars-sinai.org/cms-hpt.txt points to https://www.cedars-sinai.org/content/dam/cedars-sinai/billing-insurance/documents/951644600_CEDARS-SINAI-MEDICAL-CENTER_standardcharges.json | **Preliminary yes, not the capture of record.** A streamed read of the first ~884 MB found item "HB MRI L-SPINE WO CONTRAST" (CPT 72148, RC 612): outpatient `gross_charge` 7912.54, `discounted_cash` 5143.15; inpatient 10286.28 / 6686.08. File says `version` 2.0.0, `last_updated_on` 2025-11-26; HTTP Last-Modified Tue, 16 Dec 2025. The read was partial, so no full-file hash yet | After C-05 only: "Cedars-Sinai's own published cash price for this MRI is $5,143.15 (its price file, last updated 2025-11-26, captured DATE)." Until then say nothing numeric. |
| N9 | LA General's file "was saved earlier" | MRF https://file.lacounty.gov/SDSInter/dhs/1157354_956000927_LosAngelesGeneralMedicalCenter_standardcharges.csv (from https://dhs.lacounty.gov/cms-hpt.txt) | **Downloaded and checked 2026-10-17T21:59Z** (53,526,039 bytes, sha256 `675caaac571d2a670e1f4f78fe0a8dd3be31a9e915d830b9842dafe757805125`, CSV wide v3.0.0, `last_updated_on` 7/7/2026). **No row in the file has a `discounted_cash` value** (0 of 63,818 rows). 72148 gross charge 2683; 85025 gross 43. The team's earlier saved copy is UNVERIFIED (location unknown) | LA General cannot support a "published cash price" claim. It can support "published gross charge." Use Cedars-Sinai for the cash-price moment; keep LA General as backup (gross charge) and for the ATP assistance policy. |
| N10 | Demo bill $12,000, CBC 85025 $84 twice, MRI 72148 $6,900 | Synthetic (section 6, C-01) | Synthetic | Always say "synthetic bill." |
| N11 | Savings "$84 confirmed, $1,700 to $2,400 potential" | Illustrative in brief | **Do not reuse.** The engine computes the range from real flags. If N8 holds, the published-price gap alone is $6,900.00 minus $5,143.15 = $1,756.85 | Show whatever `audit.run` returns for SB-01, labelled by tier. |
| N12 | Seeded-error recall, false flags, extraction accuracy, BotM recall | `data/eval/results.json` | Must be measured | "Measured on N synthetic bills, DATE." Never a target. |
| N13 | Prize amounts (Paper verified per shared context; Fetch team figure; others unknown) | LA Hacks Devpost and sponsor pages | Mixed, UNVERIFIED for Fetch and others | Do not mention prize amounts in the pitch. |
| N14 | CMS MUE for codes in our fixtures | CMS Facility Outpatient Hospital MUE table effective 2026-10-01 (zip, sha256 `a45ee8194cf06a2d733850f4b694d1feca08b1b55a0121b8e86574436440b4a6`, downloaded 2026-10-17T22:03Z): https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip | **Yes** for: 36415 = 2, 72148 = 1, 80053 = 1, 85025 = 4, 96374 = 1, 99284 = 2, 99285 = 2, J1885 = 8, J7030 = 20, 96360 = 2, 96361 = 24, 70450 = 3, 71046 = 3, 74177 = 2, 93005 = 5, 82962 = 5, J2405 = 64, J0690 = 16, J1100 = 120, J2270 = 15, J7120 = 20, A9579 = 100 | "Medicare's usual daily limit for this code is N units (CMS MUE table, Oct 2026)." Never "not allowed." |

**Important nuance from N14.** The MUE for 85025 (CBC) is 4 per day, so two CBCs on one date are not over Medicare's unit limit. The duplicate flag rests only on "same code, same date, same amount, listed twice." Wording must ask, not accuse: "Listed twice on the same day for the same amount. Ask the hospital to confirm you had two tests."

### 4.2 Metric definitions (precise)

All metrics are computed by `scripts/eval/run.ts` and written to `data/eval/results.json` (schema in section 8). N, date, git SHA, and code version are always reported with the number.

| Metric | Definition |
|---|---|
| **M1 Line extraction accuracy** (with B) | Inputs: phone photos `data/synthetic/photos/*.jpg` through `bill.parsePhoto`. Ground truth: fixture `bill.lines`. Match each extracted line to at most one truth line greedily by score: code equal (+2), chargeCents equal (+2), serviceDate equal (+1), units equal (+1); a pair counts as matched if score >= 4 and chargeCents equal. **Line recall** = matched / truth lines. **Line precision** = matched / extracted lines. **Exact line rate** = matched pairs where code, serviceDate, units, and chargeCents are all equal / truth lines. **Field accuracy** per field = equal fields among matched pairs / matched pairs. **Totals match rate** = photos where sum of extracted chargeCents equals `totals.chargesCents` / photos. Report per capture condition (flat, angled, low light). |
| **M2 Seeded-error recall** | Over all fixtures with `expected.flags` (excluding entries with `requiresCapture: true` when the capture is missing). An expected flag is **caught** if the audit output has a flag with the same `lever` and at least one shared `lineId`. Recall = caught / expected. Report per lever. **M2a** runs on ground-truth lines (isolates the rules). **M2b** runs on lines extracted from photos (end to end; line ids remapped through the M1 matching). |
| **M3 False flags on clean bills** | Over fixtures with `expected.clean: true`: total flags produced (any lever except `assistance`). Target is zero; report the count and list each one. **M3a Precision over all fixtures** = flags that match an expected flag / all flags produced (assistance excluded). |
| **M4 Amount accuracy** | For caught `confirmed`-tier flags: share where `amountCents` equals expected exactly. |
| **M5 Time per audit** | Wall clock of the core audit call on ground-truth lines, 20 runs per fixture after 1 warm-up, p50 and p95 in ms. Photo-to-lines time (B's metric) is recorded separately from M1 runs as p50 and p95 seconds, measured once per photo, with model name. |
| **M6 Evidence completeness** | Share of produced flags with non-empty `evidence.detail` and, for tiers `rule` and `published`, a `sourceUrl`; for `published`, also `capturedAt`. Target 100%. |
| **M7 Bill of the Month recall (C1)** | For each recreated case, reporters' findings are listed as `reporterFindings[]`, each tagged `inScope: true` if it maps to a BetterBill lever. **Recall (in scope)** = in-scope findings caught / in-scope findings. **Recall (all)** = caught / all findings. Also report **extra flags** (flags not matching any reporter finding) and list them for manual review; do not call them errors or correct. |

---

## 5. Timeline and gates (PDT)

| Time | C work | Gate checklist |
|---|---|---|
| 15:00 to 16:00 | C-01: data folders, fixture format, SB-01 demo bill JSON | **G0 16:00**: [ ] SB-01 merged or PR open and agreed with B; [ ] fixture format posted in chat; [ ] Browser Use key works (one test run); [ ] team agreed decision D-1 (below) |
| 16:00 to 18:00 | C-03 rule table (MUE subset); C-02 bills SB-02 to SB-06 | [ ] `mue-subset.json` merged by 18:00 |
| 18:00 to 19:00 | C-02 bills SB-07 to SB-10 and validator; C-07 wording rules | [ ] 10 fixtures validate; [ ] `wording.json` merged |
| 19:00 to 20:00 | C-04 renderer, then print and photograph | [ ] PNG and PDF for 10 bills |
| **20:00 G1** | Run booth tests (2 to 3 booths) with the pasted SB-01 flow; log feedback | **G1**: [ ] paste SB-01 on a phone shows duplicate and units flags with tiers; [ ] 2 to 3 booth logs filed; [ ] photos taken and committed |
| 20:30 to 22:00 | C-05 Browser Use capture: Cedars-Sinai price page, MRF rows for 72148 and 85025, hashes | [ ] `capture.json` for Cedars-Sinai merged; [ ] B wired published-price rule to it |
| 22:00 to 23:30 | C-06 assistance policy capture and FPL table | [ ] policy quote, URL, capturedAt, thresholds in JSON |
| 23:00 to 00:30 | C-08 eval harness, first `results.json` | [ ] M2a, M3, M5, M6 computed |
| **00:00 G2** | Confirm with team which strengthening option C takes (C1 or C2) | **G2**: [ ] photo in, flags, letter approved and sent (team); [ ] pick C1 or C2 |
| 00:00 to 01:00 | Start C1 (or C2) | [ ] first 3 BotM cases recreated |
| **01:00** | **Switch to demo full-time.** Hand any unfinished evidence ticket to B or cut it | [ ] `docs/DEMO.md` v1 by 01:30 |
| 01:00 to 03:00 | Script, Q and A, slide outline, Devpost draft; finish C1 if under 1 hour left | [ ] dry run 1 (timed) at 02:30 |
| 03:00 to 07:00 | Sleep one shift (suggest 03:00 to 06:30); before sleeping, leave the Devpost draft and script in repo | [ ] eval rerun scheduled with B on main |
| 07:00 to 09:00 | Final eval run on main; video shoot; rehearsals | [ ] `results.json` final (07:30); [ ] video raw takes by 08:30; [ ] rehearsal 2 at 08:40 |
| **09:00 Freeze** | Fixes only. Edit video | [ ] demo build tagged; [ ] cached fallbacks verified |
| 09:00 to 10:30 | Video edit and upload; Devpost text final | **10:30**: [ ] Devpost submitted (C) |
| 10:30 to 12:00 | Rehearsal 3 and 4; A does Fetch submission by 11:30 if in | **12:00**: [ ] final submit confirmed |
| 12:30 | Judging | [ ] demo device charged, sample case loaded, judge phone card printed |

**Decision D-1 (needed at G0).** The published-price lever compares a bill to *the same hospital's* published price. So the demo bill must name the hospital whose file we capture. Recommended: SB-01 names "Cedars-Sinai Medical Center, Los Angeles, CA" and every rendered page carries a large watermark: "SYNTHETIC DEMO BILL. Not issued by Cedars-Sinai. Charges on this bill are invented; the comparison price comes from Cedars-Sinai's public price file." No logo, fake account number. Alternative if the team is uncomfortable: a fictional hospital name and the card reads "Higher than a nearby LA hospital's published cash price," which is weaker and must not use the tier label "Hospital's published price." Record the decision in `docs/DEMO.md`.

---

## 6. Tickets (PR by PR)

Each ticket is one PR, under 400 changed lines where possible (data files may exceed; say so in the PR). Prompts are written for a weaker coding agent. Paste them as is. Replace `<...>` only where marked.

### C-01 Fixture format and the demo bill (SB-01)
- **Branch:** `c/fixtures-sb01`
- **Goal:** Data folders, fixture JSON shape, a fixture validator, and the demo bill.
- **Files:** `data/synthetic/bills/SB-01.json`, `data/synthetic/README.md` (10 lines max: format and rules), `scripts/fixtures/validate.ts`, `.gitkeep` in `data/benchmark`, `data/hospitals`, `data/eval`, `data/rules`, `data/copy`.
- **Acceptance:** `bun scripts/fixtures/validate.ts` parses SB-01 with the zod `Bill` and `Eob` schemas from `packages/core/src/schemas.ts`, checks line sum equals `totals.chargesCents`, checks every `expected.flags[].lineIds` exists.
- **Tests or validation:** the validator runs in CI as part of `bun run test` if B agrees, or manually.
- **Estimate:** 45 min. **Depends on:** B's schemas PR (if not merged, copy the shapes and switch to the import later).

SB-01 lines (self-pay, single date 2026-09-14, descriptions are our own short text, not AMA descriptors):

| id | code | description (printed) | units | chargeCents | seeded issue |
|---|---|---|---|---|---|
| sb01-l01 | 99284 | ED VISIT LEVEL 4 | 1 | 295000 | none |
| sb01-l02 | 72148 | MRI LUMBAR SPINE W/O CONTRAST | 1 | 690000 | published price (requires capture) |
| sb01-l03 | 72100 | XR LUMBAR SPINE 2-3 VIEWS | 1 | 64000 | none |
| sb01-l04 | 85025 | CBC W/ AUTO DIFF | 1 | 8400 | duplicate (pair with l05) |
| sb01-l05 | 85025 | CBC W/ AUTO DIFF | 1 | 8400 | duplicate |
| sb01-l06 | 80053 | COMPREHENSIVE METABOLIC PANEL | 1 | 21200 | none |
| sb01-l07 | 36415 | VENIPUNCTURE | 4 | 15200 | units (MUE 2) |
| sb01-l08 | 96374 | IV PUSH SINGLE DRUG | 1 | 48600 | none |
| sb01-l09 | J1885 | KETOROLAC INJ 15 MG | 1 | 9600 | none |
| sb01-l10 | J7030 | NORMAL SALINE 1000 CC | 1 | 18600 | none |
| sb01-l11 | 81003 | URINALYSIS AUTO W/O SCOPE | 1 | 21000 | none |
| | | **Total** | | **1200000** | |

Why self-pay: the published discounted cash price is the relevant comparison for a self-pay patient, and it lets the demo show the assistance check. The EOB lever is shown with SB-04 (booth tests, video cut, Q and A).

**Coding-agent prompt (C-01):**
```
You are working in the BetterBill monorepo (Bun, TypeScript). Create branch c/fixtures-sb01 from main.

Read first: plans/00-shared-context.md section 6 (data contracts) and packages/core/src/schemas.ts.

Steps:
1. Create empty folders with a .gitkeep file: data/synthetic/bills, data/synthetic/rendered, data/synthetic/photos, data/benchmark, data/hospitals, data/eval, data/rules, data/copy.
2. Create data/synthetic/bills/SB-01.json with exactly this top-level shape:
{
  "fixtureVersion": 1,
  "id": "SB-01",
  "title": "Demo: ED visit with lumbar MRI, self-pay",
  "synthetic": true,
  "scenario": "demo",
  "bill": <Bill object>,
  "eob": null,
  "expected": {
    "clean": false,
    "flags": [
      { "lever": "duplicate", "tier": "confirmed", "lineIds": ["sb01-l04","sb01-l05"], "amountCents": 8400 },
      { "lever": "units", "tier": "rule", "lineIds": ["sb01-l07"], "amountCents": 7600, "ruleRef": "mue:36415" },
      { "lever": "published_price", "tier": "published", "lineIds": ["sb01-l02"], "amountCents": null, "requiresCapture": "cedars-sinai:72148:outpatient" }
    ],
    "notes": "Units excess = (4 - 2) units x 3800 cents. Published-price amount is filled after the capture."
  },
  "context": { "hospitalKey": "cedars-sinai", "patient": { "householdSize": 3, "annualIncomeCents": 5200000, "state": "CA", "insured": false } }
}
The Bill object:
- id "bill_sb01"; hospital { "name": "Cedars-Sinai Medical Center", "city": "Los Angeles", "state": "CA" }; statementDate "2026-10-01"; accountRefMasked "4821"; kind "itemized"; sourceKind "pdf".
- lines: 11 lines with ids sb01-l01 to sb01-l11, serviceDate "2026-09-14", codeType "CPT" for numeric codes and "HCPCS" for J codes, source { "page": 1, "bbox": null }, confidence 1, userEdited false. Codes, descriptions, units, chargeCents exactly:
  99284 "ED VISIT LEVEL 4" 1 295000
  72148 "MRI LUMBAR SPINE W/O CONTRAST" 1 690000
  72100 "XR LUMBAR SPINE 2-3 VIEWS" 1 64000
  85025 "CBC W/ AUTO DIFF" 1 8400
  85025 "CBC W/ AUTO DIFF" 1 8400
  80053 "COMPREHENSIVE METABOLIC PANEL" 1 21200
  36415 "VENIPUNCTURE" 4 15200
  96374 "IV PUSH SINGLE DRUG" 1 48600
  J1885 "KETOROLAC INJ 15 MG" 1 9600
  J7030 "NORMAL SALINE 1000 CC" 1 18600
  81003 "URINALYSIS AUTO W/O SCOPE" 1 21000
- totals { "chargesCents": 1200000, "adjustmentsCents": 0, "paidCents": 0, "dueCents": 1200000 }.
3. Create scripts/fixtures/validate.ts that:
   a. globs data/synthetic/bills/*.json and data/benchmark/botm/*.json (if present),
   b. parses fixture.bill with the Bill zod schema and fixture.eob with the Eob schema when not null (import from packages/core/src/schemas.ts),
   c. asserts sum(lines.chargeCents) === bill.totals.chargesCents,
   d. asserts every id in expected.flags[].lineIds exists in bill.lines,
   e. asserts lever and tier values are from the contract enums,
   f. asserts all money fields are integers,
   g. prints "OK <id>" per file and exits 1 on any failure.
4. Add a root package.json script: "fixtures:validate": "bun scripts/fixtures/validate.ts".
5. Run: bun run fixtures:validate. It must print OK SB-01.
6. Run: bun x biome check --write data scripts.

Do not:
- change packages/core/src/schemas.ts or any oRPC route,
- use real patient names, real account numbers, or AMA CPT long descriptors,
- use floating point dollars anywhere.

Definition of done: validator passes, Biome clean, PR open titled "feat(data): fixture format, validator, demo bill SB-01" with a PR body listing the fixture shape. Open the PR.
```

### C-02 Nine more synthetic bills with ground truth
- **Branch:** `c/fixtures-sb02-sb10`
- **Goal:** Cover every lever and three clean controls.
- **Files:** `data/synthetic/bills/SB-02.json` to `SB-10.json`.
- **Acceptance:** validator passes; each scenario below present; clean controls contain traps (near duplicates) that a correct engine must not flag.
- **Estimate:** 1.5 h. **Depends on:** C-01.

| id | Scenario | Seeded expected flags | EOB |
|---|---|---|---|
| SB-02 | ER visit, insured | duplicate 80053 same date same amount; units 36415 x 3 (MUE 2) | EOB matches due (no mismatch) |
| SB-03 | Infusion day | units J1885 x 12 (MUE 8); units 96374 x 2 (MUE 1) | none |
| SB-04 | Imaging, insured | eob_mismatch: bill `dueCents` 312000 vs EOB `patientResponsibilityCents` 115000 (amount 197000) | yes, with line-level allowed amounts |
| SB-05 | Labs, insured | eob_mismatch at line level: 85025 billed patient share 8400 vs EOB `patientCents` 1200; plus duplicate 85025 | yes |
| SB-06 | Outpatient MRI, self-pay | published_price 72148 (requires capture); no other issues | none |
| SB-07 | Summary statement only | missing_itemization (kind "summary", 1 to 2 lines) | none |
| SB-08 | Clean control: straightforward ED visit | none | none |
| SB-09 | Clean control: legitimate repeats (85025 on two different dates; 36415 x 2 which equals the MUE) | none | none |
| SB-10 | Clean control: near duplicates (same code, same date, different amounts with a modifier noted in description; same description different codes) | none | EOB matches |

Notes: assistance is evaluated separately (C-06), not as an expected flag. If B's engine does not implement `missing_itemization`, mark SB-07 expected flag with `"optional": true` and report it separately.

**Coding-agent prompt (C-02):**
```
Branch c/fixtures-sb02-sb10 from main (after c/fixtures-sb01 is merged).

Read data/synthetic/bills/SB-01.json and copy its exact shape for SB-02 to SB-10 in data/synthetic/bills/.

Rules for every file:
- "synthetic": true; hospital name "Sample Medical Center (synthetic)", city "Los Angeles", state "CA", except SB-06 which uses the SB-01 hospital block exactly.
- Line ids "sbNN-lMM" (NN = bill number, two digits; MM two digits).
- Use only these codes and our own short descriptions: 99283, 99284, 99285, 72148, 72100, 70450, 71046, 74177, 85025, 80053, 81003, 36415, 96360, 96361, 96374, J1885, J7030, J2405, J1100, 93005, 82962.
- Units bounds you may rely on (CMS outpatient hospital MUE, effective 2026-10-01): 36415=2, 72148=1, 80053=1, 85025=4, 96374=1, 99284=2, 99285=2, J1885=8, J7030=20, 96360=2, 96361=24, 70450=3, 71046=3, 74177=2, 93005=5, 82962=5, J2405=64, J1100=120.
- chargeCents is the line total (units x unit price). Integers only. Sum of lines must equal totals.chargesCents.
- For insured bills: totals.adjustmentsCents and totals.paidCents reflect the insurer; dueCents = charges - adjustments - paid.
- Eob shape: { "payer": "Synthetic Health Plan", "claimRefMasked": "7731", "patientResponsibilityCents": <int>, "lines": [ { "code": "<code>", "allowedCents": <int|null>, "patientCents": <int|null> } ] }.
- expected.flags entries: { "lever", "tier", "lineIds", "amountCents", optional "ruleRef", optional "requiresCapture", optional "optional" }.
   duplicate -> tier "confirmed", amountCents = one copy's chargeCents, lineIds = both lines.
   units -> tier "rule", amountCents = (units - bound) x unit price, ruleRef "mue:<code>".
   eob_mismatch -> tier "confirmed", amountCents = bill due minus EOB patient responsibility (or line difference), lineIds = affected lines (whole-bill mismatch: all lines).
   published_price -> tier "published", amountCents null, requiresCapture "cedars-sinai:72148:outpatient".
   missing_itemization -> tier "rule", amountCents 0, "optional": true.
- Clean controls SB-08, SB-09, SB-10: "expected": { "clean": true, "flags": [] } and a "notes" string explaining each trap.

Scenarios (implement exactly):
SB-02 insured ER: duplicate 80053 (same date, same amount), 36415 units 3; EOB patientResponsibilityCents equals bill dueCents.
SB-03 self-pay infusion: J1885 units 12, 96374 units 2.
SB-04 insured imaging: bill dueCents 312000; EOB patientResponsibilityCents 115000.
SB-05 insured labs: two 85025 lines same date same amount (duplicate); EOB line for 85025 patientCents 1200 while the bill shows that line fully due; expect eob_mismatch on that line too.
SB-06 self-pay outpatient MRI 72148 at 690000 plus 2 clean lines.
SB-07 kind "summary": one line "HOSPITAL SERVICES" code null codeType null chargeCents = total.
SB-08 clean ED visit, 6 lines, no repeats, all units within bounds.
SB-09 clean: 85025 on 2026-09-14 and again on 2026-09-15; 36415 units 2.
SB-10 clean: 85025 twice on the same date but different chargeCents (8400 and 4200, second described "CBC W/ AUTO DIFF REPEAT -91"); 72100 and 72148 on the same date.

Then run: bun run fixtures:validate (all 10 must print OK) and bun x biome check --write data.

Do not: invent real people, use real account numbers, change SB-01, change schemas.
Definition of done: 10 fixtures validate; PR "feat(data): synthetic bills SB-02 to SB-10 with expected flags" with a table of scenarios in the body. Open the PR.
```

### C-03 Units rule table with sources (MUE subset)
- **Branch:** `c/rules-mue`
- **Goal:** A small, cited units-bound table B's units rule reads.
- **Files:** `data/rules/mue-subset.json`, `scripts/rules/build-mue-subset.ts`, `data/rules/SOURCES.md` (short).
- **Acceptance:** every fixture code that has an MUE is present; each entry carries source URL, file name, effective date, sha256 of the zip, MAI, and rationale exactly as in the CMS file.
- **Estimate:** 45 min. **Depends on:** none.

Facts verified 2026-10-17: CMS publishes MUE tables as quarterly ZIPs (Practitioner, Facility Outpatient Hospital, DME) at https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits. The current Outpatient Hospital ZIP (effective 2026-10-01) contains `MCR_MUE_OutpatientHospitalServices_Eff_10-01-2026.csv` and `.xlsx`; columns: "HCPCS/CPT Code", "Outpatient Hospital Services MUE Values", "MUE Adjudication Indicator", "MUE Rationale". MAI labels in the file: "1 Line Edit", "2 Date of Service Edit: Policy", "3 Date of Service Edit: Clinical". The page notes not every code has an MUE and some MUE values are confidential. The CSV begins with an AMA copyright notice for CPT codes, descriptions, and other data. The MUE download links did not pass through the AMA license page (the NCCI PTP links do).

Licensing rule: store only codes and values we use (a subset, about 25 codes), include the AMA notice text in `SOURCES.md`, never copy CPT descriptors. Redistribution terms for even a subset are UNVERIFIED; keep it small and cited.

**Optional C-03b (unbundling, default CUT).** NCCI PTP edits are quarterly ZIPs split by code range, separate Practitioner and Hospital tables, with column 1 and column 2 codes and a modifier indicator; downloads route through an AMA license acceptance page (https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits). Only attempt after G2 if a teammate accepts the license personally, and then store at most 5 pairs relevant to fixtures with the file name and date. Modifier indicator meanings are UNVERIFIED (the page does not define them; check the NCCI Policy Manual).

**Coding-agent prompt (C-03):**
```
Branch c/rules-mue from main.

Goal: build data/rules/mue-subset.json from the official CMS file. Do not type MUE values by hand.

Steps:
1. mkdir -p .cache/cms (add .cache/ to .gitignore if missing).
2. curl -sSL -o .cache/cms/oph-mue.zip "https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip"
3. sha256sum .cache/cms/oph-mue.zip and record the hash.
4. Write scripts/rules/build-mue-subset.ts (Bun) that:
   a. unzips the CSV in memory (use the "fflate" or "unzipit" package if already in the repo; otherwise run `unzip -p` via Bun.spawn),
   b. finds the header row whose first cell starts with "HCPCS" (the file has a multi-line AMA notice first; header cell contains a newline),
   c. reads rows into { code, mue, mai, rationale },
   d. keeps only codes found in any data/synthetic/bills/*.json or data/benchmark/botm/*.json line,
   e. writes data/rules/mue-subset.json with this exact shape:
{
  "table": "CMS NCCI MUE, Facility Outpatient Hospital Services",
  "sourcePage": "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits",
  "sourceFile": "https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip",
  "fileName": "MCR_MUE_OutpatientHospitalServices_Eff_10-01-2026.csv",
  "effectiveDate": "2026-10-01",
  "sha256": "<hash from step 3>",
  "retrievedAt": "<ISO UTC now>",
  "license": "CPT codes copyright American Medical Association. Codes and unit values only; no descriptors stored.",
  "entries": [ { "code": "36415", "maxUnitsPerDay": 2, "mai": "3 Date of Service Edit: Clinical", "rationale": "CMS Policy" } ]
}
   f. sorts entries by code and prints the count.
5. Run bun scripts/rules/build-mue-subset.ts and check: 36415 = 2, 85025 = 4, J1885 = 8, 96374 = 1, 72148 = 1. If any differ, stop and report; do not edit values.
6. Write data/rules/SOURCES.md (under 20 lines): the source URLs, effective date, hash, the AMA notice sentence from the CSV header, and the rule "units over MUE is a Medicare benchmark, shown as 'Billing rule' tier, never as an error."

Do not: commit the zip or full CSV, copy CPT descriptors, guess values for codes missing from the file (omit them and list them in the PR body).
Definition of done: JSON committed, script reproducible, PR "feat(data): MUE units subset with sources" open. Open the PR.
```

### C-04 Render bills to PNG/PDF, then print and photograph
- **Branch:** `c/render-bills`
- **Goal:** Realistic-looking statements from fixtures; photo set for extraction tests.
- **Files:** `scripts/render/template.html`, `scripts/render/render.ts`, outputs in `data/synthetic/rendered/`, photos in `data/synthetic/photos/`.
- **Acceptance:** 10 PNG (1700 x 2200, letter at 200 dpi) and 10 PDF; each shows hospital block, statement date, masked account, patient "SAMPLE PATIENT", table (date, code, description, units, charge), totals, and the watermark "SYNTHETIC DEMO BILL"; SB-01 shows the D-1 disclaimer line. Photos: 3 conditions for at least 5 bills (flat daylight, 20 degree angle, dim or crumpled), EXIF stripped.
- **Estimate:** 1 h render + 30 min print and photos. **Depends on:** C-02.
- Layout reference: generic hospital statement structure (header, account box, itemized table). Do not copy Goodbill visuals (images 2 to 4 are product UI, not bills).

**Coding-agent prompt (C-04):**
```
Branch c/render-bills from main.

Steps:
1. Create scripts/render/template.html: a plain HTML letter-size statement (8.5in x 11in, CSS @page size letter, margins 0.5in) using system fonts. Sections: hospital name, city/state; "Patient Statement"; account box (Account ending {{accountRefMasked}}, Statement date, Patient: SAMPLE PATIENT); itemized table with columns Date | Code | Description | Units | Charges (right-aligned, $ with 2 decimals); totals block (Total charges, Adjustments, Payments, Amount due); a diagonal light-gray watermark "SYNTHETIC DEMO BILL" on every page; footer "Synthetic document for testing. Not a real bill." For SB-01 also print under the header: "Not issued by Cedars-Sinai. Charges on this bill are invented."
2. Create scripts/render/render.ts (Bun + playwright, chromium):
   - for each data/synthetic/bills/*.json, fill the template (simple string replace; format cents as dollars with toLocaleString("en-US",{style:"currency",currency:"USD"})),
   - for kind "summary" render only the totals and one line,
   - write data/synthetic/rendered/SB-XX.html,
   - page.setViewportSize({width:1700,height:2200}) with deviceScaleFactor 1 and screenshot fullPage to SB-XX.png,
   - page.pdf({format:"Letter", printBackground:true}) to SB-XX.pdf.
3. Add package.json script "render:bills": "bun scripts/render/render.ts". Run it.
4. Open 3 PNGs and check text is legible and totals match the JSON.

Do not: add a new UI library, embed real logos, use real names, commit anything over 2 MB per file (lower PNG size with JPEG quality 85 if needed and note it).
Definition of done: 10 html/png/pdf files committed; PR "feat(data): render synthetic bills to PNG and PDF" with SB-01.png screenshot in the body. Open the PR.
```
Manual photo steps (C, not the agent): print SB-01 to SB-06 and SB-08; photograph each in 3 conditions with the demo phone; name `SB-01-flat.jpg`, `SB-01-angle.jpg`, `SB-01-dim.jpg`; run `exiftool -all= -overwrite_original data/synthetic/photos/*.jpg`; confirm with `exiftool data/synthetic/photos/SB-01-flat.jpg | grep -i gps` (no output). Commit in a separate small PR `c/photos`.

### C-05 Browser Use capture: real hospital price rows (Cedars-Sinai)
- **Branch:** `c/capture-cedars-prices`
- **Goal:** A reproducible, hashed capture of Cedars-Sinai's public price transparency page and the MRF rows for 72148 and 85025, with Browser Use doing the live navigation and a deterministic script doing download, hash, and extraction.
- **Files:** `scripts/hospitals/browser_use_capture.py`, `scripts/hospitals/extract_mrf.py`, `data/hospitals/cedars-sinai/capture.json`, `data/hospitals/cedars-sinai/evidence/` (page text, screenshot, Browser Use run JSON).
- **Acceptance:** `capture.json` contains source URLs, capturedAt, sha256 and byte size of the full MRF stream, the file's own `last_updated_on` and `version`, and price rows (cents) for 72148 and 85025 per setting with the hospital's own description; Browser Use run id and recording link (if available) in evidence.
- **Estimate:** 1.5 h. **Depends on:** Browser Use key; D-1.

Verified facts for this ticket: `https://www.cedars-sinai.org/cms-hpt.txt` lists `source-page-url: https://cedars-sinai.org/price-transparency.html` and the MRF JSON URL (section 4, N8). The JSON uses CMS v2 JSON fields (`standard_charge_information[].description`, `code_information[{code,type}]`, `standard_charges[{gross_charge, discounted_cash, minimum, maximum, setting, payers_information[]}]`). The file is very large (over 880 MB streamed without reaching the end; total size UNVERIFIED), so never commit it. Multiple items share code 72148 (including one described "PET Scan"); select the item described "HB MRI L-SPINE WO CONTRAST" with RC 612 and record why.

Browser Use API facts (from https://docs.browser-use.com and https://docs.browser-use.com/cloud/agent/structured-output.md, read 2026-10-17): Python package `browser-use-sdk`; `from browser_use_sdk.v4 import BrowserUse`; `client.runs.create(task, output_schema=Model.model_json_schema())`; `client.runs.wait_for_completion(run.id)`; parsed JSON in `run.output`; REST `POST https://api.browser-use.com/api/v4/runs` with header `X-Browser-Use-API-Key`; env `BROWSER_USE_API_KEY`. Live preview and recording exist (https://docs.browser-use.com/cloud/browser/live-preview.md); exact fields are UNVERIFIED. Default model and pricing are UNVERIFIED.

**Coding-agent prompt (C-05):**
```
Branch c/capture-cedars-prices from main. Python 3.11+, uv. Do not put any key in code; read BROWSER_USE_API_KEY from the environment.

Part A: Browser Use live navigation (scripts/hospitals/browser_use_capture.py)
1. uv pip install --upgrade browser-use-sdk pydantic
2. Define pydantic models:
   class PriceLinks(BaseModel):
       source_page_url: str
       mrf_urls: list[str]
       financial_assistance_url: str | None
       page_last_updated_text: str | None
       notes: str
3. Task text (exact):
   "Go to https://www.cedars-sinai.org/cms-hpt.txt and read it. Then open the source-page-url it lists. On that page, find every link to a machine-readable standard charges file and any link to the hospital's financial assistance or charity care policy. Do not download large files. Return the URLs exactly as written on the page, any 'last updated' text shown, and short notes on what the page says about the file."
4. run = client.runs.create(TASK, output_schema=PriceLinks.model_json_schema()); run = client.runs.wait_for_completion(run.id). If run.status.value != "completed", print run.error and exit 1.
5. Save data/hospitals/cedars-sinai/evidence/browser_use_run.json containing: run id, status, task, output, startedAt and finishedAt if present, and any live/recording URL fields present on the run object (print dir(run) once to find them; do not guess field names).
6. Print the output.

Part B: deterministic extraction (scripts/hospitals/extract_mrf.py)
1. Input: --url <mrf url from Part A or cms-hpt.txt> --codes 72148 85025 --out data/hospitals/cedars-sinai/capture.json
2. Stream the file with urllib (User-Agent "BetterBill-hackathon-research/0.1 (contact: team email)"), update a hashlib.sha256 over every byte, count bytes, and parse with ijson (uv pip install ijson) over "standard_charge_information.item". Also read top-level hospital_name, last_updated_on, version with a separate small ijson pass or the first 4 KB.
3. For each item whose code_information has type "CPT" or "HCPCS" and code in --codes, collect: description, all code_information pairs, and for each standard_charges entry: setting, gross_charge, discounted_cash, minimum, maximum. Convert dollars to integer cents with round(Decimal(str(x)) * 100).
4. Write capture.json with this exact shape:
{
  "hospitalKey": "cedars-sinai",
  "hospitalName": "<hospital_name from file>",
  "capturedAt": "<ISO UTC when download finished>",
  "capturedBy": "browser_use_capture.py run <run id> + extract_mrf.py",
  "sources": [
    { "kind": "cms_hpt_txt", "url": "https://www.cedars-sinai.org/cms-hpt.txt", "sha256": "<>", "bytes": <int> },
    { "kind": "price_page", "url": "<source_page_url>", "sha256": "<of saved page text>", "evidenceFile": "evidence/price_page.txt" },
    { "kind": "mrf", "url": "<mrf url>", "sha256": "<full stream hash>", "bytes": <int>, "httpLastModified": "<header or null>", "fileLastUpdatedOn": "<last_updated_on>", "fileVersion": "<version>" }
  ],
  "prices": [
    { "code": "72148", "codeType": "CPT", "hospitalDescription": "HB MRI L-SPINE WO CONTRAST", "otherCodes": [{"code":"612","type":"RC"}], "setting": "outpatient", "grossChargeCents": <int>, "discountedCashCents": <int|null>, "minNegotiatedCents": <int|null>, "maxNegotiatedCents": <int|null> }
  ],
  "selection": { "72148": "Item described 'HB MRI L-SPINE WO CONTRAST' (RC 612), setting outpatient, chosen because the demo bill is an outpatient MRI. Other items with the same code are listed in allMatches." },
  "allMatches": [ { "code": "72148", "description": "<>", "setting": "<>", "grossChargeCents": <int>, "discountedCashCents": <int|null> } ]
}
5. Save the cms-hpt.txt body to evidence/cms-hpt.txt and the price page text (fetched with urllib) to evidence/price_page.txt. Take a full-page screenshot of the price page with: bunx playwright screenshot --full-page "<source_page_url>" data/hospitals/cedars-sinai/evidence/price_page.png
6. Run: python -I scripts/hospitals/extract_mrf.py --url "<mrf url>" --codes 72148 85025 --out data/hospitals/cedars-sinai/capture.json  (expect several minutes; run in the background).

Do not: commit the MRF, store payer contract notes beyond min/max, invent a price if a field is missing (use null), retry more than 3 times, run Browser Use more than 5 times total.
Definition of done: capture.json with real numbers and hashes, evidence files, PR "feat(data): Cedars-Sinai price capture via Browser Use" whose body shows the 72148 outpatient row and the capture timestamp. Open the PR.
```
After merge: C updates SB-01 and SB-06 `expected.flags` published-price `amountCents` to `690000 - discountedCashCents` (only if discountedCash < 690000), tells B, and updates section 4 N8 wording in `wording.json` facts.

### C-06 Financial assistance policy capture and screener inputs
- **Branch:** `c/assistance-inputs`
- **Goal:** Quoted thresholds from the demo hospital's policy plus the 2026 FPL table, in a shape B's `assistance.check` uses.
- **Files:** `data/hospitals/fpl-2026.json`, `data/hospitals/cedars-sinai/policy.json` (or `la-dhs/policy.json` as fallback), evidence page text and screenshot.
- **Acceptance:** every threshold has a verbatim quote, URL, and capturedAt; FPL figures match ASPE exactly; screener status rules documented.
- **Estimate:** 1 h. **Depends on:** C-05 Part A (policy URL).

Screener rule (proposal to B, estimate only): income percent of FPL = annual income / FPL(household size, state) x 100. `likely` if at or under the policy's free-care threshold; `possible` if at or under the discount threshold; `unlikely` above both; `unknown` if no threshold captured. Always show the quote. For California hospitals, a state law sets discount and charity requirements (Hospital Fair Pricing Act; current thresholds UNVERIFIED, do not state a number unless read from the official source). LA DHS ATP (verified page text): free at or under 200% FPL for LA County residents, sliding scale above.

Demo patient (SB-01 context): household 3, income $52,000. 2026 FPL for 3 is $27,320, so income is about 190% FPL (52,000 / 27,320 = 1.903). That is under 200% FPL. If Cedars-Sinai's policy threshold is captured, the card status follows its quote; if only LA DHS is available, the card must say it is LA County's program, not Cedars-Sinai's.

**Coding-agent prompt (C-06):**
```
Branch c/assistance-inputs from main.

1. Create data/hospitals/fpl-2026.json exactly:
{
  "year": 2026,
  "source": "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines",
  "federalRegister": "2026-00755 (January 15, 2026)",
  "retrievedAt": "2026-10-17T22:00:00Z",
  "units": "dollars per year",
  "contiguous48AndDC": { "1": 15960, "2": 21640, "3": 27320, "4": 33000, "5": 38680, "6": 44360, "7": 50040, "8": 55720, "additionalPerson": 5680 },
  "alaska": { "1": 19950, "2": 27050, "3": 34150, "4": 41250, "5": 48350, "6": 55450, "7": 62550, "8": 69650, "additionalPerson": 7100 },
  "hawaii": { "1": 18360, "2": 24890, "3": 31420, "4": 37950, "5": 44480, "6": 51010, "7": 57540, "8": 64070, "additionalPerson": 6530 }
}
   Then open the source URL in a browser and confirm every number. If any differ, use the page's numbers and note it in the PR.
2. Policy capture. Input: the financial_assistance_url from data/hospitals/cedars-sinai/evidence/browser_use_run.json. If null, run one Browser Use task (same SDK pattern as scripts/hospitals/browser_use_capture.py) with output schema:
   class PolicyQuotes(BaseModel):
       policy_url: str
       policy_title: str
       quotes: list[str]   # verbatim sentences that state income limits as % of federal poverty level, discount levels, or who qualifies
       pdf_urls: list[str]
   Task: "Open <hospital site> and find the financial assistance (charity care) policy. Return the policy URL, title, any PDF links, and copy verbatim every sentence that states an income limit as a percent of the federal poverty level or a discount amount. Do not paraphrase."
3. Download each policy PDF or page to data/hospitals/cedars-sinai/evidence/ (only if under 10 MB), sha256 it, and confirm each quote appears in the text (pdftotext then grep -F). Drop any quote you cannot find verbatim.
4. Write data/hospitals/cedars-sinai/policy.json:
{
  "hospitalKey": "cedars-sinai",
  "policyUrl": "<>", "policyTitle": "<>", "capturedAt": "<ISO UTC>",
  "evidence": [ { "file": "evidence/<name>", "url": "<>", "sha256": "<>" } ],
  "quotes": [ { "text": "<verbatim>", "purpose": "free_care_threshold" | "discount_threshold" | "eligibility" | "other" } ],
  "thresholds": { "freeCareMaxFplPct": <number|null>, "discountMaxFplPct": <number|null> },
  "notes": "<anything conditional, e.g. asset tests, residency>"
}
   Thresholds come only from quotes. If a quote is ambiguous, set null and explain in notes.
5. Fallback if step 2 fails twice: do the same for LA County DHS using https://dhs.lacounty.gov/patient-information/get-coverage/financial-services/ and https://file.lacounty.gov/SDSInter/dhs/1131808_PolicyDocument.pdf into data/hospitals/la-dhs/policy.json.

Do not: guess thresholds, paraphrase quotes, store any personal data, commit files over 10 MB.
Definition of done: fpl-2026.json and policy.json committed with evidence and hashes; PR "feat(data): assistance policy quotes and 2026 FPL" open. Open the PR.
```

### C-07 Wording rules, disclaimer, and copy facts
- **Branch:** `c/wording`
- **Goal:** One JSON file every role reads for banned words, tier labels, disclaimers, call lines, and verified facts; plus a test B can run on flag and letter text.
- **Files:** `data/copy/wording.json`, `scripts/copy/check-wording.ts`.
- **Acceptance:** banned list includes "illegal", "fraud", "fraudulent", "overcharge", "overcharged", "scam", "guarantee", "guaranteed", "you will save", "HIPAA compliant", "legal advice" (only allowed inside the disclaimer); check script scans `packages/**/src/**/*.{ts,tsx}` string literals and `data/copy` and fails on hits outside an allowlist.
- **Estimate:** 40 min. **Depends on:** none.

Content (copy exactly into `wording.json`):
- `disclaimer`: "BetterBill is informational, not legal or medical advice."
- `estimateNote`: "Savings are estimates. Results depend on the hospital."
- `syntheticNote`: "This is a synthetic sample bill. The hospital price comparison uses real public data."
- `tierLabels`: confirmed "Confirmed from your bill"; rule "Billing rule"; published "Hospital's published price"; estimate "Estimate".
- `flagTemplates`:
  - duplicate: title "Listed twice on the same day"; explanation "This charge appears twice with the same date and amount. Ask the hospital to confirm you had it twice."
  - units: title "More units than usual"; explanation "You were billed {units} units. Medicare's usual daily limit for this code is {mue} (CMS, {effective})."
  - eob_mismatch: title "Bill doesn't match your insurer"; explanation "Your insurer says you owe {eob}. The hospital is asking for {due}."
  - published_price: title "Higher than the hospital's own cash price"; explanation "The hospital's published cash price is {cash}. You were billed {billed}."
  - missing_itemization: title "Ask for an itemized bill"; explanation "This statement doesn't list each service. You can ask for an itemized bill."
  - assistance: title "You may qualify for help paying"; explanation "The hospital's policy says: \"{quote}\". This is an estimate, not a decision."
- `letterRules`: every claim maps to a flag id; quote the evidence and source; polite and specific; ask for a corrected itemized bill and a hold on collections while under review (phrase as a request); never threaten; include the disclaimer only in the app, not in the letter body; no medical details beyond codes and dates.
- `callLines`: opening "Hi, this is an automated assistant calling on behalf of a patient."; purpose "I'm calling about two items on an account ending in {last4}."; ask "Could you review these and tell me the next step?"; close "Thank you. Can I get a reference number for this call?"; never give full identifiers, date of birth, or diagnosis.
- `facts`: the safe wording column of section 4 for N1 to N7 (N8 after C-05).

**Coding-agent prompt (C-07):**
```
Branch c/wording from main.
1. Create data/copy/wording.json with keys: disclaimer, estimateNote, syntheticNote, tierLabels, flagTemplates, letterRules (array of strings), callLines, banned (array), allowlistFiles (array), facts (array of { id, text, sourceUrl, verifiedOn }). Use the exact text given in plans/C-evidence-data-demo.md ticket C-07 and section 4 safe wording for N1 to N7.
2. Create scripts/copy/check-wording.ts (Bun): read banned list; scan files matching packages/**/src/**/*.{ts,tsx}, apps/web/src/**/*.{ts,tsx}, data/copy/*.json; case-insensitive whole-word match; skip lines containing the exact disclaimer string; skip files in allowlistFiles; print file:line:word for each hit; exit 1 if any.
3. Add script "copy:check": "bun scripts/copy/check-wording.ts". Run it and fix nothing outside data/copy; report other hits in the PR body for their owners.
4. Ensure no em dashes or en dashes in wording.json (grep for U+2014 and U+2013; must be none).
Do not: edit other roles' UI files. Definition of done: script runs, PR "feat(copy): wording rules, disclaimer, banned words check" open with the hit list. Open the PR.
```

### C-08 Evaluation harness and results.json
- **Branch:** `c/eval-harness`
- **Goal:** One command produces `data/eval/results.json` per section 8, used by `eval.results`, the UI card, and the pitch.
- **Files:** `scripts/eval/run.ts`, `scripts/eval/match.ts`, `scripts/eval/match.test.ts`, `data/eval/results.json`, `docs/EVAL.md`.
- **Acceptance:** `bun run eval` runs offline on ground-truth fixtures (M2a, M3, M4, M5, M6); `bun run eval --photos` uses cached parse outputs in `data/eval/extraction/*.json` (M1, M2b); `--botm` adds M7. Output validates against a zod schema in `scripts/eval/schema.ts`.
- **Estimate:** 1.5 h. **Depends on:** B's audit entry point, C-02, C-05 (published price), photos.

**Coding-agent prompt (C-08):**
```
Branch c/eval-harness from main.

Read: plans/C-evidence-data-demo.md sections 4.2 and 8, packages/core/src/index.ts (find the exported audit function; if its name is not obvious, stop and ask in the PR instead of guessing), data/synthetic/bills/SB-01.json.

1. scripts/eval/schema.ts: zod schema for results.json exactly as in section 8 of the plan.
2. scripts/eval/match.ts: export function matchFlags(expected, produced) implementing: an expected flag is caught if a produced flag has the same lever and shares at least one lineId; each produced flag can match at most one expected flag; returns { caught, missed, extra }.
   Also export matchLines(truth, extracted) implementing the M1 greedy score (code +2, chargeCents +2, serviceDate +1, units +1; matched if score >= 4 and chargeCents equal).
3. scripts/eval/match.test.ts (Vitest): at least 6 cases: exact catch, lever mismatch, no shared line, one produced flag vs two expected, line match with misread description, line non-match with wrong amount.
4. scripts/eval/run.ts:
   a. load fixtures, data/rules/mue-subset.json, data/hospitals/*/capture.json,
   b. for each fixture call the core audit function with the fixture's bill, eob, prices, and rules (exact argument shape from packages/core),
   c. skip expected flags whose requiresCapture key has no matching price (count them under "skippedRequiresCapture"),
   d. time each audit: 1 warm-up, 20 timed runs with performance.now(), record p50 and p95,
   e. compute M2a per lever, M3 (clean fixtures), M3a precision, M4, M6 per section 4.2,
   f. if --photos: for each data/synthetic/photos/*.jpg read cached data/eval/extraction/<photo>.json (shape: { photo, model, ms, bill }); if missing and --live is passed, POST the photo to the local bill.parsePhoto route (URL from env EVAL_API_URL) and cache the result; compute M1 per condition and M2b,
   g. if --botm: same as (b) to (e) for data/benchmark/botm/*.json using reporterFindings (M7),
   h. write data/eval/results.json with runAt (ISO UTC), gitSha (git rev-parse --short HEAD), and every metric with its N,
   i. print a short table to stdout.
5. package.json scripts: "eval": "bun scripts/eval/run.ts", "eval:photos": "bun scripts/eval/run.ts --photos", "eval:all": "bun scripts/eval/run.ts --photos --botm".
6. docs/EVAL.md (under 60 lines): metric definitions copied from section 4.2, how to run, and the rule "never present a target as a result".
7. Run bun run eval and commit results.json.

Do not: change rules to make numbers better, hand-edit results.json, call StepFun without --live, hide failures (list every missed and extra flag in results.json).
Definition of done: tests pass, results.json committed, PR "feat(eval): evaluation harness and results.json" with the stdout table in the body. Open the PR.
```

### C-09 Demo kit in repo
- **Branch:** `c/demo-kit`
- **Goal:** `docs/DEMO.md` with section 9 of this plan, updated with real numbers from `results.json` and the capture.
- **Estimate:** 45 min at 01:00, updates through 09:00. **Depends on:** C-05, C-08.
- **Coding-agent prompt (C-09):**
```
Branch c/demo-kit from main. Create docs/DEMO.md by copying section 9 of plans/C-evidence-data-demo.md. Replace every {placeholder} with values from data/eval/results.json and data/hospitals/cedars-sinai/capture.json (print the values you used at the top under "Numbers used, with source and date"). If a value is missing, leave the placeholder and list it under "Missing". No em dashes or en dashes. Open a PR "docs(demo): demo script, shot list, Devpost outline".
```

---

## 7. Data provenance rules

1. **No real patient data, ever.** Bills, EOBs, names, and accounts are synthetic. Patient name "SAMPLE PATIENT". Account numbers are random 4 digits. Photos are of printed synthetic bills only; strip EXIF (GPS) before commit.
2. **Every real-world value carries metadata:** source URL, `capturedAt` (ISO UTC), sha256 of the exact bytes read, byte count, the source's own date (`last_updated_on`, effective date, HTTP Last-Modified), and the tool that captured it (Browser Use run id or script name). No metadata, no display.
3. **Show both dates.** Price cards say "price file last updated 2025-11-26, captured Oct 17, 2026" (fill from capture). Never imply the file is newer than it is.
4. **Raw files over 10 MB are not committed.** Commit extracted rows plus hashes. Keep the raw file outside git (`.cache/`). Anyone can re-verify by re-downloading and hashing; note that the hospital may replace the file (hash then changes; recapture and log).
5. **Quotes are verbatim** and must be found by exact string search in the saved evidence. Paraphrase only in our own explanation text, never inside quotation marks.
6. **Licensing.** CPT codes and descriptors are AMA copyrighted (the CMS MUE CSV header says so). Store code numbers and values only, never CPT descriptors; use our own short descriptions or the hospital's own item descriptions from its public file. NCCI PTP files require accepting the AMA license; default to not using them. Hospital price files are public under 45 CFR 180; reuse terms for derived data are UNVERIFIED, so cite and keep small.
7. **KFF Health News (C1).** Use reported facts (line items, amounts, outcome) with a link; never copy article text beyond short quoted phrases; credit "KFF Health News Bill of the Month". KFF's republishing terms are UNVERIFIED; do not republish articles.
8. **Corrections are append-only.** If a capture is wrong, add a new capture file with a new timestamp and mark the old one `"superseded": true`. Never edit a hash.
9. **Synthetic labels.** Every rendered bill has the watermark; every screen or slide that shows a sample bill says "synthetic."
10. **Polite capture.** Identify the user agent, no more than a few downloads per file, no scraping behind logins, respect robots.txt where applicable.

---

## 8. Evaluation methodology and results.json schema

**Method.** Deterministic rules mean M2a and M3 are reproducible: same inputs, same outputs. Run on `main` after each rules change and at 07:30 for the final number. Extraction (M1, M2b) depends on a model; run once per photo, cache outputs, and report the model name and date. Report every miss and every extra flag; small N means we present counts ("caught 11 of 12") alongside percentages. **Planted-errors caveat**: we wrote the synthetic errors, so M2a measures whether rules work as designed, not real-world accuracy. That is why C1 exists.

**`data/eval/results.json` (binding shape for `eval.results`, UI card, pitch):**
```json
{
  "schemaVersion": 1,
  "runAt": "2026-10-18T14:30:00Z",
  "gitSha": "abc1234",
  "coreVersion": "0.1.0",
  "datasets": {
    "synthetic": { "fixtures": 10, "cleanFixtures": 3, "expectedFlags": 0, "skippedRequiresCapture": 0 },
    "photos": { "photos": 0, "conditions": ["flat", "angle", "dim"], "model": "step-5-preview" },
    "botm": { "cases": 0, "reporterFindings": 0, "inScopeFindings": 0 }
  },
  "metrics": {
    "seededRecall": { "caught": 0, "expected": 0, "rate": 0, "byLever": { "duplicate": { "caught": 0, "expected": 0 }, "units": { "caught": 0, "expected": 0 }, "eob_mismatch": { "caught": 0, "expected": 0 }, "published_price": { "caught": 0, "expected": 0 }, "missing_itemization": { "caught": 0, "expected": 0 } } },
    "seededRecallFromPhotos": { "caught": 0, "expected": 0, "rate": null },
    "falseFlagsOnClean": { "count": 0, "cleanFixtures": 3, "items": [] },
    "precision": { "matched": 0, "produced": 0, "rate": 0 },
    "confirmedAmountExact": { "exact": 0, "caughtConfirmed": 0 },
    "evidenceCompleteness": { "complete": 0, "produced": 0, "rate": 0 },
    "auditTimeMs": { "p50": 0, "p95": 0, "runsPerFixture": 20 },
    "photoToLinesSec": { "p50": null, "p95": null, "n": 0 },
    "lineExtraction": { "recall": null, "precision": null, "exactLineRate": null, "totalsMatchRate": null, "byCondition": {}, "fieldAccuracy": { "code": null, "serviceDate": null, "units": null, "chargeCents": null } },
    "botmRecall": { "inScope": { "caught": 0, "total": 0, "rate": null }, "all": { "caught": 0, "total": 0, "rate": null }, "extraFlags": 0 }
  },
  "misses": [ { "fixture": "SB-03", "lever": "units", "lineIds": ["sb03-l04"] } ],
  "extras": [ { "fixture": "SB-10", "lever": "duplicate", "lineIds": ["sb10-l02", "sb10-l03"] } ],
  "notes": ["Synthetic errors were planted by the team; see BotM for published cases."]
}
```
UI rule (tell D): the card shows `caught of expected`, `count` false flags on `cleanFixtures` clean bills, N, and `runAt` date. Null values render as "not measured", never as zero.

---

## 9. The demo kit

### 9.1 Three-minute script (hero path)

Setup before going on: phone mirrored to the screen (or laptop with phone frame), SB-01 printed on paper, app on the sample case start screen, Sentry trace tab open, Browser Use run recording tab open, judge phone card printed (if A1), cached run ready (section 11).

| Time | On screen | Say (exact) |
|---|---|---|
| 0:00 to 0:15 | Title, then the printed bill in hand | "This is a twelve thousand dollar hospital bill. It's synthetic, but the problem isn't. Close to half of insured adults under 65 got a bill last year they thought insurance should have covered. Fewer than half pushed back, mostly because they didn't know they could." |
| 0:15 to 0:35 | Camera capture of the printed SB-01; lines appear | "BetterBill reads every line from a photo with StepFun's step-5-preview. I check them before anything happens. One tap to fix a line if it misread." (Tap Looks right.) |
| 0:35 to 1:05 | Flag list with tier badges | "Three things look wrong, and each shows its proof. The blood count is listed twice, same day, same amount: confirmed from the bill itself. Venipuncture billed four times: Medicare's usual daily limit is two, from the CMS table. That's a billing rule, so we label it that way." |
| 1:05 to 1:40 | Published-price card, ComparePriceBar, source link; cut to Browser Use recording for 5 s | "Here's the real data. Browser Use went to Cedars-Sinai's public price page today and pulled its own price file. The hospital's published cash price for this MRI is {cash}. The bill says six thousand nine hundred. Source and capture date are right here." |
| 1:40 to 1:55 | Savings summary and assistance card | "So: {confirmed} confirmed, {low} to {high} potential, all labelled. And from the hospital's assistance policy, quoted word for word, this household may qualify for help. It's an estimate, not a decision." |
| 1:55 to 2:20 | Letter draft, ApprovalSheet, Approve and send | "BetterBill drafts the dispute letter. Every sentence points to a flag. Nothing is sent until I approve the exact text." (Approve.) "Sent to our test inbox." |
| 2:20 to 2:40 | **If A1:** call starts to the judge's phone | "Want to be the billing office? Read line one of this card." (Judge answers; agent opens: "Hi, this is an automated assistant calling on behalf of a patient.") **If no A1:** show the transcript card labelled "Recorded test call." |
| 2:40 to 2:50 | Sentry trace for the run | "Every step is traced in Sentry: parse, rules, capture, letter, call." |
| 2:50 to 3:00 | Measured results card | "On our ten synthetic bills, we caught {caught} of {expected} planted errors with {falseFlags} false flags on three clean bills{botm_clause}. Goodbill does this with human experts for twenty percent of savings. BetterBill is the self-serve version: you see every reason, and you approve every step." |

`{botm_clause}` if C1 shipped: ", and on {n} published Bill of the Month cases we found {k} of {m} issues reporters found." Otherwise omit. If any placeholder is unknown at 09:00, remove the sentence; never fill it with a target.

**Never say:** "we save patients X", "accurate", "HIPAA compliant", "illegal", "fraud", "overcharge", "better than Goodbill", any prize amount, any number not in `results.json` or section 4.

### 9.2 Booth testing at G1 (20:00 to 20:45)

Visit 2 to 3 sponsor booths (priority: Browser Use, StepFun, Sentry; Photon if time). Show the paste flow on SB-01 in 60 seconds, then ask three questions: "What would make you trust this flag?", "What's confusing?", "What would you need to see for your track?" Log within 5 minutes in `docs/DEMO.md` "Booth log":

| Time | Booth | Person (role only, no names unless offered) | What they tried | Confusing | Trust signals asked for | Track requirement heard | Action and owner |
|---|---|---|---|---|---|---|---|

Post the top 3 actions in team chat by 20:50.

### 9.3 Video shot list and recording plan (07:00 to 09:00, edit 09:00 to 10:00)

Target 2:30 to 3:00, 1080p, screen capture plus phone close-ups, voiceover recorded separately in a quiet room. Tools: OS screen recorder, phone camera, any editor the team has (UNVERIFIED which; pick at 01:00).

| # | Shot | Length | Source |
|---|---|---|---|
| 1 | Printed bill on a table, hand picks it up | 5 s | Phone camera |
| 2 | Hook text: the Commonwealth numbers with citation | 8 s | Slide |
| 3 | Camera capture in app, lines appear, one edit | 15 s | Phone screen recording |
| 4 | Flag list, tap duplicate, evidence sheet | 15 s | Phone screen |
| 5 | Units flag evidence with CMS source | 8 s | Phone screen |
| 6 | Browser Use run recording navigating Cedars-Sinai price page | 10 s | Browser Use live preview or recording (UNVERIFIED export) or screen capture |
| 7 | Published-price card with source and capture date | 10 s | Phone screen |
| 8 | Desktop full insights table | 8 s | Laptop 1280 px |
| 9 | Assistance card with verbatim quote | 8 s | Phone |
| 10 | Letter approval and send; inbox receives it | 15 s | Phone + laptop |
| 11 | Call: judge or teammate answers; transcript card (labelled recording if not live) | 20 s | Phone + camera |
| 12 | SB-04 EOB mismatch flag (second bill) | 8 s | Phone |
| 13 | Sentry trace and one bug found via trace | 12 s | Laptop |
| 14 | Measured results card, BotM if done | 10 s | Phone |
| 15 | Close: Goodbill line, team, repo link | 10 s | Slide |

Plan: 07:00 record shots 3 to 10 on main build with a fresh case; 07:40 shots 11 to 14; 08:10 voiceover (reads 9.1 lines); 08:30 rough cut; 09:30 final; 10:00 upload (YouTube unlisted or as Devpost requires; UNVERIFIED) and paste link.

### 9.4 Devpost write-up outline (honest claims)

1. **Inspiration:** Commonwealth numbers (N1 to N3 safe wording, cited).
2. **What it does:** photo to confirmed lines, deterministic audit with evidence tiers, published-price comparison from a real hospital file, assistance check, approved letter, approved call, traces.
3. **How we built it:** TanStack Start, oRPC, Drizzle/Postgres (Tiger Data), Better Auth, Polar sandbox, Vercel, StepFun step-5-preview (photo reading), Gemini (letter drafting), Browser Use (live capture), Photon + ElevenLabs (call), Sentry + evlog (traces), Paper (design), Fetch (only if gated in).
4. **Evidence and data:** synthetic bills (say we planted the errors), CMS MUE table (date, link), Cedars-Sinai price file (dates, hash), assistance policy (quote, link), 2026 HHS FPL.
5. **Results (measured):** paste from `results.json` with N and date. Include misses.
6. **Challenges:** price files are huge and messy (multiple items per code, one 72148 item described "PET Scan"); LA General publishes no discounted cash prices; MUE allows 4 CBCs a day so the duplicate flag had to ask, not accuse.
7. **What's next:** real user interviews, more hospitals, compliance review, human escalation.
8. **Honesty box:** synthetic bills; no real patients; call goes to a test phone; not legal or medical advice; Goodbill exists and handles unpaid hospital bills with experts.
9. **Tracks (opt into every one that qualifies; confirm names on the LA Hacks Devpost page by 22:00):** Applied Intelligence, Browser Use, StepFun, Sentry, Photon, Fetch.ai (if in), Paper, MLH Gemini, MLH ElevenLabs, MLH Tiger Data, MLH GoDaddy (if domain), Commit Fellowship. Check each track's extra requirements (for example a sponsor form or specific wording) and list them in `docs/DEMO.md`.

### 9.5 Pitch slides (5 slides)

1. **Problem:** one person, one $12,000 bill; N1 to N3 with citation.
2. **Product:** the phone flow in three frames (photo, flags with tiers, approve).
3. **Real data:** hospital's own published price vs billed, Browser Use capture with date; CMS rule source.
4. **Measured:** results card (recall, false flags, N, date; BotM if done) and the "we planted these" caveat.
5. **Why us vs Goodbill, and next:** self-serve, evidence-first, you approve every step; free audit, optional assisted call (hypothesis); team.

### 9.6 Q and A prep

| Question | Answer (say this) |
|---|---|
| You planted the errors. | "Yes. The synthetic set tests that the rules work as designed, and we report the misses. {If C1:} That's why we also ran it on {n} real published Bill of the Month cases and report what we caught versus the reporters." {If no C1:} "The real-data part is the hospital price file, which we didn't write." |
| Goodbill already exists. | "It does, and it's good for people who want experts to negotiate for 20% of savings. We're the self-serve version: instant, free to audit, every reason shown, and you approve each step. We don't claim more negotiating power." |
| HIPAA? | "The demo uses only synthetic data. Whether HIPAA applies to a consumer app like this depends on how it's set up, and we haven't had a compliance review, so we don't claim compliance. We keep data minimal and never sell it." |
| How accurate is it? | Quote `results.json` with N and date, including misses and false flags. "Small N, so treat it as a first measurement." |
| Hospitals won't talk to bots. | "Maybe not always. The letter works without a call, the call identifies itself as automated, and the plan includes a human handoff. That's an open question we'd test with billing offices." |
| How do you make money? | "Free audit and letters. An optional assisted call tier, priced below Goodbill's 20%, through Polar; it's a hypothesis, unit costs aren't measured yet. Later, employer benefits." |
| Why not just ChatGPT? | "A chat model can guess. We read every line, you confirm it, then deterministic rules flag with cited sources, the hospital's own price file is captured live with a hash and date, and every action needs your approval and is traced." |
| Is the price comparison fair? | "It's the same hospital's own published cash price, with its file date and our capture date. A self-pay patient can ask for it. It's leverage, not proof of an error." |
| Why is two CBCs flagged when Medicare allows four? | "We don't flag the units. We flag that the same charge appears twice with the same date and amount, and we ask the hospital to confirm." |
| Where does the MRI price come from? | Show capture.json fields: URL, file date, capture time, hash. |

### 9.7 Rehearsal schedule

| Time | Rehearsal | Goal |
|---|---|---|
| 02:30 | Dry run 1 (C plus whoever is awake), timed | Cut to 3:00; find missing screens |
| 07:00 | Walkthrough on main build before video | Confirm every placeholder filled |
| 08:40 | Rehearsal 2, full team, timed, with A1 if in | Under 3:00, handoffs clean |
| 10:45 | Rehearsal 3 with fallback drill (airplane mode: cached run) | Fallbacks smooth |
| 11:40 | Rehearsal 4, final | Confidence; device checks |
| 12:15 | Device check | Battery over 80%, sample case reset, Do Not Disturb on |

### 9.8 Submission checklist (clock times)

- [ ] 22:00 Devpost project created, all members joined, track list confirmed.
- [ ] 01:30 Devpost draft text in repo (`docs/DEMO.md` Devpost section).
- [ ] 07:30 Final `bun run eval:all` on main; numbers copied into Devpost and slides.
- [ ] 09:00 Freeze; repo public (confirm with B); README has setup, sponsors used, honesty box.
- [ ] 10:00 Video uploaded, link tested in a private window.
- [ ] **10:30 Devpost submitted (C)** with video, repo, preview URL, screenshots, every track opted in.
- [ ] **11:30 Fetch Submission Agent done by A** (only if Fetch is in); C confirms in chat.
- [ ] 11:45 Re-open Devpost, verify links, video plays, tracks selected; edit if allowed.
- [ ] **12:00 Final deadline**; screenshot the submitted page.
- [ ] 12:30 Judging: printed SB-01, judge call card, laptop and phone charged.

---

## 10. Strengthening options (pick one after G2)

### C1 Bill of the Month benchmark (recommended; 2.5 h)
- **Branch:** `c/botm-benchmark`
- **Why:** answers "you planted the errors" with a real recall number.
- **Selection rules:** pick 5 to 8 KFF Health News Bill of the Month cases where the article reports line items or amounts that map to BetterBill levers (duplicates, units, bill vs EOB, published price, assistance, missing itemization). Skip cases about prior authorization, coverage termination, or drug copay cards (out of scope; count them as excluded with reason). Index: https://kffhealthnews.org/news/tag/bill-of-the-month/ (197 results listed on 2026-10-17). Candidates to check (fit UNVERIFIED until read): "She Paid Her Husband's Hospital Bill. A Year After His Death, They Wanted More Money." (https://kffhealthnews.org/news/article/widow-hospital-collections-bill-adjustment-postmortem-bill-of-the-month-august-2023/), "She Left After Waiting Hours in the Emergency Room. The ER Billed Her Anyway." (Sept 2026), "An Urgent Care Treated Her Allergic Reaction. An ER Monitored Her, For $6,700." (April 2026), "After Her Bout of Amnesia, a $59,000 Billing Dispute Wouldn't Go Away" (May 2026). Find the rest from the index.
- **Honesty:** if the article doesn't give a line item, don't invent one. Mark `lineSource: "reported"` vs `"reconstructed"` per line; reconstructed lines use only amounts stated in the article and are flagged as such. Results are reported with that caveat.
- **Files:** `data/benchmark/botm/BOTM-01.json` ... and `data/benchmark/botm/INDEX.md` (case list with URLs and exclusions).

**Coding-agent prompt (C1):**
```
Branch c/botm-benchmark from main.

For each article URL given to you by the human (5 to 8), read the article and create data/benchmark/botm/BOTM-NN.json:
{
  "fixtureVersion": 1,
  "id": "BOTM-NN",
  "title": "<your own short neutral title, not the headline>",
  "synthetic": false,
  "scenario": "botm",
  "source": { "publisher": "KFF Health News", "series": "Bill of the Month", "url": "<article url>", "published": "<YYYY-MM-DD>", "accessedAt": "<ISO UTC>" },
  "bill": <Bill per packages/core/src/schemas.ts; hospital as named in the article; lines only from amounts the article states>,
  "eob": <Eob or null>,
  "lineSources": { "<lineId>": "reported" | "reconstructed" },
  "reporterFindings": [ { "id": "RF1", "summary": "<your own words, under 20 words>", "lever": "<lever or null>", "inScope": true|false, "lineIds": ["..."], "outcome": "<your own words>" } ],
  "expected": { "clean": false, "flags": [ <one per in-scope reporter finding: lever, tier, lineIds, amountCents or null> ] }
}
Rules:
- Never copy more than 10 consecutive words from an article. Summaries are your own words.
- Never invent a code, date, or amount. If the article gives no code, set code null and codeType null. If the article gives no date, use null.
- accountRefMasked null. No patient names in JSON (use "the patient").
- Out-of-scope findings (prior auth, coverage terminations, network disputes without bill lines) get inScope false and lever null.
Then:
1. Write data/benchmark/botm/INDEX.md listing included and excluded articles with one-line reasons.
2. Run bun run fixtures:validate (it already globs data/benchmark/botm).
3. Run bun run eval -- --botm and paste the M7 output in the PR body.
Do not: tune rules to these cases, paraphrase loosely to fit a lever, include images from the articles.
Definition of done: 5 to 8 case files validate, INDEX.md, M7 in results.json, PR "feat(eval): Bill of the Month benchmark". Open the PR.
```

### C2 Real LA hospital data, live and local (2 h)
- **Branch:** `c/la-live-data`
- **Why:** second real hospital and a live capture during the demo.
- **Scope:** (1) LA General (county) price rows for demo codes from its CSV (gross charges only, since the file has no discounted cash values) and the LA DHS ATP policy quotes; (2) a "Refresh from source" button path that re-runs the Browser Use page check (not the full MRF) and shows the new capture time; cached result is the fallback.
- **Files:** `scripts/hospitals/extract_csv_mrf.py`, `data/hospitals/la-general/capture.json`, `data/hospitals/la-dhs/policy.json`.

**Coding-agent prompt (C2):**
```
Branch c/la-live-data from main.
1. Download https://dhs.lacounty.gov/cms-hpt.txt to data/hospitals/la-general/evidence/cms-hpt.txt; sha256 it.
2. Stream the LA General MRF URL listed there (expected: https://file.lacounty.gov/SDSInter/dhs/1157354_956000927_LosAngelesGeneralMedicalCenter_standardcharges.csv; about 53 MB) to .cache/, sha256 it, record bytes.
3. scripts/hospitals/extract_csv_mrf.py: Python csv module. Row 1 is general headers, row 2 their values (hospital_name, last_updated_on, version, ...), row 3 is the item header. Columns of interest: description, code|1, code|1|type, code|2, code|2|type, code|3, code|3|type, billing_class, setting, standard_charge|gross, standard_charge|discounted_cash, standard_charge|min, standard_charge|max. A code may be in code|1, code|2, or code|3.
4. For codes 72148 and 85025 write every matching row into data/hospitals/la-general/capture.json using the same shape as data/hospitals/cedars-sinai/capture.json, plus "billingClass". Convert dollars to integer cents. Empty cells become null.
5. Count rows with a non-empty standard_charge|discounted_cash and store it as "discountedCashRowsInFile". (Expected 0 as of 2026-10-17; report whatever you find.)
6. Policy: capture https://dhs.lacounty.gov/patient-information/get-coverage/financial-services/ text and https://file.lacounty.gov/SDSInter/dhs/1131808_PolicyDocument.pdf into data/hospitals/la-dhs/evidence/, hash both, and write policy.json with verbatim quotes only (shape from ticket C-06).
Do not: label a gross charge as a cash price, commit the CSV, invent thresholds.
Definition of done: both JSON files with hashes, PR "feat(data): LA General prices and LA DHS assistance policy". Open the PR.
```

**Pick rule at G2:** choose C1 unless the published-price lever is not working with Cedars-Sinai data by 00:00; then choose C2 (LA General gross charges plus LA DHS policy keep a real-data moment alive).

---

## 11. Fallbacks, cut order, and risks

**Cached fallbacks C owns (ready by 07:00).**
- Cached `capture.json` (never live-only). Live Browser Use run is a bonus; the recording is the backup.
- Cached extraction outputs for SB-01 photos so the demo can replay a known-good parse if StepFun is slow (labelled "cached run" if used).
- A screen recording of the full hero path from 07:00 in case the venue network fails.

**C cut order if behind (cut the first item first).**
1. C-03b unbundling pairs.
2. Strengthening option (C1 or C2).
3. Photo conditions beyond "flat" (keep at least 5 flat photos for M1).
4. SB-07 summary bill (missing itemization).
5. Policy capture for Cedars-Sinai (fall back to LA DHS policy, labelled as LA County's program).
6. Live Browser Use in the demo (use the recording plus capture.json).
- **Never cut:** SB-01 and the clean controls, the MUE table, the published price from a real file with dates (or remove the lever from the demo entirely rather than show an unsourced number), `results.json` with measured numbers, the disclaimer.

**Risks.**
| Risk | Mitigation |
|---|---|
| Cedars-Sinai file changes or blocks downloads | Capture tonight with hashes; keep extracted rows; LA General gross charge as backup |
| Price file selection looks cherry-picked | Store `allMatches` and `selection` reason; show file date |
| Demo bill naming a real hospital looks like an accusation | Watermark and spoken line "synthetic bill, real price file"; D-1 decided at G0 |
| Recall number looks too good (we wrote the errors) | Say so; show misses; C1 benchmark |
| Commonwealth numbers misquoted | Use section 4 safe wording only; footnote with survey name and year |
| C becomes the bottleneck at 01:00 | Hand open evidence tickets to B by 01:00 with prompts in this file |
| Browser Use quota or model behavior | Max 5 runs; deterministic scripts do the hashing; recording as fallback |
| Video runs long | Hard cap 3:00; cut shot 12 first, then 8 |
| Devpost tracks missed | Track list confirmed at 22:00; second check at 11:45 |

---

## 12. UNVERIFIED items

1. Cedars-Sinai 72148 and 85025 prices are from a partial streamed read on 2026-10-17 (about 884 MB); full-file hash, total size, and whether other items change the selection are unverified until C-05.
2. Whether the team's earlier saved LA General file exists and matches today's hash.
3. Cedars-Sinai financial assistance policy URL, thresholds, and quotes (not read).
4. LA DHS ATP policy PDF details beyond the web page's 200% FPL sentence.
5. California Hospital Fair Pricing Act current thresholds (do not quote a number).
6. Redistribution terms for a CMS MUE subset containing CPT code numbers; NCCI PTP license terms and modifier indicator meanings.
7. Reuse terms for derived hospital price data and for KFF Health News facts.
8. Browser Use: free allowance size, default model, recording export fields, run object attribute names beyond `id`, `status`, `output`, `result`, `error`.
9. Fit of the listed Bill of the Month candidates (not read).
10. B's audit entry point name and signature; whether `missing_itemization` is implemented.
11. Devpost track names, sponsor-specific requirements, video host requirements, and whether edits are allowed after 10:30.
12. Prize amounts other than Paper; Goodbill facts were verified by the team, not re-read by C.
13. HIPAA applicability to BetterBill (no compliance claim).
14. Which video editor the team has.
