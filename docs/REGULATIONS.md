# Regulations that can lower a patient's bill

Rules from federal and state law that BetterBill can check or tell patients about. The data lives in `data/regulations/*.json`, one file per jurisdiction. Every rule has a citation, the official source URL, a short verbatim quote, and `capturedAt`. Text was read from the official sources on 2026-10-18.

This is research for the rules engine and the agent, not legal advice. Never present a rule as a conclusion ("you qualify", "this is illegal"). Say "you may qualify" and show the source.

## What each file holds

| File | Rules | Verified |
|---|---|---|
| `federal.json` | 501(r) assistance policy, AGB cap, 120/240-day collection windows; No Surprises Act emergency cap and the $400 good-faith-estimate dispute; Medicare itemized statement in 30 days | Yes |
| `CA.json` | Fair Pricing Act: 400% FPL, Medicare/Medi-Cal cap, no deadline, assets not counted, interest-free plans, no credit reporting, 180 days before a lawsuit | Yes |
| `NY.json` | Free under 200% FPL, sliding scale to 400% capped at 10% to 20% of Medicaid, 5% of income plans at 2% interest, no lawsuits under 400% | Yes |
| `WA.json` | Free care to 300% FPL at large systems (200% elsewhere), 75% and 50% discounts above, insured or not | Yes |
| `MD.json` | Free to 200% FPL, 75% and 60% off to 300%, hardship discounts to 500% | Yes |
| `IL.json` | Uninsured discount to 600% FPL (300% rural), charges capped at cost plus 35%, yearly collections capped at 25% of income, apply within 60 days | Yes, from the state's Hospital Report Card (ilga.gov was down; notes say so) |
| `CO.json` | Hospital Discounted Care at or under 250% FPL (insured too), monthly payments capped at 4% of income for 36 months, 30 days' notice before collections | Yes, from HCPF |
| `OR.json` | Nonprofit hospitals: free to 200% FPL, at least 75%, 50% or 25% off to 400%; screening; nine-month approval; collections pause during appeal | Yes, ORS 442.614 and 442.615 |
| `MA.json` | Health Safety Net: free to 150% FPL, with a deductible to 300% | Yes, from MassHealth |

## Rule shape

```jsonc
{
  "id": "ca-cap",
  "title": "...",                 // short label
  "appliesWhen": { "state": "CA", "incomeFplMaxPct": 400 }, // what must be true
  "effect": { "kind": "charge_cap", "cap": "greater_of_medicare_or_medical" },
  "plain": "...",                 // patient-facing, grade 6 to 8
  "citation": "Cal. Health & Safety Code 127405(d)(1)",
  "sourceUrl": "https://...",
  "quote": "...",                 // verbatim, under 15 words where possible
  "capturedAt": "2026-10-18",
  "verified": true
}
```

`effect.kind` is one of `eligibility`, `charge_cap`, `charity_care`, `cost_sharing_cap`, `dispute_right`, `itemized_right`, `payment_plan`, `collections_limit`, `application_rules`, `assistance_policy`.

## How the app can use it

- **Income check (optional, private).** Ask household size and an income range only when the bill's state has a rule with an income limit. Compare against `data/hospitals/fpl-2026.json`. Show "You may qualify for free or discounted care" with the rule's `plain` text and source. Never compute a discount the hospital hasn't confirmed: show it as an `estimate`.
- **Letters.** Cite the rule by `citation` when asking for a discount or a payment plan. The agent should quote, not paraphrase.
- **Collections.** If a patient says they were sent to collections or sued, show the matching `collections_limit` rule for their state.
- **Insurance.** For an emergency at an out-of-network hospital, show `us-nsa-emergency`. For uninsured scheduled care, show `us-nsa-gfe`.

## Not covered yet

Other states. Illinois and Colorado were read from official state agency pages (the Illinois Hospital Report Card and HCPF) rather than the statute text; re-check them against the statutes when ilga.gov and the Colorado statutes are reachable. Hospital-specific policies can be more generous than the law; the hospital's own policy (for example `data/hospitals/cedars-sinai/policy.json`) wins when it's better for the patient.
