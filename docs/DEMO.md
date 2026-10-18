# BetterBill demo kit

Owner: C. Built from `docs/plans/C-evidence-data-demo.md` section 9 with measured values. Update this file, not the plan, as numbers change.

## Numbers used, with source and date

| Placeholder | Value | Source |
|---|---|---|
| `{cash}` | $5,143.15 | `data/hospitals/cedars-sinai/capture.json`: 72148, "HB MRI L-SPINE WO CONTRAST", outpatient discounted cash 514315 cents. Price file `last_updated_on` 2025-11-26, captured 2026-10-17T23:00:38Z, sha256 `8c188ab3...2dcd2dbf` |
| `{confirmed}` | $84.00 | `runAudit` on SB-01: duplicate 85025, tier confirmed, 8400 cents |
| `{low}` to `{high}` | $1,832.85 (one figure) | `runAudit` on SB-01 as the app runs it: `scripts/gen-api-data.ts` bundles cash prices only, so potentialLow = potentialHigh = 183285 cents (units $76.00 + published price $1,756.85). Say "about $1,833 more potential". If the API later passes insurer-negotiated rates, the high end widens (to $6,675.01 with the file's lowest negotiated rate); re-check at 07:30 |
| UCLA (SB-11, optional beat) | MRI cash $3,063.50; gap $3,836.50; SB-11 $84.00 confirmed + $6,083.50 potential | `data/hospitals/ucla-ronald-reagan/capture.json` (PR #41): Ronald Reagan UCLA price file dated 2026-03-29, captured 2026-10-18T00:55Z, sha256 `97215d1e...51c5a6`. UCLA's cash lines carry CDM item numbers only; the CPT code is read from the item number (`codeSource: parsed_from_cdm`) |
| `{caught}` of `{expected}` | 12 of 12 | `data/eval/results.json` `metrics.seededRecall`, 10 synthetic bills |
| `{falseFlags}` | 0 on 3 clean bills | `results.json` `metrics.falseFlagsOnClean` |
| `{botm_clause}` | 1 of 3 in-scope findings, 5 cases (13 findings, 3 in scope) | `results.json` `metrics.botmRecall` (PR #29) |
| Assistance | "May qualify" (estimate): household 3, $52,000 = 190.3% FPL, at or under Cedars-Sinai's 400% charity care line | `data/hospitals/cedars-sinai/policy.json` quote "Charity Care will be made available to patients whose family income is at or below 400% of FPL." + `fpl-2026.json`. This comes from `assistance.check`, not `runAudit` |
| Audit time | p50 0.009 ms, p95 0.048 ms | `results.json` `metrics.auditTimeMs` (20 runs x 10 bills) |

**Run status:** the numbers above were re-measured at 2026-10-17T23:32Z on **real main code** (main 4725b9a + the eval harness, PR #34; Bill of the Month via PR #29), not a local merge. Same results as the earlier integration run. They reach `main` when #34 and #29 merge. **Re-run `bun run eval:all` on main at 07:30** (and `bun run data:gen`, since `results.json` is bundled into the API) and update this table before the video and Devpost.

**Evidence completeness is 11 of 12.** SB-07's missing-itemization flag has no source link (finding for B on #12). Do not claim "every flag cites a source" until that is fixed and re-measured.

## Missing

- Seeded recall from photos (M2b): **not measured** (end-to-end audit on photo-read lines). Line extraction and photo time **are** measured; see the table below.

**Photo reading (measured):** `data/eval/extraction.json`, written by B's `bun run photos:read`, measured 2026-10-18T02:57Z with StepFun step-5-preview. 35 phone photos of 7 printed synthetic bills, 5 conditions each. A line counts only when date, code, units and charge are all exact.

| Condition | Line recall | Perfect photos |
|---|---|---|
| flat | 100% | 7 of 7 |
| dimangle | 93% | 6 of 7 |
| angle | 86% | 5 of 7 |
| crumpled | 83.7% | 5 of 7 |
| dim | 81.4% | 5 of 7 |
| **overall** | **88.8%** | **28 of 35** |

Photo to lines: p50 26.2 s, p90 58.3 s (target under 30 s at p50: met). Safe line: "On 35 phone photos of printed bills, BetterBill read 89% of lines exactly, and every line on flat, well-lit photos." The user confirms lines before any audit, so misreads are caught before flags.
- Browser Use recording link: it exists but is **not public** (team decision). Use a screen capture of the run in the video, or add the link on Devpost after a teammate watches it.
- Track names and extra requirements: confirm on the LA Hacks Devpost page (UNVERIFIED here).

## Decision D-1 (record)

SB-01 and SB-06 name Cedars-Sinai Medical Center so the published-price lever compares to that hospital's own file. Every rendered page carries "SYNTHETIC DEMO BILL" and "Not issued by Cedars-Sinai. Charges on this bill are invented." **Team confirmation still needed.**

## Booth log

| Time | Booth | Person (role only, no names unless offered) | What they tried | Confusing | Trust signals asked for | Track requirement heard | Action and owner |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Demo kit (from plan C section 9)

### 1. Three-minute script (hero path)

This script follows the **mobile app (Expo Go)** and the mobile design canvas (lean flow L1 to L7, W1 to W4): one approval covers the call and the email, and the call is watched through "Listen in". The earlier letter-first web script is replaced. The web app can still carry the desktop shot (section 3, shot 8).

Setup before going on: phone running the Expo Go build, mirrored to the screen; app freshly installed so the three welcome cards show; SB-01 printed on paper; laptop with the test inbox, the Sentry trace tab, and the Browser Use run recording open; judge phone card printed (if A1); cached run ready (section 11).

| Time | On screen (mobile) | Say (exact) |
|---|---|---|
| 0:00 to 0:15 | Title, then the printed bill in hand | "This is a twelve thousand dollar hospital bill. It's synthetic, but the problem isn't. Close to half of insured adults ages 19 to 64 got a bill in the past year they thought insurance should have covered. Fewer than half pushed back, mostly because they didn't know they could." |
| 0:15 to 0:25 | Welcome cards: swipe 1 to 3, tap "Check my bill" | "BetterBill does three things. Snap your bill. See what's wrong, with proof. And we contact billing for you, only after you approve." |
| 0:25 to 0:45 | Camera on the printed SB-01, reading animation, confirm lines; tap "Looks right" | "It reads every line from a photo with StepFun's step-5-preview. I check the lines before anything happens. One tap to fix a line if it misread." |
| 0:45 to 1:10 | Checking rings, then Results: fair balance card and three flags with their tier | "Three things look wrong, and each shows its proof. The blood count is listed twice, same day, same amount: confirmed from the bill itself. The blood draw is billed four times: Medicare's usual daily limit is two, from the CMS table. That's a billing rule, so we label it that way. Eighty-four dollars confirmed, about eighteen hundred thirty-three dollars more potential, all labelled." |
| 1:10 to 1:40 | Tap the MRI flag: flag detail with the source rows; cut to the Browser Use recording for 5 s | "Here's the real data. On October 17, Browser Use went to Cedars-Sinai's public price page and found its own price file; we hashed all 884 megabytes of it. The hospital's published cash price for this MRI is five thousand one hundred forty-three dollars and fifteen cents. The bill says six thousand nine hundred. Source and dates are right here." |
| 1:40 (optional, +10 s) | Switch the sample to SB-11; MRI flag detail | "Same bill, but at the hospital hosting this hackathon. UCLA's own published cash price for this MRI is three thousand sixty-three fifty. That's thirty-eight hundred dollars less than billed." Cut this beat if the run is over 3:00. |
| 1:40 to 2:00 | "Handle it for me", then the plan screen; open "See what we'll say" and "See the email"; tap "Approve and start" | "Now BetterBill acts for me. It will call billing and email them every error, plus a request for a fully itemized bill. I see the exact words of both. One tap approves them, and nothing goes out before that." |
| 2:00 to 2:25 | Live tracking, tap "Listen in". **If A1:** the judge's phone rings. Laptop: the email lands in the test inbox | **If A1:** "Want to be the billing office? Read line one of this card." (Judge answers; agent opens: "Hi, this is an automated assistant calling on behalf of a patient.") **If no A1:** show the transcript labelled "Recorded test call." Then: "And the written version is already in their inbox." |
| 2:25 to 2:40 | Back to Home: "Waiting on billing"; tap the bill for its timeline | "When the call ends, I get a reference number and a text. Home shows where my bill stands and what happens next." |
| 2:40 to 2:50 | Sentry trace for the run | "Every step is traced in Sentry: read, rules, capture, call, email." |
| 2:50 to 3:00 | Measured results card | "On our ten synthetic bills, we caught twelve of twelve planted errors with zero false flags on three clean bills, and on five published Bill of the Month cases, we caught one of the three problems that fall within what BetterBill checks. Goodbill does this with human experts for twenty percent of savings. BetterBill is the self-serve version: you see every reason, and you approve every step." |

**Open before rehearsal:** (1) A confirms that one "Approve and start" tap records an approval event for each draft (call script and email); if not, the plan screen needs two taps and the 1:40 line changes to "two taps". (2) The assistance beat is **parked** for the mobile flow (`assistance.check` still exists in the API). Use the assistance numbers in section "Numbers used" only if a judge asks.

If any number changes at the 07:30 final run, update it here first; never fill a gap with a target.

**Never say:** "we save patients X", "accurate", "HIPAA compliant", "illegal", "fraud", "overcharge", "better than Goodbill", any prize amount, any number not in `results.json` or section 4.

### 2. Booth testing at G1 (20:00 to 20:45)

Visit 2 to 3 sponsor booths (priority: Browser Use, StepFun, Sentry; Photon if time). Show the paste flow on SB-01 in 60 seconds, then ask three questions: "What would make you trust this flag?", "What's confusing?", "What would you need to see for your track?" Log within 5 minutes in `docs/DEMO.md` "Booth log":

| Time | Booth | Person (role only, no names unless offered) | What they tried | Confusing | Trust signals asked for | Track requirement heard | Action and owner |
|---|---|---|---|---|---|---|---|

Post the top 3 actions in team chat by 20:50.

### 3. Video shot list and recording plan (07:00 to 09:00, edit 09:00 to 10:00)

Target 2:30 to 3:00, 1080p, screen capture plus phone close-ups, voiceover recorded separately in a quiet room. Tools: OS screen recorder, phone camera, any editor the team has (UNVERIFIED which; pick at 01:00).

| # | Shot | Length | Source |
|---|---|---|---|
| 1 | Printed bill on a table, hand picks it up | 5 s | Phone camera |
| 2 | Hook text: the Commonwealth numbers with citation | 8 s | Slide |
| 2b | Welcome cards swiped 1 to 3 (Expo Go) | 6 s | Phone screen recording |
| 3 | Camera capture in app, reading animation, confirm lines, one edit | 15 s | Phone screen recording |
| 4 | Results: fair balance and three flags with tiers | 10 s | Phone screen |
| 5 | Units flag evidence with CMS source | 8 s | Phone screen |
| 6 | Browser Use run recording navigating Cedars-Sinai price page | 10 s | Browser Use live preview or recording (UNVERIFIED export) or screen capture |
| 7 | MRI flag detail with source rows and dates | 10 s | Phone screen |
| 7b | Optional: SB-11 at UCLA, MRI flag detail | 6 s | Phone screen |
| 8 | Desktop full insights table (web app) | 8 s | Laptop 1280 px |
| 9 | Plan screen: call script and email expanded, "Approve and start" | 10 s | Phone |
| 10 | Live tracking, "Listen in"; test inbox receives the email | 15 s | Phone + laptop |
| 11 | Call: judge or teammate answers; transcript (labelled recording if not live) | 20 s | Phone + camera |
| 11b | Home "Waiting on billing" and the bill's timeline | 6 s | Phone |
| 12 | SB-04 EOB mismatch flag (second bill) | 8 s | Phone |
| 13 | Sentry trace and one bug found via trace | 12 s | Laptop |
| 14 | Measured results card, BotM if done | 10 s | Phone |
| 15 | Close: Goodbill line, team, repo link | 10 s | Slide |

Plan: 07:00 record shots 3 to 10 on main build with a fresh case; 07:40 shots 11 to 14; 08:10 voiceover (reads 9.1 lines); 08:30 rough cut; 09:30 final; 10:00 upload (YouTube unlisted or as Devpost requires; UNVERIFIED) and paste link.

### 4. Devpost write-up outline (honest claims)

1. **Inspiration:** Commonwealth numbers (N1 to N3 safe wording, cited).
2. **What it does:** photo to confirmed lines, deterministic audit with evidence tiers, published-price comparison from a real hospital file, assistance check, approved letter, approved call, traces.
3. **How we built it:** TanStack Start, oRPC, Drizzle/Postgres (Tiger Data), Better Auth, Polar sandbox, Vercel, StepFun step-5-preview (photo reading), Gemini (letter drafting), Browser Use (live capture), Photon + ElevenLabs (call), Sentry + evlog (traces), Paper (design).
4. **Evidence and data:** synthetic bills (say we planted the errors), CMS MUE table (date, link), Cedars-Sinai price file (dates, hash), assistance policy (quote, link), 2026 HHS FPL.
5. **Results (measured):** paste from `results.json` with N and date. Include misses.
6. **Challenges:** price files are huge and messy (multiple items per code, one 72148 item described "PET Scan"); LA General publishes no discounted cash prices; MUE allows 4 CBCs a day so the duplicate flag had to ask, not accuse.
7. **What's next:** real user interviews, more hospitals, compliance review, human escalation.
8. **Honesty box:** synthetic bills; no real patients; call goes to a test phone; not legal or medical advice; Goodbill exists and handles unpaid hospital bills with experts.
9. **Tracks (opt into every one that qualifies; confirm names on the LA Hacks Devpost page by 22:00):** Applied Intelligence, Browser Use, StepFun, Sentry, Photon, Paper, MLH Gemini, MLH ElevenLabs, MLH Tiger Data, MLH GoDaddy (if domain), Commit Fellowship. Check each track's extra requirements (for example a sponsor form or specific wording) and list them in `docs/DEMO.md`.

### 4a. Devpost draft text (fill from the 07:30 run; numbers below are from the integration run)

**Tagline:** Snap your hospital bill. See what looks wrong, with proof. You approve every step.

**Inspiration.** Close to half (45%) of insured adults ages 19 to 64 got a medical bill in the past year they thought insurance should have covered. Fewer than half pushed back, mostly because they didn't know they could. When people disputed, 38% saw the bill reduced or eliminated. (Commonwealth Fund Health Care Affordability Survey 2023, n = 5,602, published Aug 1, 2024.)

**What it does.** BetterBill reads every line of a hospital bill from a photo or pasted text, and you confirm the lines. A deterministic rules engine then flags duplicates, units above Medicare's usual daily limit, bill vs insurer EOB mismatches, charges above the hospital's own published cash price, and summary bills that need itemizing. Each flag shows its evidence tier: confirmed from your bill, billing rule, hospital's published price, or estimate. It checks the hospital's financial assistance policy, quoted word for word, drafts a dispute letter where every sentence points to a flag, and places a call only after you approve the exact words.

**Real data, captured and hashed.**
- Cedars-Sinai's machine-readable price file: 883,973,507 bytes, sha256 recorded, file dated 2025-11-26. Found by Browser Use and captured Oct 17, 2026. Its own outpatient cash price for a lumbar MRI without contrast (CPT 72148) is $5,143.15.
- Cedars-Sinai's Financial Assistance Policy: 19 quotes, each verified word for word against the PDF or page. Charity care is at or below 400% of the poverty guideline; discounts run from 401% to 600%.
- CMS Medically Unlikely Edits (outpatient hospital, effective 2026-10-01) and the 2026 HHS poverty guidelines, both with source links and hashes.

**Measured results** (fill the date from `results.json` `runAt`):
- On 10 synthetic bills, we caught 12 of 12 planted errors, with 0 false flags on 3 clean bills. We wrote these errors ourselves, so this shows the rules work as designed.
- On 5 recreated KFF Health News Bill of the Month cases, we caught 1 of the 3 reporter findings within BetterBill's scope. We missed an undated duplicate and a price comparison for a hospital whose price file we haven't captured. The other 10 findings (coding level, prior authorization, device prices) are outside what BetterBill checks.
- The audit runs in under a millisecond per bill (p50 0.009 ms).
- Photo reading: on 35 phone photos of 7 printed synthetic bills (5 lighting and handling conditions), step-5-preview read 88.8% of lines exactly (100% on flat, well-lit photos; 81.4% in dim light), with p50 26.2 seconds per photo. You confirm every line before the audit runs.

**How we built it.** TanStack Start, oRPC, Drizzle + Postgres (Tiger Data), Better Auth, Polar (sandbox), Vercel; StepFun step-5-preview for bill photos; Gemini for letter drafting; Browser Use for live hospital data capture; Photon + ElevenLabs for the call; Sentry + evlog for traces; Paper for design. (Confirm each one is load-bearing before submitting.)

**Challenges.**
- Price files are huge and messy. Cedars-Sinai's is 884 MB, and several items share one code, including one labelled "PET Scan" for the lumbar MRI code.
- LA General publishes no discounted cash prices.
- Medicare allows up to four CBCs a day, so our duplicate flag asks the hospital to confirm rather than accusing it.

**Honesty box.** The bills are synthetic and there are no real patients. Calls go to a test phone. BetterBill is informational, not legal or medical advice. Goodbill exists and handles unpaid hospital bills with human experts for 20% of savings, capped at $1,000. BetterBill is the self-serve, evidence-first version.

**What's next.** Real user interviews, more hospitals' price files, dated-line handling for undated bills, a compliance review, and a human escalation path.

### 5. Pitch slides (5 slides)

1. **Problem:** one person, one $12,000 bill; N1 to N3 with citation.
2. **Product:** the phone flow in three frames (photo, flags with tiers, approve).
3. **Real data:** hospital's own published price vs billed, Browser Use capture with date; CMS rule source.
4. **Measured:** results card (recall, false flags, N, date; BotM if done) and the "we planted these" caveat.
5. **Why us vs Goodbill, and next:** self-serve, evidence-first, you approve every step; free audit, optional assisted call (hypothesis); team.

### 6. Q and A prep

| Question | Answer (say this) |
|---|---|
| You planted the errors. | "Yes. The synthetic set tests that the rules work as designed, and we report the misses. That's why we also ran it on five real published Bill of the Month cases: we caught one of the three problems in our scope, and we show the two we missed and why. The real-data part, the hospital price file, is something we didn't write." |
| Goodbill already exists. | "It does, and it's good for people who want experts to negotiate for 20% of savings. We're the self-serve version: instant, free to audit, every reason shown, and you approve each step. We don't claim more negotiating power." |
| HIPAA? | "The demo uses only synthetic data. Whether HIPAA applies to a consumer app like this depends on how it's set up, and we haven't had a compliance review, so we don't claim compliance. We keep data minimal and never sell it." |
| How accurate is it? | Quote `results.json` with N and date, including misses and false flags. "Small N, so treat it as a first measurement." |
| Hospitals won't talk to bots. | "Maybe not always. The letter works without a call, the call identifies itself as automated, and the plan includes a human handoff. That's an open question we'd test with billing offices." |
| How do you make money? | "Free audit and letters. An optional assisted call tier, priced below Goodbill's 20%, through Polar; it's a hypothesis, unit costs aren't measured yet. Later, employer benefits." |
| Why not just ChatGPT? | "A chat model can guess. We read every line, you confirm it, then deterministic rules flag with cited sources, the hospital's own price file is captured live with a hash and date, and every action needs your approval and is traced." |
| Is the price comparison fair? | "It's the same hospital's own published cash price, with its file date and our capture date. A self-pay patient can ask for it. It's leverage, not proof of an error." |
| Why is two CBCs flagged when Medicare allows four? | "We don't flag the units. We flag that the same charge appears twice with the same date and amount, and we ask the hospital to confirm." |
| How do you know UCLA's code? | "UCLA's file puts cash prices on its chargemaster lines, which carry UCLA's own item numbers, not CPT codes. The CPT code is part of that item number, and it matches the description. We label it as read from the item number, not as a code UCLA tagged." |
| Where does the MRI price come from? | Show capture.json fields: URL, file date, capture time, hash. |

### 7. Rehearsal schedule

| Time | Rehearsal | Goal |
|---|---|---|
| 02:30 | Dry run 1 (C plus whoever is awake), timed | Cut to 3:00; find missing screens |
| 07:00 | Walkthrough on main build before video | Confirm every placeholder filled |
| 08:40 | Rehearsal 2, full team, timed, with A1 if in | Under 3:00, handoffs clean |
| 10:45 | Rehearsal 3 with fallback drill (airplane mode: cached run) | Fallbacks smooth |
| 11:40 | Rehearsal 4, final | Confidence; device checks |
| 12:15 | Device check | Battery over 80%, sample case reset, Do Not Disturb on |

### 8. Submission checklist (clock times)

- [ ] 22:00 Devpost project created, all members joined, track list confirmed.
- [ ] 01:30 Devpost draft text in repo (`docs/DEMO.md` Devpost section).
- [ ] 07:30 Final `bun run eval:all` on main; numbers copied into Devpost and slides.
- [ ] **08:50 Call fallback (A).** After a good live rehearsal call, run `DATABASE_URL=... bun packages/api/scripts/save-recorded-call.ts <actionId>`, commit `packages/api/src/recorded-call.ts`, and set `DEMO_CALL_FALLBACK=1` in Vercel. Until then `RECORDED_CALL` is `null` and a failed live call has nothing to show.
- [ ] 09:00 Freeze; repo public (confirm with B); README has setup, sponsors used, honesty box.
- [ ] 10:00 Video uploaded, link tested in a private window.
- [ ] **10:30 Devpost submitted (C)** with video, repo, preview URL, screenshots, every track opted in.
- [ ] 11:45 Re-open Devpost, verify links, video plays, tracks selected; edit if allowed.
- [ ] **12:00 Final deadline**; screenshot the submitted page.
- [ ] 12:30 Judging: printed SB-01, judge call card, laptop and phone charged.
