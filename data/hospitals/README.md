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
