// Measures the assistance screener on the synthetic bills (data/synthetic/bills)
// using each fixture's synthetic patient (household, income, insurance) and
// the bundled rules and policies. Writes data/eval/assistance.json.
// Counts only: there is no ground truth for "qualifies", so this measures
// what the screener does (statuses, checks run, sourced findings, time),
// not whether a hospital would agree.
// Usage: bun scripts/eval/assistance.ts
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Bill,
  type FplTable,
  findPolicy,
  type HospitalPolicy,
  type RegulationRule,
  screenAssistance,
} from "../../packages/core/src/index";
import { buildData } from "../gen-api-data";

const ROOT = join(import.meta.dirname, "..", "..");
const RUNS = 20;

type Fixture = {
  id: string;
  bill: Bill;
  context?: {
    hospitalKey?: string;
    patient?: {
      householdSize: number;
      annualIncomeCents: number;
      state: string;
      insured: boolean;
    };
  };
};

const data = buildData();
const rules = data.regulations as unknown as RegulationRule[];
const policies = data.policies as unknown as HospitalPolicy[];
const fpl = data.fpl as unknown as FplTable;

const dir = join(ROOT, "data/synthetic/bills");
const fixtures: Fixture[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));

const pct = (xs: number[], p: number) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? null;
};
const round = (x: number | null, d = 3) =>
  x === null ? null : Math.round(x * 10 ** d) / 10 ** d;

const statuses: Record<string, number> = {
  likely: 0,
  possible: 0,
  unknown: 0,
  unlikely: 0,
};
const times: number[] = [];
let mayHelp = 0;
let mayHelpSourced = 0;
let checksMin = Number.POSITIVE_INFINITY;
let checksMax = 0;
const perFixture = [];

for (const f of fixtures) {
  const p = f.context?.patient;
  if (!p) continue;
  const input = {
    state: f.bill.hospital.state,
    hospitalName: f.bill.hospital.name,
    policy: findPolicy(policies, f.bill.hospital.name),
    rules,
    fpl,
    totals: f.bill.totals,
    answers: {
      householdSize: p.householdSize,
      annualIncomeCents: p.annualIncomeCents,
      insurance: p.insured ? ("private" as const) : ("none" as const),
    },
  };
  const a = screenAssistance(input);
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    screenAssistance(input);
    times.push(performance.now() - t0);
  }
  const checks = a.checks ?? [];
  const helping = checks.filter(
    (c) => c.outcome === "may_help" && c.kind !== "income",
  );
  mayHelp += helping.length;
  mayHelpSourced += helping.filter(
    (c) => c.source?.url || c.kind === "insurance",
  ).length;
  checksMin = Math.min(checksMin, checks.length);
  checksMax = Math.max(checksMax, checks.length);
  statuses[a.status] = (statuses[a.status] ?? 0) + 1;
  perFixture.push({
    fixture: f.id,
    hospitalKey: f.context?.hospitalKey ?? null,
    policyOnFile: input.policy !== null,
    status: a.status,
    freeCare: a.freeCare ?? false,
    checks: checks.length,
    mayHelp: helping.map((c) => c.id),
  });
}

const git = (...a: string[]) =>
  execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const out = {
  runAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  gitSha: git("rev-parse", "--short", "HEAD"),
  fixtures: fixtures.length,
  screened: perFixture.length,
  statuses,
  checksPerBill: { min: checksMin, max: checksMax },
  mayHelpWithSource: {
    sourced: mayHelpSourced,
    total: mayHelp,
    rate: round(mayHelp ? mayHelpSourced / mayHelp : null),
  },
  screenTimeMs: {
    p50: round(pct(times, 50)),
    p95: round(pct(times, 95)),
    runsPerFixture: RUNS,
  },
  perFixture,
  notes: [
    "Synthetic patients from each fixture's context; insured is screened as a private plan.",
    "No ground truth for eligibility: these are counts of what the screener does, not real-world accuracy. The hospital decides.",
    "Sourced: a may-help finding links to the rule or policy it comes from (the insurance check cites the bill's own totals).",
  ],
};
writeFileSync(
  join(ROOT, "data/eval/assistance.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(
  `screened ${out.screened}/${out.fixtures}: ${JSON.stringify(statuses)}; checks ${checksMin}-${checksMax} per bill; may-help sourced ${mayHelpSourced}/${mayHelp}; p50 ${out.screenTimeMs.p50} ms`,
);
