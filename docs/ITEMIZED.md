# Itemized bills: what we can say, and the sources

Why BetterBill treats "ask for the itemized bill" as a first step in its own
right, and which claims are safe in the app and the pitch.

## Safe to say

- Hospitals often send a summary statement (a total due, not each service).
  An itemized bill lists every charge, which makes errors easier to spot.
- Medicare patients can ask a hospital for a free itemized statement, and the
  hospital has 30 days to answer a written request (CMS, as reported by
  VERIFY below).
- Some states also require itemized bills on request (for example Florida and
  Maine; statutes linked below). Not every state does.

## Not safe to say (no source yet)

- "Requesting an itemized bill alone saves money" or any percentage of
  savings. We found no study that measures this. Do not put it in the app,
  the deck, or the video until a source is added here.
- Error-rate figures from patient advocates ("9 out of 10 bills") are one
  person's experience, not a study. Do not quote them as a statistic.

## Sources (checked 2026-10-18; open each before quoting)

- AARP, "How to spot and fix medical billing errors":
  https://www.aarp.org/money/personal-finance/spot-fix-medical-billing-errors/
  (summary bills vs itemized bills; what to check)
- VERIFY (13NewsNow), fact check on itemized hospital bills, with a CMS
  statement on Medicare patients' right to a free itemized statement:
  https://www.13newsnow.com/article/news/verify/health-verify/hospital-itemized-bill-request-national-state-viral-video-tik-tok-fact-check/536-7e2221fa-4dd0-4949-ab63-a95322fe63b5
- Florida Statutes 395.301 (itemized bill on request, notice at admission and
  discharge): https://www.healthinfolaw.org/state-law/fsa-%C2%A7-395301
- Maine Rev. Stat. tit. 22, 1712 (itemized bill within 30 days of request):
  https://www.healthinfolaw.org/state-law/itemized-bills-me-rev-stat-tit-22-%C2%A7-1712

## Demo data

`data/synthetic/bills/SB-12.json` is the summary statement for the SB-01 visit
(same synthetic Cedars-Sinai account ending 4821, same $12,000.00 due). Demo:
start from SB-12, request the itemized bill, then add SB-01's itemized pages
to the same case.
