// JSON shape a model (StepFun step-5-preview) must return when it reads a
// bill. Charges stay printed strings; we convert them, the model never does
// arithmetic. Pure: no IO.
import { z } from "zod";

import { parseMoneyToCents } from "../money";
import type { Bill, CodeType, Line } from "../schemas";
import { toIsoDate } from "./text";

export const ReaderOutput = z.object({
  hospital: z
    .object({
      name: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  statementDate: z.string().nullable().optional(),
  kind: z.string().nullable().optional(),
  lines: z.array(
    z.object({
      serviceDate: z.string().nullable(),
      description: z.string(),
      code: z.string().nullable(),
      codeType: z.string().nullable(),
      units: z.number().nullable(),
      charge: z.string(),
      bbox: z.array(z.number()).length(4).nullable().optional(),
      confidence: z.number().nullable().optional(),
      page: z.number().int().nullable().optional(),
    }),
  ),
  totals: z
    .object({
      charges: z.string().nullable().optional(),
      adjustments: z.string().nullable().optional(),
      paid: z.string().nullable().optional(),
      due: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type ReaderOutput = z.infer<typeof ReaderOutput>;

const CODE_TYPES = new Set(["CPT", "HCPCS", "REV", "OTHER"]);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function toBbox(
  b: number[] | null | undefined,
): [number, number, number, number] | null {
  if (!b || b.length !== 4) return null;
  const [x0, y0, x1, y1] = b.map(clamp01) as [number, number, number, number];
  return x1 <= x0 || y1 <= y0 ? null : [x0, y0, x1, y1];
}

export function readerOutputToBill(
  out: ReaderOutput,
  opts: { idPrefix: string; sourceKind: Bill["sourceKind"] },
): { bill: Bill; statedChargesCents: number | null; warnings: string[] } {
  const warnings: string[] = [];
  const lines: Line[] = [];
  for (const l of out.lines) {
    const chargeCents = parseMoneyToCents(l.charge);
    if (chargeCents === null) {
      warnings.push(`Could not read the charge "${l.charge}"`);
      continue;
    }
    const date = l.serviceDate ? toIsoDate(l.serviceDate.trim()) : null;
    const type = l.codeType?.trim().toUpperCase() ?? null;
    lines.push({
      id: `${opts.idPrefix}-l${String(lines.length + 1).padStart(2, "0")}`,
      serviceDate: date && ISO.test(date) ? date : null,
      description: l.description.trim(),
      code: l.code?.trim() || null,
      codeType: type
        ? ((CODE_TYPES.has(type) ? type : "OTHER") as CodeType)
        : null,
      units: l.units && l.units > 0 ? l.units : 1,
      chargeCents,
      source: { page: l.page && l.page > 0 ? l.page : 1, bbox: toBbox(l.bbox) },
      confidence: clamp01(l.confidence ?? 0.5),
      userEdited: false,
    });
  }
  const money = (s: string | null | undefined) =>
    s ? parseMoneyToCents(s) : null;
  const sum = lines.reduce((s, l) => s + l.chargeCents, 0);
  const statedChargesCents = money(out.totals?.charges);
  const chargesCents = statedChargesCents ?? sum;
  const adjustmentsCents = money(out.totals?.adjustments) ?? 0;
  const paidCents = money(out.totals?.paid) ?? 0;
  const kind = out.kind?.toLowerCase();
  const statementDate = out.statementDate ? toIsoDate(out.statementDate) : null;
  return {
    bill: {
      id: `${opts.idPrefix}-bill`,
      hospital: {
        name: out.hospital?.name?.trim() || "Unknown hospital",
        city: out.hospital?.city?.trim() || null,
        state: out.hospital?.state?.trim() || null,
      },
      statementDate:
        statementDate && ISO.test(statementDate) ? statementDate : null,
      accountRefMasked: null,
      kind:
        kind === "itemized" || kind === "summary"
          ? kind
          : lines.some((l) => l.code)
            ? "itemized"
            : "summary",
      sourceKind: opts.sourceKind,
      lines,
      totals: {
        chargesCents,
        adjustmentsCents,
        paidCents,
        dueCents:
          money(out.totals?.due) ?? chargesCents - adjustmentsCents - paidCents,
      },
    },
    statedChargesCents,
    warnings,
  };
}
