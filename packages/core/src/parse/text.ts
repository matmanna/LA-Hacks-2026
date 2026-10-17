// Deterministic parser for BetterBill's text bill format (plan B ticket
// B-09, agreed with C). Pure: no IO. Columns are separated by 2+ spaces.
import { parseMoneyToCents } from "../money";
import type { Bill, CodeType, Line, Reconciliation } from "../schemas";

const DATE = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\s{2,}(.+)$/;
const HEADER = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/;
const MONEY_TAIL = /\d[\d,]*\.\d{2}\s*$/;
const CODE_TYPES = new Set<CodeType>(["CPT", "HCPCS", "REV", "OTHER"]);

export type TextParse = {
  bill: Bill;
  statedChargesCents: number | null;
  warnings: string[];
  unparsedLines: string[];
  candidateRows: number;
};

export function toIsoDate(s: string): string {
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return us ? `${us[3]}-${us[1]}-${us[2]}` : s;
}

function parseRow(date: string, rest: string, id: string): Line | null {
  const cols = rest.trim().split(/\s{2,}/);
  if (cols.length !== 5) return null;
  const [code, type, description, unitsText, chargeText] = cols as [
    string,
    string,
    string,
    string,
    string,
  ];
  const units = Number(unitsText);
  const chargeCents = parseMoneyToCents(chargeText);
  if (!Number.isFinite(units) || units <= 0 || chargeCents === null) {
    return null;
  }
  const t = type.toUpperCase();
  return {
    id,
    serviceDate: toIsoDate(date),
    description,
    code: code === "-" ? null : code,
    codeType:
      t === "-"
        ? null
        : CODE_TYPES.has(t as CodeType)
          ? (t as CodeType)
          : "OTHER",
    units,
    chargeCents,
    source: { page: 1, bbox: null },
    confidence: 1,
    userEdited: false,
  };
}

export function parseBillText(
  text: string,
  opts: { idPrefix: string },
): TextParse {
  const headers = new Map<string, string>();
  const lines: Line[] = [];
  const unparsedLines: string[] = [];
  const warnings: string[] = [];
  let candidateRows = 0;

  for (const raw of text.split(/\r?\n/)) {
    const row = raw.trim();
    if (!row) continue;
    const dated = DATE.exec(row);
    if (dated) {
      candidateRows++;
      const id = `${opts.idPrefix}-l${String(lines.length + 1).padStart(2, "0")}`;
      const parsed = parseRow(dated[1] as string, dated[2] as string, id);
      if (parsed) lines.push(parsed);
      else unparsedLines.push(raw);
      continue;
    }
    const header = HEADER.exec(row);
    if (header) {
      headers.set(
        (header[1] as string).trim().toUpperCase(),
        (header[2] as string).trim(),
      );
      continue;
    }
    if (/^DATE\s{2,}/i.test(row)) continue; // column header
    if (MONEY_TAIL.test(row)) {
      candidateRows++;
      unparsedLines.push(raw);
    }
  }
  if (unparsedLines.length > 0) {
    warnings.push(`${unparsedLines.length} row(s) could not be read`);
  }

  const money = (key: string) => {
    const v = headers.get(key);
    return v === undefined ? null : parseMoneyToCents(v);
  };
  const [name = "", city = "", state = ""] = (headers.get("HOSPITAL") ?? "")
    .split("|")
    .map((s) => s.trim());
  if (!name) warnings.push("Hospital name not found");
  const account = (headers.get("ACCOUNT") ?? "").replace(/\D/g, "");
  const type = headers.get("TYPE")?.toLowerCase();
  const statementDate = headers.get("STATEMENT DATE");

  const sum = lines.reduce((s, l) => s + l.chargeCents, 0);
  const statedChargesCents = money("TOTAL CHARGES");
  const chargesCents = statedChargesCents ?? sum;
  const adjustmentsCents = money("ADJUSTMENTS") ?? 0;
  const paidCents = money("PAYMENTS") ?? 0;

  return {
    bill: {
      id: `${opts.idPrefix}-bill`,
      hospital: {
        name: name || "Unknown hospital",
        city: city || null,
        state: state || null,
      },
      statementDate: statementDate ? toIsoDate(statementDate) : null,
      accountRefMasked: account ? account.slice(-4) : null,
      kind:
        type === "itemized" || type === "summary"
          ? type
          : lines.some((l) => l.code)
            ? "itemized"
            : "summary",
      sourceKind: "text",
      lines,
      totals: {
        chargesCents,
        adjustmentsCents,
        paidCents,
        dueCents:
          money("AMOUNT DUE") ?? chargesCents - adjustmentsCents - paidCents,
      },
    },
    statedChargesCents,
    warnings,
    unparsedLines,
    candidateRows,
  };
}

// Line sum against the stated total. ok when they match or nothing was stated.
export function reconcile(
  bill: Bill,
  statedChargesCents: number | null = bill.totals.chargesCents,
): Reconciliation {
  const linesSumCents = bill.lines.reduce((s, l) => s + l.chargeCents, 0);
  const diffCents =
    statedChargesCents === null ? 0 : statedChargesCents - linesSumCents;
  return { linesSumCents, statedChargesCents, diffCents, ok: diffCents === 0 };
}

// Plan B: fall back to model cleanup when more than 30% of rows failed.
export function needsCleanup(
  p: Pick<TextParse, "unparsedLines" | "candidateRows">,
): boolean {
  return (
    p.unparsedLines.length > 0 &&
    (p.candidateRows === 0 || p.unparsedLines.length / p.candidateRows > 0.3)
  );
}
