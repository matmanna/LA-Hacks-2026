// Bundles repo data the API needs at runtime into packages/api/src/data.gen.ts,
// because serverless deploys do not ship data/. Run: bun run data:gen
// packages/api/src/data.test.ts fails when the generated file is stale.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const tryRead = (p: string) => {
  try {
    return read(p);
  } catch {
    return null;
  }
};

export function buildData() {
  const dir = "data/synthetic/bills";
  const samples = readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const fx = read(`${dir}/${f}`);
      return { id: fx.id, title: fx.title, bill: fx.bill, eob: fx.eob };
    });
  const hospitals = readdirSync(join(ROOT, "data/hospitals"), {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const c = tryRead(`data/hospitals/${d.name}/capture.json`);
      return c
        ? { c, policy: tryRead(`data/hospitals/${d.name}/policy.json`) }
        : null;
    })
    .filter(Boolean)
    .map(({ c, policy }) => ({
      hospitalKey: c.hospitalKey,
      hospitalName: c.hospitalName,
      capturedAt: c.capturedAt,
      // Address from the price file's header, geocoded (finish_capture.py).
      location: c.location
        ? {
            address: c.location.address,
            lat: c.location.lat,
            lng: c.location.lng,
          }
        : null,
      sources: c.sources.map(
        (s: {
          kind: string;
          url: string;
          sha256?: string;
          fileLastUpdatedOn?: string;
        }) => ({
          kind: s.kind,
          url: s.url,
          sha256: s.sha256 ?? null,
          fileLastUpdatedOn: s.fileLastUpdatedOn ?? null,
        }),
      ),
      // The hospital's assistance policy when one was captured beside it.
      policy: policy?.thresholds
        ? {
            policyUrl: policy.policyUrl,
            capturedAt: policy.capturedAt,
            freeCareMaxFplPct: policy.thresholds.freeCareMaxFplPct ?? null,
            discountMaxFplPct: policy.thresholds.discountMaxFplPct ?? null,
          }
        : null,
      prices: c.prices.map(
        (p: {
          code: string;
          setting: string;
          discountedCashCents: number | null;
          grossChargeCents?: number | null;
        }) => ({
          code: p.code,
          setting: p.setting,
          discountedCashCents: p.discountedCashCents,
          grossChargeCents: p.grossChargeCents ?? null,
        }),
      ),
    }));
  const cacheDir = join(ROOT, "data/cache/photos");
  const photoCache = (() => {
    try {
      return readdirSync(cacheDir)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => read(`data/cache/photos/${f}`))
        .map((c) => ({
          sha256: c.sha256,
          model: c.model,
          readAt: c.readAt,
          bill: c.bill,
          reconciliation: c.reconciliation,
          warnings: c.warnings,
        }));
    } catch {
      return [];
    }
  })();
  // Assistance screener inputs: state and federal rules, captured hospital
  // policies (income limits with quotes), and the poverty guidelines.
  const regulations = readdirSync(join(ROOT, "data/regulations"))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => {
      const file = read(`data/regulations/${f}`);
      const lawName = String(file.title).split(" (")[0];
      return file.rules.map((r: Record<string, unknown>) => ({
        id: r.id,
        jurisdiction: file.jurisdiction,
        title: r.title,
        lawName,
        effectKind: (r.effect as { kind: string }).kind,
        plain: r.plain,
        ...(r.short ? { short: r.short } : {}),
        citation: r.citation,
        sourceUrl: r.sourceUrl,
        quote: r.quote ?? null,
        capturedAt: r.capturedAt,
        verified: r.verified,
        ...(r.screen ? { screen: r.screen } : {}),
      }));
    });
  const policies = readdirSync(join(ROOT, "data/hospitals"), {
    withFileTypes: true,
  })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const p = tryRead(`data/hospitals/${d.name}/policy.json`);
      const c = tryRead(`data/hospitals/${d.name}/capture.json`);
      if (!p?.thresholds) return null;
      return {
        hospitalName: p.hospitalName ?? c?.hospitalName ?? d.name,
        policyTitle: p.policyTitle,
        policyUrl: p.policyUrl,
        capturedAt: p.capturedAt,
        freeCareMaxFplPct: p.thresholds.freeCareMaxFplPct ?? null,
        freeCareQuote: p.thresholds.freeCareQuote ?? null,
        discountMaxFplPct: p.thresholds.discountMaxFplPct ?? null,
        discountQuote: p.thresholds.discountQuote ?? null,
        references501r: p.references501r?.quote ?? null,
      };
    })
    .filter(Boolean);
  const fpl = read("data/hospitals/fpl-2026.json");
  return {
    samples,
    photoCache,
    regulations,
    policies,
    fpl: {
      year: fpl.year,
      source: fpl.source,
      contiguous48AndDC: fpl.contiguous48AndDC,
      alaska: fpl.alaska,
      hawaii: fpl.hawaii,
    },
    captures: hospitals,
    mue: tryRead("data/rules/mue-subset.json"),
    evalResults: tryRead("data/eval/results.json"),
  };
}

export function render(data: ReturnType<typeof buildData>): string {
  return `// GENERATED by scripts/gen-api-data.ts from data/. Do not edit.
export const DATA = ${JSON.stringify(data, null, 2)} as const;
`;
}

if (import.meta.main) {
  const out = join(ROOT, "packages/api/src/data.gen.ts");
  const next = render(buildData());
  if (process.argv.includes("--check")) {
    if (readFileSync(out, "utf8") !== next) {
      console.error(
        "packages/api/src/data.gen.ts is stale: run bun run data:gen",
      );
      process.exit(1);
    }
    console.log("data.gen.ts is up to date");
  } else {
    writeFileSync(out, next);
    console.log(`wrote ${out}`);
  }
}
