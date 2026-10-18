// Captures a hospital's financial assistance policy with Browser Use, the same
// client the app's live lookup uses, then keeps only quotes found verbatim in
// the downloaded policy PDF. Writes data/hospitals/<key>/policy.json in the
// Cedars-Sinai format, with the run record and PDF as evidence.
//
// Usage: bun scripts/hospitals/lookup-policy.ts <key> "<hospital name>" <city> <state>
// Reads BROWSER_USE_API_KEY from the environment. Never prints it.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getRun,
  isDone,
  lookupOutput,
  startPolicyLookup,
} from "../../packages/api/src/services/browser-use";
import { policyFromLookup } from "../../packages/core/src/index";

const ROOT = join(import.meta.dirname, "..", "..");
const [key, name, city, state] = process.argv.slice(2);
if (!key || !name || !city || !state) {
  console.error(
    'Usage: bun scripts/hospitals/lookup-policy.ts <key> "<name>" <city> <state>',
  );
  process.exit(1);
}
const apiKey = process.env.BROWSER_USE_API_KEY;
if (!apiKey) {
  console.error("BROWSER_USE_API_KEY is not set");
  process.exit(1);
}

const dir = join(ROOT, "data/hospitals", key);
const ev = join(dir, "evidence");
mkdirSync(ev, { recursive: true });
const sha = (b: Buffer | string) =>
  createHash("sha256").update(b).digest("hex");

// RUN_ID re-reads a finished run instead of starting (and paying for) a new one.
const run0 = process.env.RUN_ID
  ? { id: process.env.RUN_ID }
  : await startPolicyLookup(apiKey, { name, city, state });
console.log(`run ${run0.id} ${process.env.RUN_ID ? "re-read" : "started"}`);
const t0 = Date.now();
let run = await getRun(apiKey, run0.id);
while (!isDone(run.status) && Date.now() - t0 < 15 * 60_000) {
  await new Promise((r) => setTimeout(r, 5000));
  run = await getRun(apiKey, run0.id);
}
const record = {
  runId: run.id,
  status: run.status,
  task: "policyLookupTask (packages/core/src/assistance/lookup.ts)",
  output: run.output,
  error: run.error,
  createdAt: run.createdAt,
  updatedAt: run.updatedAt,
  totalCostUsd: run.totalCostUsd,
  // From the run's own timestamps, so re-reading a run keeps its duration.
  seconds: Math.round(
    (Date.parse(run.updatedAt) - Date.parse(run.createdAt)) / 1000,
  ),
};
writeFileSync(
  join(ev, "browser_use_lookup_run.json"),
  `${JSON.stringify(record, null, 2)}\n`,
);
console.log(
  `run ${run.status} in ${record.seconds}s, cost $${run.totalCostUsd}`,
);
const out = lookupOutput(run);
if (!out) {
  console.error("No usable output");
  process.exit(2);
}

// Download the policy PDFs the agent found and read their text.
const evidence: Record<string, unknown>[] = [
  { file: "evidence/browser_use_lookup_run.json", runId: run.id },
];
let text = "";
for (const [i, url] of out.pdf_urls.slice(0, 1).entries()) {
  if (!url.startsWith("https://")) continue;
  const res = await fetch(url);
  if (!res.ok) continue;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== "%PDF") continue;
  const file = `policy-${i + 1}.pdf`;
  writeFileSync(join(ev, file), buf);
  const pdfText = execFileSync(
    "python3",
    // -E -P: ignore PYTHON* env vars and don't import from the script's or
    // working folder; user site-packages (pypdf) still load.
    ["-E", "-P", join(ROOT, "scripts/hospitals/pdf_text.py"), join(ev, file)],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  text += `\n${pdfText}`;
  evidence.push({
    file: `evidence/${file}`,
    url,
    sha256: sha(buf),
    bytes: buf.length,
    retrievedAt: new Date().toISOString(),
  });
}
if (!text) {
  console.error("No policy PDF could be read, so no quote can be verified.");
  process.exit(3);
}

const capturedAt = new Date().toISOString();
const built = policyFromLookup(out, {
  hospitalName: name,
  capturedAt,
  sourceText: text,
});
if (!built) {
  console.error("No income limit is backed by a verified quote.");
  process.exit(4);
}
const { policy, quotes, dropped } = built;
const json = {
  hospitalKey: key,
  hospitalName: name,
  policyUrl: policy.policyUrl,
  policyTitle: policy.policyTitle,
  capturedAt,
  capturedBy: `scripts/hospitals/lookup-policy.ts, Browser Use run ${run.id}`,
  billingPhone: out.billing_phone,
  evidence,
  quotes: quotes.map((q) => ({ text: q, foundIn: "policy PDF" })),
  thresholds: {
    freeCareMaxFplPct: policy.freeCareMaxFplPct,
    freeCareQuote: policy.freeCareQuote,
    discountMaxFplPct: policy.discountMaxFplPct,
    discountQuote: policy.discountQuote,
  },
  ...(policy.references501r
    ? {
        references501r: { quote: policy.references501r, foundIn: "policy PDF" },
      }
    : {}),
  notes: `Limits are kept only when a quote found verbatim in the policy PDF states them. Quotes not found verbatim were dropped: ${dropped.length}. BetterBill only estimates; the hospital decides.`,
};
writeFileSync(join(dir, "policy.json"), `${JSON.stringify(json, null, 2)}\n`);
console.log(
  `wrote data/hospitals/${key}/policy.json: free ≤${policy.freeCareMaxFplPct ?? "-"}%, discount ≤${policy.discountMaxFplPct ?? "-"}%, ${quotes.length} verified quotes, ${dropped.length} dropped`,
);
// Keeps the file list honest for reviewers.
console.log(readFileSync(join(dir, "policy.json"), "utf8").length, "bytes");
