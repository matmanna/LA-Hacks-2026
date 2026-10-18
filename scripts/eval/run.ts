// Evaluation harness. Writes data/eval/results.json (plan C sections 4.2 and 8).
// Usage: bun run eval [--photos] [--botm] [--live]
//   --photos  M1/M2b from cached parses in data/eval/extraction/<photo>.json
//   --live    with --photos, parse uncached photos via EVAL_API_URL (bill.parsePhoto) and cache them
//   --botm    M7 on data/benchmark/botm/*.json
// EVAL_GIT_SHA / EVAL_NOTE label a run made on a local integration of unmerged branches.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  type Bill,
  type Eob,
  type Flag,
  type PublishedPrice,
  runAudit,
  unitBoundsFromMue,
} from "../../packages/core/src/index";
import { type FlagLike, matchFlags, matchLines } from "./match";
import { Results } from "./schema";

const ROOT = join(import.meta.dirname, "..", "..");
const args = new Set(process.argv.slice(2));
const RUNS = 20;
const LEVERS = [
  "duplicate",
  "units",
  "eob_mismatch",
  "published_price",
  "missing_itemization",
];

type Expected = FlagLike & {
  tier: string;
  amountCents: number | null;
  requiresCapture?: string;
  optional?: boolean;
};
type Fixture = {
  id: string;
  bill: Bill;
  eob: Eob | null;
  expected: { clean: boolean; flags: Expected[] };
  context?: { hospitalKey?: string };
  reporterFindings?: (FlagLike & { inScope: boolean })[];
};

const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const listJson = (dir: string) =>
  existsSync(join(ROOT, dir))
    ? readdirSync(join(ROOT, dir))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => join(ROOT, dir, f))
    : [];
const ratio = (a: number, b: number) =>
  b === 0 ? null : Math.round((a / b) * 1000) / 1000;
const pct = (xs: number[], p: number) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[
    Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)
  ] as number;
};
const round = (x: number | null, d = 3) =>
  x === null ? null : Math.round(x * 10 ** d) / 10 ** d;
const ref = (
  fixture: string,
  f: FlagLike & { amountCents?: number | null },
) => ({
  fixture,
  lever: f.lever,
  lineIds: f.lineIds,
  amountCents: f.amountCents ?? null,
});

// Inputs: rules, captured prices, fixtures.
const unitBounds = unitBoundsFromMue(
  readJson(join(ROOT, "data/rules/mue-subset.json")),
);
const captures = readdirSync(join(ROOT, "data/hospitals"), {
  withFileTypes: true,
})
  .filter(
    (d) =>
      d.isDirectory() &&
      existsSync(join(ROOT, "data/hospitals", d.name, "capture.json")),
  )
  .map((d) => readJson(join(ROOT, "data/hospitals", d.name, "capture.json")));
// The demo bills are outpatient or ED, so the engine gets outpatient rows (the engine's price type has no setting).
const prices: PublishedPrice[] = captures.flatMap((c) => {
  const mrf = c.sources.find((s: { kind: string }) => s.kind === "mrf");
  return c.prices
    .filter((p: { setting: string }) => p.setting === "outpatient")
    .map((p: Record<string, number | string | null>) => ({
      hospitalName: c.hospitalName,
      code: p.code,
      cashCents: p.discountedCashCents,
      minNegotiatedCents: p.minNegotiatedCents,
      maxNegotiatedCents: p.maxNegotiatedCents,
      sourceUrl: mrf.url,
      capturedAt: c.capturedAt,
    }));
});
const captured = new Set(
  captures.flatMap((c) =>
    c.prices.map(
      (p: { code: string; setting: string }) =>
        `${c.hospitalKey}:${p.code}:${p.setting}`,
    ),
  ),
);

const audit = (fx: Fixture) =>
  runAudit({ bill: fx.bill, eob: fx.eob, unitBounds, prices }).flags.filter(
    (f) => f.lever !== "assistance",
  );

