# Synthetic bills

All bills here are invented for testing and demos. No real patients, accounts, or documents.

- `bills/SB-XX.json`: `{ fixtureVersion, id, title, synthetic, scenario, bill, eob, expected, context }`. `bill` and `eob` use the contract in `docs/plans/00-shared-context.md` section 6.
- Money is integer cents. Line ids are `sbNN-lMM`. Descriptions are our own short text, not AMA descriptors.
- `expected.flags[]`: `{ lever, tier, lineIds, amountCents, ruleRef?, requiresCapture?, optional? }`. Matched by `lever` plus a shared `lineId`.
- `requiresCapture` means the amount depends on a captured price file (see `data/hospitals/`).
- SB-01 names Cedars-Sinai only so its public price file can be compared. Charges are invented; the bill was not issued by Cedars-Sinai.
- Check with `bun run fixtures:validate`.
