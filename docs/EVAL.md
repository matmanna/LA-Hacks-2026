# Evaluation

`bun run eval` writes `data/eval/results.json`, which `eval.results`, the UI card and the pitch read. The shape is in `scripts/eval/schema.ts` (plan C section 8).

**Rule: never present a target as a result.** Every number shows N and the run date. `null` means "not measured", never zero.

## Run

```bash
bun run eval          # M2a, M3, M3a, M4, M5, M6 on ground-truth fixtures (offline, deterministic)
bun run eval:photos   # + M1, M2b from cached parses in data/eval/extraction/<photo>.json
bun run eval:all      # + M7 Bill of the Month (data/benchmark/botm/*.json)
bun test scripts/eval # matching rules
```

`--live` (with `--photos`) parses uncached photos by POSTing them to `EVAL_API_URL` (`bill.parsePhoto`) and caches the results. Without `--live`, no model is called. `EVAL_GIT_SHA` and `EVAL_NOTE` label a run made on a local merge of unmerged branches.

Inputs: `data/synthetic/bills/*.json`, `data/rules/mue-subset.json`, and the outpatient rows of `data/hospitals/*/capture.json`. The audit is `runAudit` from `packages/core`.

## Metrics (plan C section 4.2)

- **M1 Line extraction:** photos through `bill.parsePhoto` vs fixture lines. Greedy match: code +2, charge +2, date +1, units +1. A pair matches if the score is at least 4 and the charges are equal. Reports recall, precision, exact line rate, field accuracy and totals match, per capture condition.
- **M2 Seeded-error recall:** an expected flag is caught by a produced flag with the same lever and at least one shared line id. Each produced flag matches at most one expected flag. M2a uses ground-truth lines; M2b uses photo lines remapped through M1. Expected flags whose `requiresCapture` price is missing are skipped and counted.
- **M3 False flags on clean bills:** every flag (except assistance) on `expected.clean` fixtures, listed. **M3a precision:** matched flags / produced flags.
- **M4 Amount accuracy:** caught `confirmed`-tier flags whose `amountCents` equals the expected amount.
- **M5 Audit time:** 1 warm-up, then 20 timed `runAudit` calls per fixture. Reports p50 and p95 in ms.
- **M6 Evidence completeness:** flags with non-empty `evidence.detail`. Tiers `rule` and `published` also need `sourceUrl`; `published` also needs `capturedAt`.
- **M7 Bill of the Month:** recall on reporters' findings (in scope and all), plus extra flags for manual review. Extra flags are not called errors.

## Caveat

The synthetic errors were planted by the team, so M2a shows the rules work as designed. It is not real-world accuracy; that is what M7 is for. Small N: present counts ("caught 12 of 12") alongside rates. Every miss and every extra flag is listed in `results.json`.