function scoreFixtures(fixtures: Fixture[]) {
  const byLever = Object.fromEntries(
    LEVERS.map((l) => [l, { caught: 0, expected: 0 }]),
  );
  let caught = 0;
  let expectedN = 0;
  let skipped = 0;
  let produced = 0;
  let matched = 0;
  let exact = 0;
  let caughtConfirmed = 0;
  let complete = 0;
  const misses: ReturnType<typeof ref>[] = [];
  const extras: ReturnType<typeof ref>[] = [];
  const falseFlags: ReturnType<typeof ref>[] = [];
  const times: number[] = [];

  for (const fx of fixtures) {
    audit(fx);
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      audit(fx);
      times.push(performance.now() - t0);
    }
    const flags: Flag[] = audit(fx);
    const expected = fx.expected.flags.filter((e) => {
      if (e.requiresCapture && !captured.has(e.requiresCapture)) {
        skipped++;
        return false;
      }
      return true;
    });
    const m = matchFlags(expected, flags);
    produced += flags.length;
    matched += m.caught.length;
    caught += m.caught.length;
    expectedN += expected.length;
    for (const e of expected) {
      const b = byLever[e.lever] ?? { caught: 0, expected: 0 };
      b.expected++;
      byLever[e.lever] = b;
    }
    for (const c of m.caught) {
      (byLever[c.expected.lever] as { caught: number }).caught++;
      if (c.expected.tier === "confirmed") {
        caughtConfirmed++;
        if (c.produced.amountCents === c.expected.amountCents) exact++;
      }
    }
    for (const e of m.missed) misses.push(ref(fx.id, e));
    for (const p of m.extra) extras.push(ref(fx.id, p));
    if (fx.expected.clean)
      for (const p of flags) falseFlags.push(ref(fx.id, p));
    for (const f of flags) {
      const needsSource = f.tier === "rule" || f.tier === "published";
      if (
        f.evidence.detail.trim() !== "" &&
        (!needsSource || !!f.evidence.sourceUrl) &&
        (f.tier !== "published" || !!f.evidence.capturedAt)
      )
        complete++;
    }
  }
  return {
    byLever,
    caught,
    expectedN,
    skipped,
    produced,
    matched,
    exact,
    caughtConfirmed,
    complete,
    misses,
    extras,
    falseFlags,
    times,
  };
}

const fixtures: Fixture[] = listJson("data/synthetic/bills").map(readJson);
const s = scoreFixtures(fixtures);

