# Bill of the Month benchmark

Real published cases from KFF Health News "Bill of the Month", recreated from the line items and amounts the articles report. Credit: KFF Health News Bill of the Month. No article text is copied. Summaries are our own words, checked for no 8-word overlap with the article. No patient names appear in the JSON. Accessed 2026-10-17.

Per line, `lineSources` says `reported` (the amount is stated in the article) or `reconstructed` (the article's total minus the reported lines). Codes and dates are null when the article does not give them. Descriptions are our own short labels.

## Included (5)

| Case | Article | Reporter findings | In scope |
|---|---|---|---|
| BOTM-01 | [One surgery billed as two](https://kffhealthnews.org/health-care-costs/bill-of-the-month-one-surgery-charged-for-two-collections-lawsuit/) (2024-08-21) | 2 | duplicate |
| BOTM-02 | [ER charge after leaving unseen](https://kffhealthnews.org/health-care-costs/emergency-room-not-treated-still-charged-illinois-bill-of-the-month-september-2026/) (2026-09-29) | 4 | missing_itemization |
| BOTM-03 | [Critical care codes for a short ER stay](https://kffhealthnews.org/health-industry/er-monitoring-anaphylactic-shock-allergic-reaction-bill-of-the-month-april-2026/) (2026-04-28) | 2 | none (coding level) |
| BOTM-04 | [PET scan at list price vs cash rate](https://kffhealthnews.org/health-care-costs/insurers-pay-high-prices-premiums-coinsurance-cost-control-inflation-patients/) (2026-03-03) | 3 | published_price (needs this hospital's price file; not captured) |
| BOTM-05 | [$15,076 for four screws](https://kffhealthnews.org/health-industry/sticker-shock-jolts-oklahoma-patient-15076-for-four-tiny-screws/) (2018-05-14) | 2 | none (device price, prior authorization) |

## Excluded

| Article | Reason |
|---|---|
| [Broken arm, uninsured, $97,998 bill](https://kffhealthnews.org/health-care-costs/broken-arm-uninsured-surprise-bill-of-the-month-september/) (2025-09-24) | Line amounts given only as lower bounds ("at least", "more than"); the dispute is about the estimate |
| [Widow's second bill a year later](https://kffhealthnews.org/news/article/widow-hospital-collections-bill-adjustment-postmortem-bill-of-the-month-august-2023/) (2023-08-29) | No line items; experts disagree on whether there was an error |
| [Skiing accident, repeat surgery](https://kffhealthnews.org/health-industry/after-her-skiing-accident-an-uphill-battle-over-snowballing-bills/) (2018) | Two separate operations, not a duplicate; no lever fits |
| Ectopic pregnancy, two surgery codes (same article as BOTM-04) | Line amounts given only approximately; the issue is unbundling, which has no lever (NCCI PTP cut) |
| Spinal injections at a surgery center (same article as BOTM-04) | Price level only; no lever |
| Prior authorization or coverage cases on the 2025 to 2026 index (breast MRI, lifesaving drug, amnesia dispute, nickel cancellation, copay card, vision vs medical, kindergartner surgery, bat rabies) | Out of scope: coverage, prior authorization or network |

Remaining index articles were not reviewed for time.

## Result (M7)

Results are in `data/eval/results.json` (`metrics.botmRecall`, plus `misses` and `extras` entries for `BOTM-NN`). Small N: report counts, not only rates.
