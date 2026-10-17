// Scans app source and copy files for banned words. Usage: bun run copy:check
// allowlistFiles entries: "path" skips a whole file; "path#key" skips one top-level key of a JSON file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";

const ROOT = join(import.meta.dirname, "..", "..");
const wording = JSON.parse(
  readFileSync(join(ROOT, "data/copy/wording.json"), "utf8"),
);
const banned: string[] = wording.banned;
const disclaimer: string = wording.disclaimer;
const allow: string[] = wording.allowlistFiles ?? [];

const PATTERNS = [
  "packages/**/src/**/*.{ts,tsx}",
  "apps/web/src/**/*.{ts,tsx}",
  "data/copy/*.json",
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchers = banned.map((w) => ({
  word: w,
  re: new RegExp(`\\b${escapeRegExp(w).replace(/ /g, "\\s+")}\\b`, "i"),
}));

function textFor(file: string): string {
  const raw = readFileSync(join(ROOT, file), "utf8");
  const skipKeys = allow
    .filter((a) => a.startsWith(`${file}#`))
    .map((a) => a.slice(file.length + 1));
  if (skipKeys.length === 0) return raw;
  // Drop skipped keys, then re-serialize so line numbers refer to the filtered JSON.
  const obj = JSON.parse(raw);
  for (const k of skipKeys) delete obj[k];
  return JSON.stringify(obj, null, "\t");
}

const files = new Set<string>();
for (const p of PATTERNS) {
  for (const f of new Glob(p).scanSync({ cwd: ROOT })) {
    if (!f.includes("node_modules") && !allow.includes(f)) files.add(f);
  }
}

let hits = 0;
for (const file of [...files].sort()) {
  const lines = textFor(file).split("\n");
  lines.forEach((line, i) => {
    if (line.includes(disclaimer)) return;
    for (const { word, re } of matchers) {
      if (re.test(line)) {
        hits++;
        console.log(`${file}:${i + 1}: ${word}`);
      }
    }
  });
}
console.log(`${files.size} files scanned, ${hits} hit(s)`);
process.exit(hits > 0 ? 1 : 0);
