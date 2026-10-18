// Reads data/eval/results.json as passed through eval.results. Every number on
// the plans page comes from here. Nothing is typed in by hand.
export type Lever = {
  key: string;
  label: string;
  caught: number;
  expected: number;
};

export type EvalView = {
  date: string | null;
  bills: number;
  cleanBills: number;
  caught: number;
  expected: number;
  falseFlags: number;
  auditP50Ms: number | null;
  levers: Lever[];
  botm: {
    cases: number;
    caught: number;
    inScope: number;
    extraFlags: number;
  } | null;
  note: string | null;
};

const LABELS: Record<string, string> = {
  duplicate: "Duplicate charges",
  units: "Unit counts",
  eob_mismatch: "Bill vs insurer statement",
  published_price: "Published price",
  missing_itemization: "Missing itemization",
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null =>
  v && typeof v === "object" ? (v as Obj) : null;
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function evalView(raw: Obj | null): EvalView | null {
  if (!raw) return null;
  const metrics = obj(raw.metrics);
  const datasets = obj(raw.datasets);
  const recall = obj(metrics?.seededRecall);
  const caught = num(recall?.caught);
  const expected = num(recall?.expected);
  const synth = obj(datasets?.synthetic);
  const fixtures = num(synth?.fixtures);
  const clean = num(synth?.cleanFixtures);
  if (caught === null || expected === null || fixtures === null) return null;

  const runAt = typeof raw.runAt === "string" ? new Date(raw.runAt) : null;
  const date =
    runAt && !Number.isNaN(runAt.getTime()) && runAt.getFullYear() >= 2020
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(runAt)
      : null;

  const byLever = obj(recall?.byLever) ?? {};
  const levers = Object.entries(byLever).flatMap(([key, v]) => {
    const o = obj(v);
    const c = num(o?.caught);
    const e = num(o?.expected);
    return c === null || e === null
      ? []
      : [{ key, label: LABELS[key] ?? key, caught: c, expected: e }];
  });

  const ff = obj(metrics?.falseFlagsOnClean);
  const botm = obj(metrics?.botmRecall);
  const inScope = obj(botm?.inScope);
  const botmData = obj(datasets?.botm);
  const notes = Array.isArray(raw.notes) ? raw.notes : [];

  return {
    date,
    bills: fixtures,
    cleanBills: clean ?? 0,
    caught,
    expected,
    falseFlags: num(ff?.count) ?? 0,
    auditP50Ms: num(obj(metrics?.auditTimeMs)?.p50),
    levers,
    botm:
      inScope && num(inScope.caught) !== null && num(inScope.total) !== null
        ? {
            cases: num(botmData?.cases) ?? 0,
            caught: num(inScope.caught) ?? 0,
            inScope: num(inScope.total) ?? 0,
            extraFlags: num(botm?.extraFlags) ?? 0,
          }
        : null,
    note: typeof notes[0] === "string" ? (notes[0] as string) : null,
  };
}
