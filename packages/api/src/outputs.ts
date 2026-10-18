// Procedure outputs that are not core contracts (plan B section 3.2).
import {
  Action,
  AuditResult,
  Bill,
  CaseSummary,
  Eob,
  Tier,
} from "@betterbill/core";
import { z } from "zod";

export const CaseDetail = z.object({
  case: CaseSummary,
  bill: Bill.nullable(),
  eob: Eob.nullable(),
  audit: AuditResult.nullable(),
  actions: z.array(Action),
});
export type CaseDetail = z.infer<typeof CaseDetail>;

export const ConfirmLinesOutput = z.object({
  caseId: z.string(),
  status: z.literal("lines_confirmed"),
});

// draftHash round-trips through the client so action.approve can prove the user
// approved this exact text (A-05).
export const DraftLetterResult = z.object({
  action: Action,
  draftHash: z.string(),
  claims: z.array(
    z.object({
      flagId: z.string(),
      paragraphIndex: z.number().int(),
      amountCents: z.number().int(),
      tier: Tier,
    }),
  ),
  usedFallback: z.boolean(),
});

export const CallStarted = z.object({
  callId: z.string(),
  status: z.string(),
  browserSession: z
    .object({ serverUrl: z.string(), token: z.string() })
    .optional(),
});

export const CallStatus = z.object({
  status: z.string(),
  transcript: z.string().nullable(),
  outcome: z.string().nullable(),
});

// Passthrough of data/eval/results.json; generatedAt is null until C ships it.
export const EvalResults = z.looseObject({
  generatedAt: z.string().nullable(),
});

export const ShareResult = z.object({ token: z.string(), path: z.string() });
export const RevokeResult = z.object({
  caseId: z.string(),
  revoked: z.boolean(),
});

// Fee breakdown computed on the server from the stored audit (core savingsFee).
export const PaymentQuote = z.object({
  caseId: z.string(),
  owed: z.boolean(),
  confirmedCents: z.number().int(),
  potentialLowCents: z.number().int(),
  potentialHighCents: z.number().int(),
  feeBps: z.number().int(),
  percentLabel: z.string(),
  feeCents: z.number().int(),
  minCents: z.number().int(),
  capCents: z.number().int(),
  capped: z.boolean(),
  devOverride: z.boolean(),
  note: z.string(),
  // false when POLAR_ACCESS_TOKEN or the product id is missing
  paymentsEnabled: z.boolean(),
});
export type PaymentQuote = z.infer<typeof PaymentQuote>;

export const CheckoutResult = z.object({
  url: z.string(),
  checkoutId: z.string(),
});

// hospital.lookup / hospital.lookupStatus: the background Browser Use lookup
// of a hospital's assistance policy. liveViewUrl goes only to the app.
export const LookupState = z.enum([
  "none",
  "on_file",
  "unavailable",
  "running",
  "done",
  "failed",
]);
export const LookupStatus = z.object({
  state: LookupState,
  hospitalName: z.string().nullable(),
  startedAt: z.string().nullable(),
  steps: z.array(z.object({ at: z.string(), text: z.string() })),
  liveViewUrl: z.string().nullable(),
  policy: z
    .object({
      policyTitle: z.string(),
      policyUrl: z.string(),
      freeCareMaxFplPct: z.number().nullable(),
      discountMaxFplPct: z.number().nullable(),
      billingPhone: z.string().nullable(),
    })
    .nullable(),
});
export type LookupStatus = z.infer<typeof LookupStatus>;

// contact.get / contact.set: where calls for a case go. Phones are E.164.
// savedPatientPhone is the number from the signed-in patient's earlier case.
export const Contact = z.object({
  patientPhone: z.string().nullable(),
  billingPhone: z.string().nullable(),
  savedPatientPhone: z.string().nullable(),
  hospitalName: z.string().nullable(),
});
export type Contact = z.infer<typeof Contact>;
