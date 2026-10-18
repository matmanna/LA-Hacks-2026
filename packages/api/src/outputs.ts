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

export const CallStarted = z.object({ callId: z.string(), status: z.string() });

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
