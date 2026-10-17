// Builds data/rules/mue-subset.json from the official CMS Outpatient Hospital MUE zip.
// Usage: bun scripts/rules/build-mue-subset.ts
// Expects the zip at .cache/cms/oph-mue.zip (see data/rules/SOURCES.md). retrievedAt is the zip mtime.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const ZIP = join(ROOT, ".cache/cms/oph-mue.zip");
const SOURCE_FILE =
  "https://www.cms.gov/files/zip/medicare-ncci-2026-q4-facility-outpatient-hospital-services-mue-table.zip";
const FILE_NAME = "MCR_MUE_OutpatientHospitalServices_Eff_10-01-2026.csv";
const OUT = join(ROOT, "data/rules/mue-subset.json");

// Codes used by C-01/C-02 fixtures and plan C N14. Codes found in fixture files are added to these.
const PINNED = [
  "36415",
  "70450",
  "71046",
  "72100",
  "72148",
  "74177",
  "80053",
  "81003",
  "82962",
  "85025",
  "93005",
  "96360",
  "96361",
  "96374",
  "99283",
  "99284",
  "99285",
  "A9579",
  "J0690",
  "J1100",
  "J1885",
  "J2270",
  "J2405",
  "J7030",
  "J7120",
];
const FIXTURE_DIRS = ["data/synthetic/bills", "data/benchmark/botm"];

function fixtureCodes(): string[] {
  const codes: string[] = [];
  for (const dir of FIXTURE_DIRS) {
    let files: string[];
    try {
      files = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }
    for (const f of files) {
      const fx = JSON.parse(readFileSync(join(ROOT, dir, f), "utf8"));
      for (const line of fx.bill?.lines ?? [])
        if (line.code) codes.push(line.code);
    }
  }
  return codes;
}

// Minimal CSV parser: handles quoted fields with commas and newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const zip = readFileSync(ZIP);
const sha256 = createHash("sha256").update(zip).digest("hex");
const csv = execFileSync("unzip", ["-p", ZIP, FILE_NAME], {
  encoding: "latin1",
  maxBuffer: 64 * 1024 * 1024,
});
const rows = parseCsv(csv);

const headerIdx = rows.findIndex((r) => r[0]?.startsWith("HCPCS"));
if (headerIdx < 0) throw new Error("header row not found");
const header = rows[headerIdx].map((h) => h.replace(/\s+/g, " ").trim());
const expectedHeader = [
  "HCPCS/ CPT Code",
  "Outpatient Hospital Services MUE Values",
  "MUE Adjudication Indicator",
  "MUE Rationale",
];
if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
  throw new Error(`unexpected header: ${JSON.stringify(header)}`);
}

const table = new Map<
  string,
  { mue: number; mai: string; rationale: string }
>();
for (const r of rows.slice(headerIdx + 1)) {
  if (!r[0]) continue;
  const mue = Number(r[1]);
  if (!Number.isInteger(mue))
    throw new Error(`non-integer MUE for ${r[0]}: ${r[1]}`);
  table.set(r[0].trim(), { mue, mai: r[2].trim(), rationale: r[3].trim() });
}

const wanted = [...new Set([...PINNED, ...fixtureCodes()])].sort();
const entries = [];
const missing: string[] = [];
for (const code of wanted) {
  const hit = table.get(code);
  if (!hit) {
    missing.push(code);
    continue;
  }
  entries.push({
    code,
    maxUnitsPerDay: hit.mue,
    mai: hit.mai,
    rationale: hit.rationale,
  });
}

const out = {
  table: "CMS NCCI MUE, Facility Outpatient Hospital Services",
  sourcePage:
    "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits",
  sourceFile: SOURCE_FILE,
  fileName: FILE_NAME,
  effectiveDate: "2026-10-01",
  sha256,
  retrievedAt: statSync(ZIP)
    .mtime.toISOString()
    .replace(/\.\d{3}Z$/, "Z"),
  license:
    "CPT codes copyright American Medical Association. Codes and unit values only; no descriptors stored.",
  entries,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(out, null, "\t")}\n`);
console.log(`rows in CMS table: ${table.size}`);
console.log(
  `wrote ${entries.length} entries to data/rules/mue-subset.json (sha256 ${sha256})`,
);
if (missing.length)
  console.log(`no MUE in file (omitted): ${missing.join(", ")}`);
