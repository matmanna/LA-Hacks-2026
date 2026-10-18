// Procedure inputs (plan B section 3.2). Shared shapes come from core.
import { Eob, Line } from "@betterbill/core";
import { z } from "zod";

export const EmptyInput = z.object({});

export const CaseCreateInput = z.object({
  sample: z.string().optional(), // sample id like "bill-01"
});

export const CaseIdInput = z.object({ caseId: z.string() });

export const ParseTextInput = z.object({
  caseId: z.string(),
  text: z.string().max(50_000),
  eobText: z.string().max(50_000).optional(),
});

export const ParsePhotoInput = z.object({
  caseId: z.string(),
  pages: z
    .array(
      z.object({ imageDataUrl: z.string(), page: z.number().int().min(1) }),
    )
    .min(1)
    .max(3),
});

export const ConfirmLinesInput = z.object({
  caseId: z.string(),
  lines: z.array(Line),
  eob: Eob.nullable().optional(),
});

export const AssistanceCheckInput = z.object({
  caseId: z.string(),
  householdSize: z.number().int().min(1),
  annualIncomeCents: z.number().int().min(0),
});

// kind "call" drafts the call script the user approves before call.start.
export const DraftLetterInput = z.object({
  caseId: z.string(),
  kind: z.enum(["letter", "itemized_request", "call"]),
});

export const ActionIdInput = z.object({ actionId: z.string() });

// cancel: true withdraws the draft instead, so the 16 binding procedure names
// stay as they are.
export const ApproveInput = z.object({
  actionId: z.string(),
  draftHash: z.string(),
  consent: z.boolean().optional(),
  cancel: z.boolean().optional(),
});

export const CallIdInput = z.object({ callId: z.string() });
