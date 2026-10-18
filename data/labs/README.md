# Lab data

Online self-pay prices that independent labs publish for ordering a test yourself, usually with the blood draw at the company's own patient service center. These are **not hospital prices**. Labs are not covered by the hospital price-file rule, so the evidence is each company's own public product page, not a CMS machine-readable file. Label them as "the lab's published online price", never as a hospital's price.

Tests: `85025` blood count (CBC with differential) and `80053` metabolic panel (comprehensive metabolic panel, CMP).

| Lab | Key | 85025 | 80053 |
|---|---|---|---|
| Labcorp OnDemand | `labcorp-ondemand` | listed price, provider fee and draw included | regular price, plus an October 2026 sale price in `sale` |
| Quest Diagnostics (questhealth.com) | `quest-health` | listed price plus a separate Physician Service Fee | same |

Read the amounts from `capture.json`; this file does not repeat them.

## Files

- `<key>/capture.json`: one file per lab.
  - `sources[]`: every URL fetched, with `sha256` and `bytes` of the exact response, `fetchedAt`, HTTP status, and the saved copy in `evidenceFile`. When the saved copy redacts a public key embedded in the page (a Stripe publishable key, an Algolia search key), `redacted` explains it and gives the copy's own `evidenceSha256`.
  - `prices[]`: one row per test.
    - `cashCents`: integer cents for one test bought online, before tax and promo codes, with the required physician fee included. `cashCentsBasis` says how it was built.
    - `listedPriceCents` and `addedFees[]`: the parts as printed (Quest prints the test price and a Physician Service Fee separately).
    - `quote`: the price text as the page shows it. `includes` and `otherQuotes[]`: verbatim sentences about what the price covers (ordering provider, sample collection, insurance), each with its `sourceUrl`.
    - `sale`: a temporary sale price with its terms, or `null`.
    - `codeEvidence`: how the CPT code was matched. `verified: true` means the lab's own test directory prints the CPT code. `verified: false` means the product page prints no code and the match comes from the page's own description.
  - `notes[]`: how the prices were found and what is uncertain.
- `<key>/evidence/`: the fetched bytes (product pages, help-center article JSON, Labcorp test-menu pages). Biome ignores these folders so the hashes stay valid.

## Re-capture

```
python3 -E -P scripts/labs/capture_lab_prices.py
bun x biome check --write data/labs
```

The script makes plain HTTPS GETs with a descriptive User-Agent: no Browser Use, no login, and no cart or checkout calls. It parses every price and quote from the fetched bytes and stops if an expected price or sentence is missing, so nothing is typed by hand. If a site blocks the request, it stops and writes nothing; such a block is never worked around.

## Not known from these pages

- Whether Quest charges its Physician Service Fee once per order or once per test.
- The exact Labcorp CMP total at checkout during the sale, because the promotions article says discounts do not apply to the physician fee.
- Sales tax.
- Quest CPT codes from Quest's own test directory, which needs app credentials.
