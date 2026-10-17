# Rule table sources

## mue-subset.json (units per day)

- Table: CMS NCCI Medically Unlikely Edits, Facility Outpatient Hospital Services, effective 2026-10-01.
- Page: https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits
- File: https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip (contains `MCR_MUE_OutpatientHospitalServices_Eff_10-01-2026.csv`)
- Zip sha256: `a45ee8194cf06a2d733850f4b694d1feca08b1b55a0121b8e86574436440b4a6`, downloaded 2026-10-17T22:42:23Z.
- Rebuild: `mkdir -p .cache/cms && curl -sSL -o .cache/cms/oph-mue.zip <file URL>`, then `bun scripts/rules/build-mue-subset.ts`. Values are never typed by hand.
- Scope: only codes used by our fixtures (about 25). Codes and unit values only; no CPT descriptors are stored.
- AMA notice from the CSV header: "Current Procedural Terminology (CPT) codes, descriptions and other data only are copyright 2025 American Medical Association. All rights reserved."

Rule: units over the MUE is a Medicare benchmark. Show it as the "Billing rule" tier, never as an error. Say "Medicare's usual daily limit for this code is N units (CMS MUE table, Oct 2026)." Never "not allowed."
