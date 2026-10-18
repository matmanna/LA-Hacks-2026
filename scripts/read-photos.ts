// Reads every synthetic bill photo live with StepFun step-5-preview, then:
// 1. writes data/cache/photos/<photo>.json (cached reads for demo fallback)
// 2. writes data/eval/extraction.json (line accuracy and latency, measured)
// Usage: bun run photos:read [--force]   (needs STEPFUN_API_KEY)
// Without --force, photos already read successfully are reused, not re-read.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readPhoto } from "../packages/api/src/reader/parsePhoto";
import type { Bill, Line } from "../packages/core/src/schemas";

const ROOT = join(import.meta.dirname, "..");
const PHOTOS = join(ROOT, "data/synthetic/photos");
const CACHE = join(ROOT, "data/cache/photos");
const CONCURRENCY = Number(process.env.PHOTO_CONCURRENCY ?? 1);
const FORCE = process.argv.includes("--force");
mkdirSync(CACHE, { recursive: true });

const key = (l: Pick<Line, "serviceDate" | "code" | "units" | "chargeCents">) =>
  [l.serviceDate, l.code, l.units, l.chargeCents].join("|");

function score(expected: Line[], got: Line[]) {
  const pool = new Map<string, number>();
  for (const l of expected) pool.set(key(l), (pool.get(key(l)) ?? 0) + 1);
  let matched = 0;
  for (const l of got) {
    const n = pool.get(key(l)) ?? 0;
    if (n > 0) {
      matched++;
      pool.set(key(l), n - 1);
    }
  }
  return { expected: expected.length, extracted: got.length, matched };
}

const pct = (a: number, b: number) =>
  b === 0 ? null : Math.round((a / b) * 1000) / 10;
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? null;
};

type Row = {
  photo: string;
  bill: string;
  condition: string;
  ok: boolean;
  error?: string;
  latencyMs?: number;
  reconciled?: boolean;
  expected: number;
  extracted: number;
  matched: number;
};

const files = readdirSync(PHOTOS)
  .filter((f) => f.endsWith(".jpg"))
  .sort();
const EVAL_FILE = join(ROOT, "data/eval/extraction.json");
const previous: Row[] = (() => {
  try {
    return JSON.parse(readFileSync(EVAL_FILE, "utf8")).perPhoto ?? [];
  } catch {
    return [];
  }
})();
const rows: Row[] = FORCE ? [] : previous.filter((r) => r.ok);
const done = new Set(rows.map((r) => r.photo));
const todo = files.filter((f) => !done.has(f));
console.log(`${todo.length} photo(s) to read, ${done.size} reused`);
let next = 0;

async function worker() {
  while (next < todo.length) {
    const file = todo[next++] as string;
    const [, bill = "", condition = ""] =
      /^(SB-\d+)-(.+)\.jpg$/.exec(file) ?? [];
    const fixture = JSON.parse(
      readFileSync(join(ROOT, `data/synthetic/bills/${bill}.json`), "utf8"),
    ) as { bill: Bill };
    const b64 = readFileSync(join(PHOTOS, file)).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${b64}`;
    const sha256 = createHash("sha256").update(dataUrl).digest("hex");
    try {
      const r = await readPhoto("cache", [{ imageDataUrl: dataUrl, page: 1 }]);
      const s = score(fixture.bill.lines, r.bill.lines);
      rows.push({
        photo: file,
        bill,
        condition,
        ok: true,
        latencyMs: r.reader.latencyMs,
        reconciled: r.reconciliation.ok,
        ...s,
      });
      writeFileSync(
        join(CACHE, file.replace(/\.jpg$/, ".json")),
        `${JSON.stringify(
          {
            photo: `data/synthetic/photos/${file}`,
            sha256,
            model: r.reader.model,
            latencyMs: r.reader.latencyMs,
            readAt: new Date().toISOString(),
            bill: r.bill,
            reconciliation: r.reconciliation,
            warnings: r.warnings,
          },
          null,
          2,
        )}\n`,
      );
      console.log(
        `${file}: ${s.matched}/${s.expected} lines, ${r.reader.latencyMs} ms`,
      );
    } catch (e) {
      rows.push({
        photo: file,
        bill,
        condition,
        ok: false,
        error: (e as Error).message,
        expected: fixture.bill.lines.length,
        extracted: 0,
        matched: 0,
      });
      console.log(`${file}: FAILED ${(e as Error).message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
rows.sort((a, b) => a.photo.localeCompare(b.photo));

const sum = (rs: Row[], k: "expected" | "extracted" | "matched") =>
  rs.reduce((s, r) => s + r[k], 0);
const summary = (rs: Row[]) => {
  const ok = rs.filter((r) => r.ok);
  const lat = ok.map((r) => r.latencyMs ?? 0);
  return {
    photos: rs.length,
    readOk: ok.length,
    lineRecallPct: pct(sum(rs, "matched"), sum(rs, "expected")),
    linePrecisionPct: pct(sum(rs, "matched"), sum(rs, "extracted")),
    perfectPhotos: rs.filter(
      (r) => r.ok && r.matched === r.expected && r.extracted === r.expected,
    ).length,
    reconciledPct: pct(ok.filter((r) => r.reconciled).length, ok.length),
    latencyP50Ms: quantile(lat, 0.5),
    latencyP90Ms: quantile(lat, 0.9),
  };
};
const conditions = [...new Set(rows.map((r) => r.condition))].sort();
const out = {
  measuredAt: new Date().toISOString(),
  model: "step-5-preview",
  method:
    "Each synthetic bill photo read once, live. A line matches when serviceDate, code, units and chargeCents are all exact (multiset match). Synthetic photos printed and photographed by the team.",
  overall: summary(rows),
  byCondition: Object.fromEntries(
    conditions.map((c) => [c, summary(rows.filter((r) => r.condition === c))]),
  ),
  perPhoto: rows,
};
mkdirSync(join(ROOT, "data/eval"), { recursive: true });
writeFileSync(
  join(ROOT, "data/eval/extraction.json"),
  `${JSON.stringify(out, null, 2)}\n`,
);
console.log(JSON.stringify(out.overall, null, 2));
