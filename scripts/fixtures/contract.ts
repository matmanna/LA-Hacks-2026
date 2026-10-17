// TEMPORARY copy of the Bill and Eob contracts from docs/plans/00-shared-context.md section 6.
// Delete this file and import from packages/core/src/schemas.ts once B's schemas PR merges.
import { z } from "zod";

const cents = z.number().int();

export const Line = z.object({
  id: z.string(),
  serviceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  description: z.string(),
  code: z.string().nullable(),
  codeType: z.enum(["CPT", "HCPCS", "REV", "OTHER"]).nullable(),
  units: z.number(),
  chargeCents: cents,
  source: z.object({
    page: z.number(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  }),
  confidence: z.number().min(0).max(1),
  userEdited: z.boolean(),
});

export const Bill = z.object({
  id: z.string(),
  hospital: z.object({
    name: z.string(),
    city: z.string().nullable(),
    state: z.string().nullable(),
  }),
  statementDate: z.string().nullable(),
  accountRefMasked: z.string().nullable(),
  kind: z.enum(["itemized", "summary"]),
  sourceKind: z.enum(["photo", "text", "pdf"]),
  lines: z.array(Line),
  totals: z.object({
    chargesCents: cents,
    adjustmentsCents: cents,
    paidCents: cents,
    dueCents: cents,
  }),
});

export const Eob = z.object({
  payer: z.string(),
  claimRefMasked: z.string().nullable(),
  patientResponsibilityCents: cents,
  lines: z
    .array(
      z.object({
        code: z.string().nullable(),
        allowedCents: cents.nullable(),
        patientCents: cents.nullable(),
      }),
    )
    .optional(),
});

export const Lever = z.enum([
  "duplicate",
  "units",
  "eob_mismatch",
  "published_price",
  "assistance",
  "missing_itemization",
]);

export const Tier = z.enum(["confirmed", "rule", "published", "estimate"]);
