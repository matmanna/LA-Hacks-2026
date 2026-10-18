# Hospital data

Captured public data. Each file records source URLs, retrieval times and sha256 hashes. Raw files over 10 MB (price files) are not committed.

- `fpl-2026.json`: 2026 HHS poverty guidelines (48 states + DC, Alaska, Hawaii), in dollars per year.
- `cedars-sinai/capture.json`: published price rows from the hospital's machine-readable file.
- `cedars-sinai/policy.json`: verbatim quotes from the Financial Assistance Policy, with thresholds taken from those quotes.

## Assistance screener (estimate only)

`fplPct = annualIncome / FPL(householdSize, state) x 100`. Use `alaska` or `hawaii` for AK and HI, otherwise `contiguous48AndDC`. Above 8 people, add `additionalPerson` for each extra person.

| Status | Rule |
|---|---|
| `likely` | `fplPct <= thresholds.freeCareMaxFplPct` |
| `possible` | `fplPct <= thresholds.discountMaxFplPct` |
| `unlikely` | above both |
| `unknown` | no policy captured for the hospital, or income/household missing |

Always show the quote (`freeCareQuote` or `discountQuote`), the policy URL and `capturedAt`. Say "estimate, not a decision"; the hospital decides on application. Never apply one hospital's thresholds to another hospital.

Demo check (SB-01): household 3, income $52,000. 52,000 / 27,320 = 190.3% FPL, which is at or under 400%, so `likely`.
