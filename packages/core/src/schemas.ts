// Data contracts (docs/plans/00-shared-context.md section 6, plus plan B
// section 3.1). Owned by B. Change only by a PR labelled `contract`.
// Money is integer cents. Times are ISO 8601 UTC strings. Ids are strings.
import { z } from "zod";

const cents = z.number().int();
const isoTime = z.iso.datetime();
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const unit = z.number().min(0).max(1);

export const CodeType = z.enum(["CPT", "HCPCS", "REV", "OTHER"]);
export type CodeType = z.infer<typeof CodeType>;

export const Line = z.object({
  id: z.string(),
  serviceDate: ymd.nullable(),
  description: z.string(),
  code: z.string().nullable(),
  codeType: CodeType.nullable(),
  units: z.number().positive().default(1),
  chargeCents: cents,
  source: z.object({
    page: z.number().int().min(1),
    bbox: z.tuple([unit, unit, unit, unit]).nullable(),
  }),
  confidence: unit,
  userEdited: z.boolean(),
});
export type Line = z.infer<typeof Line>;

export const Bill = z.object({
  id: z.string(),
  hospital: z.object({
    name: z.string(),
    city: z.string().nullable(),
    state: z.string().nullable(),
  }),
  statementDate: ymd.nullable(),
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
export type Bill = z.infer<typeof Bill>;

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
export type Eob = z.infer<typeof Eob>;

export const Lever = z.enum([
  "duplicate",
  "units",
  "eob_mismatch",
  "published_price",
  "assistance",
  "missing_itemization",
]);
export type Lever = z.infer<typeof Lever>;

export const Tier = z.enum(["confirmed", "rule", "published", "estimate"]);
export type Tier = z.infer<typeof Tier>;

export const Flag = z.object({
  id: z.string(),
  lineIds: z.array(z.string()),
  lever: Lever,
  tier: Tier,
  title: z.string().max(60),
  explanation: z.string(),
  amountCents: cents,
  evidence: z.object({
    kind: z.enum(["arithmetic", "rule", "quote", "price_file"]),
    detail: z.string(),
    quote: z.string().optional(),
    sourceUrl: z.string().optional(),
    capturedAt: z.string().optional(),
  }),
  confidence: unit,
});
export type Flag = z.infer<typeof Flag>;

export const AssistanceStatus = z.enum([
  "likely",
  "possible",
  "unlikely",
  "unknown",
]);
export type AssistanceStatus = z.infer<typeof AssistanceStatus>;

export const Assistance = z.object({
  status: AssistanceStatus,
  quote: z.string().optional(),
  sourceUrl: z.string().optional(),
  capturedAt: z.string().optional(),
});
export type Assistance = z.infer<typeof Assistance>;

export const Savings = z.object({
  confirmedCents: cents,
  potentialLowCents: cents,
  potentialHighCents: cents,
  assistance: Assistance,
  method: z.array(z.string()),
});
export type Savings = z.infer<typeof Savings>;

// Added after plan review. Computed by balanceSummary() in ./balance.ts and
// returned by audit.get. The UI reads it and never computes savings.
export const BalanceSummary = z.object({
  billedCents: cents,
  fairBalanceCents: cents,
  fairBalanceLowCents: cents,
  lessThanBilledCents: cents,
  isEstimate: z.boolean(),
});
export type BalanceSummary = z.infer<typeof BalanceSummary>;

export const CaseStatus = z.enum([
  "new",
  "lines_confirmed",
  "audited",
  "action_pending",
  "sent",
  "called",
  "closed",
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

// Append-only. Corrections are new events.
export const CaseEvent = z.object({
  id: z.string(),
  caseId: z.string(),
  at: isoTime,
  actor: z.enum(["user", "agent", "system"]),
  type: z.string(),
  summary: z.string(),
  artifactRef: z.string().optional(),
});
export type CaseEvent = z.infer<typeof CaseEvent>;

export const Action = z.object({
  id: z.string(),
  caseId: z.string(),
  kind: z.enum(["letter", "itemized_request", "call"]),
  draft: z.string(),
  recipient: z.string(),
  approvedAt: isoTime.nullable(),
  sentAt: isoTime.nullable(),
  outcome: z.string().nullable(),
});
export type Action = z.infer<typeof Action>;

// Plan B section 3.1 additions.
export const Reconciliation = z.object({
  linesSumCents: cents,
  statedChargesCents: cents.nullable(),
  diffCents: cents,
  ok: z.boolean(),
});
export type Reconciliation = z.infer<typeof Reconciliation>;

export const ReaderMode = z.enum([
  "deterministic",
  "model_cleanup",
  "step-5-preview",
  "cache",
]);
export type ReaderMode = z.infer<typeof ReaderMode>;

export const ParseResult = z.object({
  caseId: z.string(),
  bill: Bill,
  reconciliation: Reconciliation,
  lowConfidenceLineIds: z.array(z.string()),
  reader: z.object({
    mode: ReaderMode,
    model: z.string().nullable(),
    latencyMs: z.number().int(),
    cachedAt: isoTime.nullable(), // set only when served from cache; UI must label it
  }),
  warnings: z.array(z.string()),
});
export type ParseResult = z.infer<typeof ParseResult>;

export const AuditResult = z.object({
  caseId: z.string(),
  flags: z.array(Flag),
  savings: Savings,
  balance: BalanceSummary,
  durationMs: z.number().int(),
});
export type AuditResult = z.infer<typeof AuditResult>;

export const CaseSummary = z.object({
  id: z.string(),
  status: CaseStatus,
  hospitalName: z.string().nullable(),
  createdAt: isoTime,
  savings: Savings.nullable(),
});
export type CaseSummary = z.infer<typeof CaseSummary>;

// B2 evidence packet: everything a patient needs to send or keep, read-only.
export const PacketSource = z.object({
  label: z.string(),
  url: z.string(),
  capturedAt: z.string().nullable(),
  sha256: z.string().nullable(),
});
export type PacketSource = z.infer<typeof PacketSource>;

export const Packet = z.object({
  case: CaseSummary,
  bill: Bill,
  flags: z.array(Flag),
  savings: Savings,
  balance: BalanceSummary,
  actions: z.array(Action),
  events: z.array(CaseEvent),
  sources: z.array(PacketSource),
  generatedAt: isoTime,
});
export type Packet = z.infer<typeof Packet>;