// M1 / M2b from photos.
type Extraction = { photo: string; model: string; ms: number; bill: Bill };
const photos = {
  photos: 0,
  model: null as string | null,
  seconds: [] as number[],
  recall: { caught: 0, expected: 0 },
  lines: { matched: 0, truth: 0, extracted: 0, exact: 0, totals: 0 },
  fields: { code: 0, serviceDate: 0, units: 0, chargeCents: 0 },
  byCondition: {} as Record<
    string,
    { photos: number; matched: number; truth: number; extracted: number }
  >,
};
if (args.has("--photos")) {
  const dir = join(ROOT, "data/synthetic/photos");
  const cacheDir = join(ROOT, "data/eval/extraction");
  mkdirSync(cacheDir, { recursive: true });
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".jpg"))
        .sort()
    : [];
  for (const photo of files) {
    const cache = join(cacheDir, `${basename(photo, ".jpg")}.json`);
    if (!existsSync(cache)) {
      if (!args.has("--live") || !process.env.EVAL_API_URL) continue;
      const body = new FormData();
      body.append("file", new Blob([readFileSync(join(dir, photo))]), photo);
      const t0 = performance.now();
      const res = await fetch(process.env.EVAL_API_URL, {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error(`parsePhoto ${photo}: HTTP ${res.status}`);
      const out = (await res.json()) as { model: string; bill: Bill };
      writeFileSync(
        cache,
        `${JSON.stringify({ photo, model: out.model, ms: performance.now() - t0, bill: out.bill }, null, "\t")}\n`,
      );
    }
    const ex: Extraction = readJson(cache);
    const [id, cond = "unknown"] = basename(photo, ".jpg").split(
      /-(?=[a-z]+$)/,
    );
    const fx = fixtures.find((f) => f.id === id);
    if (!fx) continue;
    photos.photos++;
    photos.model = ex.model;
    photos.seconds.push(ex.ms / 1000);
    const { pairs } = matchLines(fx.bill.lines, ex.bill.lines);
    const t = fx.bill.lines.length;
    photos.lines.matched += pairs.length;
    photos.lines.truth += t;
    photos.lines.extracted += ex.bill.lines.length;
    for (const p of pairs) {
      if (p.truth.code === p.extracted.code) photos.fields.code++;
      if (p.truth.serviceDate === p.extracted.serviceDate)
        photos.fields.serviceDate++;
      if (p.truth.units === p.extracted.units) photos.fields.units++;
      photos.fields.chargeCents++;
      if (
        p.truth.code === p.extracted.code &&
        p.truth.serviceDate === p.extracted.serviceDate &&
        p.truth.units === p.extracted.units
      )
        photos.lines.exact++;
    }
    const sum = ex.bill.lines.reduce((a, l) => a + l.chargeCents, 0);
    if (sum === fx.bill.totals.chargesCents) photos.lines.totals++;
    const c = photos.byCondition[cond] ?? {
      photos: 0,
      matched: 0,
      truth: 0,
      extracted: 0,
    };
    c.photos++;
    c.matched += pairs.length;
    c.truth += t;
    c.extracted += ex.bill.lines.length;
    photos.byCondition[cond] = c;
    // M2b: audit the extracted lines, remapping their ids to the matched truth ids.
    const idMap = new Map(pairs.map((p) => [p.extracted.id, p.truth.id]));
    const flags = runAudit({ bill: ex.bill, eob: fx.eob, unitBounds, prices })
      .flags.filter((f) => f.lever !== "assistance")
      .map((f) => ({
        ...f,
        lineIds: f.lineIds.map((l) => idMap.get(l) ?? `unmatched:${l}`),
      }));
    const expected = fx.expected.flags.filter(
      (e) => !e.requiresCapture || captured.has(e.requiresCapture),
    );
    const m = matchFlags(expected, flags);
    photos.recall.caught += m.caught.length;
    photos.recall.expected += expected.length;
  }
}

// M7 Bill of the Month.
const botm = {
  cases: 0,
  findings: 0,
  inScope: 0,
  caughtIn: 0,
  caughtAll: 0,
  extra: 0,
};
const botmMisses: ReturnType<typeof ref>[] = [];
const botmExtras: ReturnType<typeof ref>[] = [];
if (args.has("--botm")) {
  for (const fx of listJson("data/benchmark/botm").map(readJson) as Fixture[]) {
    const findings = fx.reporterFindings ?? [];
    const m = matchFlags(findings, audit(fx));
    botm.cases++;
    botm.findings += findings.length;
    botm.inScope += findings.filter((f) => f.inScope).length;
    botm.caughtAll += m.caught.length;
    botm.caughtIn += m.caught.filter((c) => c.expected.inScope).length;
    botm.extra += m.extra.length;
    for (const e of m.missed.filter((f) => f.inScope))
      botmMisses.push(ref(fx.id, e));
    for (const x of m.extra) botmExtras.push(ref(fx.id, x));
  }
}

const git = (...a: string[]) => {
  try {
    return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};
const dirty =
  git(
    "status",
    "--porcelain",
    "--",
    "packages/core",
    "data",
    "scripts/eval",
  ) !== "";
const results = Results.parse({
  schemaVersion: 1,
  runAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  gitSha:
    process.env.EVAL_GIT_SHA ??
    `${git("rev-parse", "--short", "HEAD")}${dirty ? "-dirty" : ""}`,
  coreVersion:
    readJson(join(ROOT, "packages/core/package.json")).version ?? "0.0.0",
  datasets: {
    synthetic: {
      fixtures: fixtures.length,
      cleanFixtures: fixtures.filter((f) => f.expected.clean).length,
      expectedFlags: s.expectedN,
      skippedRequiresCapture: s.skipped,
    },
    photos: {
      photos: photos.photos,
      conditions: Object.keys(photos.byCondition).sort(),
      model: photos.model,
    },
    botm: {
      cases: botm.cases,
      reporterFindings: botm.findings,
      inScopeFindings: botm.inScope,
    },
  },
  metrics: {
    seededRecall: {
      caught: s.caught,
      expected: s.expectedN,
      rate: ratio(s.caught, s.expectedN),
      byLever: s.byLever,
    },
    seededRecallFromPhotos: {
      caught: photos.recall.caught,
      expected: photos.recall.expected,
      rate: ratio(photos.recall.caught, photos.recall.expected),
    },
    falseFlagsOnClean: {
      count: s.falseFlags.length,
      cleanFixtures: fixtures.filter((f) => f.expected.clean).length,
      items: s.falseFlags,
    },
    precision: {
      matched: s.matched,
      produced: s.produced,
      rate: ratio(s.matched, s.produced),
    },
    confirmedAmountExact: {
      exact: s.exact,
      caughtConfirmed: s.caughtConfirmed,
    },
    evidenceCompleteness: {
      complete: s.complete,
      produced: s.produced,
      rate: ratio(s.complete, s.produced),
    },
    auditTimeMs: {
      p50: round(pct(s.times, 50)),
      p95: round(pct(s.times, 95)),
      runsPerFixture: RUNS,
    },
    photoToLinesSec: {
      p50: round(pct(photos.seconds, 50), 1),
      p95: round(pct(photos.seconds, 95), 1),
      n: photos.seconds.length,
    },
    lineExtraction: {
      recall: ratio(photos.lines.matched, photos.lines.truth),
      precision: ratio(photos.lines.matched, photos.lines.extracted),
      exactLineRate: ratio(photos.lines.exact, photos.lines.truth),
      totalsMatchRate: ratio(photos.lines.totals, photos.photos),
      byCondition: Object.fromEntries(
        Object.entries(photos.byCondition).map(([k, c]) => [
          k,
          {
            photos: c.photos,
            recall: ratio(c.matched, c.truth),
            precision: ratio(c.matched, c.extracted),
          },
        ]),
      ),
      fieldAccuracy: {
        code: ratio(photos.fields.code, photos.lines.matched),
        serviceDate: ratio(photos.fields.serviceDate, photos.lines.matched),
        units: ratio(photos.fields.units, photos.lines.matched),
        chargeCents: ratio(photos.fields.chargeCents, photos.lines.matched),
      },
    },
    botmRecall: {
      inScope: {
        caught: botm.caughtIn,
        total: botm.inScope,
        rate: ratio(botm.caughtIn, botm.inScope),
      },
      all: {
        caught: botm.caughtAll,
        total: botm.findings,
        rate: ratio(botm.caughtAll, botm.findings),
      },
      extraFlags: botm.extra,
    },
  },
  // BotM entries (fixture BOTM-NN): in-scope reporter findings missed, and extra flags for manual review.
  misses: [...s.misses, ...botmMisses],
  extras: [...s.extras, ...botmExtras],
  notes: [
    ...(process.env.EVAL_NOTE ? [process.env.EVAL_NOTE] : []),
    "Synthetic errors were planted by the team; seededRecall shows the rules work as designed, not real-world accuracy. See botmRecall for published cases.",
    "Published prices: outpatient rows of each captured price file (data/hospitals/*/capture.json).",
    ...(args.has("--photos")
      ? []
      : ["Photo metrics not run (null = not measured)."]),
    ...(args.has("--botm")
      ? []
      : ["Bill of the Month not run (null = not measured)."]),
  ],
});

mkdirSync(join(ROOT, "data/eval"), { recursive: true });
writeFileSync(
  join(ROOT, "data/eval/results.json"),
  `${JSON.stringify(results, null, "\t")}\n`,
);

const m = results.metrics;
const show = (x: number | null) => (x === null ? "not measured" : String(x));
console.log(`results.json  runAt ${results.runAt}  git ${results.gitSha}`);
console.log(
  `seeded recall       ${m.seededRecall.caught}/${m.seededRecall.expected} (${show(m.seededRecall.rate)})`,
);
for (const [lever, c] of Object.entries(m.seededRecall.byLever))
  console.log(`  ${lever.padEnd(20)}${c.caught}/${c.expected}`);
console.log(
  `false flags (clean) ${m.falseFlagsOnClean.count} on ${m.falseFlagsOnClean.cleanFixtures} clean bills`,
);
console.log(
  `precision           ${m.precision.matched}/${m.precision.produced} (${show(m.precision.rate)})`,
);
console.log(
  `confirmed exact amt ${m.confirmedAmountExact.exact}/${m.confirmedAmountExact.caughtConfirmed}`,
);
console.log(
  `evidence complete   ${m.evidenceCompleteness.complete}/${m.evidenceCompleteness.produced}`,
);
console.log(
  `audit time ms       p50 ${show(m.auditTimeMs.p50)}  p95 ${show(m.auditTimeMs.p95)}  (${RUNS} runs x ${fixtures.length})`,
);
console.log(
  `skipped (no capture) ${results.datasets.synthetic.skippedRequiresCapture}`,
);
console.log(
  `photos              ${results.datasets.photos.photos}; botm cases ${results.datasets.botm.cases}`,
);
console.log(`misses ${results.misses.length}, extras ${results.extras.length}`);
for (const x of [
  ...results.misses.map((r) => ({ ...r, k: "MISS" })),
  ...results.extras.map((r) => ({ ...r, k: "EXTRA" })),
])
  console.log(
    `  ${x.k} ${x.fixture} ${x.lever} ${x.lineIds.join(",")} ${x.amountCents ?? ""}`,
  );
