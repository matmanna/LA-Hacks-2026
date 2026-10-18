// Procedure outputs that are not core contracts (plan B section 3.2).
import { Action, AuditResult, Bill, CaseSummary, Eob } from "@betterbill/core";
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
