# Hospital data

Captured public data. Each file records source URLs, retrieval times and sha256 hashes. Raw files over 10 MB (price files) are not committed.

- `fpl-2026.json`: 2026 HHS poverty guidelines (48 states + DC, Alaska, Hawaii), in dollars per year.
- `cedars-sinai/capture.json`: published price rows from the hospital's machine-readable file.
- `cedars-sinai/policy.json`: verbatim quotes from the Financial Assistance Policy, with thresholds taken from those quotes.
- `<hospital>/capture.json` for the "Before you go" price tab: Providence Saint John's, Tarzana, Saint Joseph, Holy Cross and Little Company of Mary Torrance, UCLA Santa Monica, and MemorialCare Long Beach (captured 2026-10-18), plus Cedars-Sinai and Ronald Reagan UCLA. Each file's `mrf-url` comes from the hospital's own `cms-hpt.txt`; no Browser Use run was needed.

## Price captures

1. `python3 -E -P scripts/hospitals/extract_mrf.py --url <mrf-url> --page-url <source-page-url> --hpt-url https://<domain>/cms-hpt.txt --hospital-key <key> --out data/hospitals/<key>/capture.json --codes 72148 85025 99284 70450` streams the file, hashes every byte and keeps the rows for those codes (`allMatches`) and the file's `hospital_address` and `location_name`.
2. `python3 -E -P scripts/hospitals/finish_capture.py data/hospitals/<key>/capture.json --select --locate` picks one row per code (`prices`, rule written into `selection`), names the hospital from `location_name`, redacts contact lines from the evidence copy of `cms-hpt.txt`, and adds `location`: the file's own address, geocoded with Nominatim.
3. `bun run data:gen` bundles the captures for the API.

Skipped: Keck Hospital of USC and Hoag (their files are CSV, which the script does not read), LA County DHS (no cash prices), and systems whose `cms-hpt.txt` was blocked or missing on 2026-10-18 (Dignity Health, Huntington, Torrance Memorial, PIH, Adventist).

## Medicare star ratings (`<hospital>/ratings.json`)

These are Medicare's star ratings from CMS Care Compare (data.cms.gov Provider Data), not reviews from a review site. Captured 2026-10-18 for the 9 Prices hospitals with `python3 -E -P scripts/hospitals/capture_ratings.py`; no API key.

- `overallStars` (1 to 5): CMS's "Hospital overall rating" from the Hospital General Information dataset (`xubh-q36u`). It summarises quality measures in five groups: mortality, safety of care, readmission, patient experience and timely and effective care.
- `patientSurveyStars` (1 to 5): the HCAHPS summary star rating (`H_STAR_RATING`) from the Patient survey (HCAHPS) - Hospital dataset (`dgck-syfz`). It summarises answers from real patients to a national survey about their hospital stay. `surveysCompleted`, `responseRatePct` and `surveyPeriod` come from the same row.
- `null` means CMS shows "Not Available" (see `overallRaw` and `patientSurveyRaw`), or no CMS row matched with confidence. Any footnote text comes from CMS's Footnote Crosswalk (`y9us-9xdf`).
- Matching: the script asks CMS for rows in the same state and city at the same street number as `capture.json`'s `location.address`, keeps rows on the same street, and needs the name to be close to `hospitalName`. Every row CMS returned is listed in `candidates`, and `matchNote` says how the match was made. If two names are equally close, or none is close, the CCN and stars stay `null`.
- `sources` has the exact query URL, the dataset's `modified` and `released` dates (from its metastore entry), `fetchedAt` and the sha256 of the raw response saved in `evidence/`.

Show the stars as "Medicare star rating", with the dataset date. Never call a hospital "best" or "worst" based on them.

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
