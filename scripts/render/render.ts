// Renders data/synthetic/bills/*.json to HTML, PNG (1700 x 2200, letter at 200 dpi) and PDF.
// Usage: bun run render:bills
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = join(import.meta.dirname, "..", "..");
const BILLS = join(ROOT, "data/synthetic/bills");
const OUT = join(ROOT, "data/synthetic/rendered");
const template = readFileSync(
  join(import.meta.dirname, "template.html"),
  "utf8",
);

// Letter is 816 x 1056 CSS px at 96 dpi; scale to 1700 x 2200 (200 dpi).
const PAGE = { width: 816, height: 1056 };
const SCALE = 1700 / PAGE.width;

// Shown on any bill that names a real hospital (decision D-1).
const NOTICES: Record<string, string> = {
  "cedars-sinai":
    "Not issued by Cedars-Sinai. Charges on this bill are invented.",
  "ucla-ronald-reagan":
    "Not issued by UCLA Health. Charges on this bill are invented.",
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// YYYY-MM-DD to MM/DD/YYYY, as printed on most US statements.
const usDate = (d: string | null) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
};

type Line = {
  serviceDate: string | null;
  code: string | null;
  description: string;
  units: number;
  chargeCents: number;
};

function fill(fx: {
  id: string;
  bill: {
    hospital: { name: string; city: string | null; state: string | null };
    statementDate: string | null;
    accountRefMasked: string | null;
    lines: Line[];
    totals: {
      chargesCents: number;
      adjustmentsCents: number;
      paidCents: number;
      dueCents: number;
    };
  };
  context?: { hospitalKey?: string };
}): string {
  const { bill } = fx;
  const notice = NOTICES[fx.context?.hospitalKey ?? ""];
  const rows = bill.lines
    .map(
      (l) =>
        `\t\t\t<tr><td>${usDate(l.serviceDate)}</td><td>${esc(l.code ?? "")}</td><td>${esc(l.description)}</td><td class="num">${l.units}</td><td class="num">${money(l.chargeCents)}</td></tr>`,
    )
    .join("\n");
  const values: Record<string, string> = {
    title: `${fx.id} synthetic statement`,
    hospitalName: esc(bill.hospital.name),
    hospitalPlace: esc(
      [bill.hospital.city, bill.hospital.state].filter(Boolean).join(", "),
    ),
    notice: notice ? `<p class="notice">${esc(notice)}</p>` : "",
    accountRefMasked: esc(bill.accountRefMasked ?? "----"),
    statementDate: usDate(bill.statementDate),
    rows,
    charges: money(bill.totals.chargesCents),
    adjustments: money(bill.totals.adjustmentsCents),
    payments: money(bill.totals.paidCents),
    due: money(bill.totals.dueCents),
    fixtureId: fx.id,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in values)) throw new Error(`unknown placeholder ${k}`);
    return values[k];
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: PAGE,
  deviceScaleFactor: SCALE,
});
const files = readdirSync(BILLS)
  .filter((f) => f.endsWith(".json"))
  .sort();
for (const f of files) {
  const fx = JSON.parse(readFileSync(join(BILLS, f), "utf8"));
  const html = fill(fx);
  const htmlPath = join(OUT, `${fx.id}.html`);
  writeFileSync(htmlPath, html);
  await page.goto(`file://${htmlPath}`);
  await page.screenshot({
    path: join(OUT, `${fx.id}.png`),
    clip: { x: 0, y: 0, ...PAGE },
  });
  await page.pdf({
    path: join(OUT, `${fx.id}.pdf`),
    format: "Letter",
    printBackground: true,
  });
  console.log(`rendered ${fx.id}`);
}
await browser.close();
