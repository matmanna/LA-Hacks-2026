// Section 4 numbers for letters (plan A): drafts the letter for every sample
// bill with flags, 3 times each, against live Gemini, and writes
// data/eval/actions.json. Measures the drafter itself (no database needed).
// Usage: bun run measure:letters   (reads GEMINI_API_KEY from apps/web/.env)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { checkWording, renderLetter, runAudit } from "@betterbill/core";

import { PRICES, SAMPLES, UNIT_BOUNDS } from "../src/data";
import { DEFAULT_GEMINI_MODEL, geminiJson } from "../src/services/gemini";
import { chooseLetterOutput } from "../src/services/letter-drafter";

const RUNS = 3;
// Spaces calls out so a free-tier key's per-minute limit doesn't skew results.
const PAUSE_MS = 6_000;

const runs: {
  sample: string;
  ms: number;
  usedFallback: boolean;
  covered: boolean;
  bannedHits: number;
}[] = [];

for (const sample of SAMPLES) {
  const { flags } = runAudit({
    bill: sample.bill,
    eob: sample.eob,
    unitBounds: UNIT_BOUNDS,
    prices: PRICES,
  });
  if (flags.length === 0) continue;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const res = await chooseLetterOutput({
      kind: "letter",
      hospital: sample.bill.hospital.name,
      flags,
      lines: sample.bill.lines,
      generate: geminiJson,
    });
    const ms = Math.round(performance.now() - t0);
    const draft = renderLetter({
      kind: "letter",
      bill: sample.bill,
      flags,
      out: res.out,
      patientName: "The account holder",
      today: new Date().toISOString().slice(0, 10),
    });
    runs.push({
      sample: sample.id,
      ms,
      usedFallback: res.usedFallback,
      covered: res.claims.length === flags.length,
      bannedHits: checkWording(draft).length,
    });
    console.log(
      `${sample.id} run ${i + 1}: ${ms} ms, ${res.usedFallback ? "fallback" : "gemini"}`,
    );
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
}

const sorted = runs.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? null;
const share = (pick: (r: (typeof runs)[number]) => boolean) =>
  runs.length ? runs.filter(pick).length / runs.length : null;

const result = {
  measuredAt: new Date().toISOString(),
  n: runs.length,
  model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  letterDraftMs: { p50: pct(0.5), p95: pct(0.95) },
  claimCoverage: share((r) => r.covered),
  letterFallbackRate: share((r) => r.usedFallback),
  bannedWordHits: runs.reduce((sum, r) => sum + r.bannedHits, 0),
  note: "Drafter only, live Gemini, 3 runs per sample bill with flags.",
  runs,
};
const dir = join(import.meta.dir, "..", "..", "..", "data", "eval");
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, "actions.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(
  `n=${result.n} p50=${result.letterDraftMs.p50}ms p95=${result.letterDraftMs.p95}ms fallback=${result.letterFallbackRate} coverage=${result.claimCoverage} banned=${result.bannedWordHits}`,
);
