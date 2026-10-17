## What
<!-- One feature. One or two sentences. -->

## Why
<!-- Which gate or ticket (for example G1, B-08). -->

## Screens
<!-- Required for UI changes: mobile 390 px and desktop 1280 px. Write "n/a" for backend-only. -->
| Mobile 390 | Desktop 1280 |
|---|---|
|  |  |

## Tests added
<!-- List test files and what they cover. -->

## Contract changes
- [ ] No
- [ ] Yes: label `contract` added and heads-up posted in chat (schemas.ts or oRPC names)

## Checklist
- [ ] `bun x biome ci .` clean
- [ ] `bun run check-types` clean
- [ ] `bun run test` green
- [ ] No secrets, no keys in client code
- [ ] Copy rules: no "illegal", "fraud", "overcharge"; every amount shows its tier
- [ ] a11y: labels, 44 px targets, focus ring, not color alone
- [ ] Synthetic or public data only
