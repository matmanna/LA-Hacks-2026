import { z } from "zod";

// Transcribed from plans/00-shared-context.md section 6. Binding contract,
// owned by B in the real repo. This copy exists only so Role A's pure logic
// has something to compile against before B's scaffold lands.

export const LineSchema = z.object({
  id: z.string(),
  serviceDate: z.string().nullable(),
  description: z.string(),
  code: z.string().nullable(),
  codeType: z.enum(["CPT", "HCPCS", "REV", "OTHER"]).nullable(),
  units: z.number(),
  chargeCents: z.number().int(),
  source: z.object({
    page: z.number(),
    bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(),
  }),
  confidence: z.number(),
  userEdited: z.boolean(),
});
export type Line = z.infer<typeof LineSchema>;

export const BillSchema = z.object({
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
  lines: z.array(LineSchema),
  totals: z.object({
    chargesCents: z.number().int(),
    adjustmentsCents: z.number().int(),
    paidCents: z.number().int(),
    dueCents: z.number().int(),
  }),
});
export type Bill = z.infer<typeof BillSchema>;

export const EobSchema = z.object({
  payer: z.string(),
  claimRefMasked: z.string().nullable(),
  patientResponsibilityCents: z.number().int(),
  lines: z
    .array(
      z.object({
        code: z.string().nullable(),
        allowedCents: z.number().int().nullable(),
        patientCents: z.number().int().nullable(),
      }),
    )
    .optional(),
});
export type Eob = z.infer<typeof EobSchema>;

export const LeverSchema = z.enum([
  "duplicate",
  "units",
  "eob_mismatch",
  "published_price",
  "assistance",
  "missing_itemization",
]);
export type Lever = z.infer<typeof LeverSchema>;

export const TierSchema = z.enum(["confirmed", "rule", "published", "estimate"]);
export type Tier = z.infer<typeof TierSchema>;

export const FlagSchema = z.object({
  id: z.string(),
  lineIds: z.array(z.string()),
  lever: LeverSchema,
  tier: TierSchema,
  title: z.string().max(60),
  explanation: z.string(),
  amountCents: z.number().int(),
  evidence: z.object({
    kind: z.enum(["arithmetic", "rule", "quote", "price_file"]),
    detail: z.string(),
    quote: z.string().optional(),
    sourceUrl: z.string().optional(),
    capturedAt: z.string().optional(),
  }),
  confidence: z.number(),
});
export type Flag = z.infer<typeof FlagSchema>;

export const SavingsSchema = z.object({
  confirmedCents: z.number().int(),
  potentialLowCents: z.number().int(),
  potentialHighCents: z.number().int(),
  assistance: z.object({
    status: z.enum(["likely", "possible", "unlikely", "unknown"]),
    quote: z.string().optional(),
    sourceUrl: z.string().optional(),
    capturedAt: z.string().optional(),
  }),
  method: z.array(z.string()),
});
export type Savings = z.infer<typeof SavingsSchema>;

export const BalanceSummarySchema = z.object({
  billedCents: z.number().int(),
  fairBalanceCents: z.number().int(),
  fairBalanceLowCents: z.number().int(),
  lessThanBilledCents: z.number().int(),
  isEstimate: z.boolean(),
});
export type BalanceSummary = z.infer<typeof BalanceSummarySchema>;

export const CaseStatusSchema = z.enum([
  "new",
  "lines_confirmed",
  "audited",
  "action_pending",
  "sent",
  "called",
  "closed",
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CaseEventSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  at: z.string(),
  actor: z.enum(["user", "agent", "system"]),
  type: z.string(),
  summary: z.string(),
  artifactRef: z.string().optional(),
});
export type CaseEvent = z.infer<typeof CaseEventSchema>;

export const ActionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  kind: z.enum(["letter", "itemized_request", "call"]),
  draft: z.string(),
  recipient: z.string(),
  approvedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  outcome: z.string().nullable(),
});
export type Action = z.infer<typeof ActionSchema>;
