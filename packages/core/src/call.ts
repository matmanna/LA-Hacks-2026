// Outbound call to the billing office (tickets A-08, A-09). Pure: builds the
// exact script the user approves and shapes the call's outcome.
import { z } from "zod";

import { formatMoney } from "./money";
import type { Bill, Flag } from "./schemas";

export const DISCLOSURE =
  "Hi, this is an automated assistant calling on behalf of a patient.";

// Dynamic variables for the ElevenLabs agent. Only what the script says out
// loud: no codes, dates of birth, insurance ids, or full account numbers.
export type CallVars = {
  hospital_name: string;
  account_last4: string;
  disputed_items: string;
  ask: string;
};

const ASK =
  "Please review these items and tell me the next step and a reference number.";

export function buildCallVars(bill: Bill, flags: Flag[]): CallVars {
  const items = [...flags]
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 3)
    .map((f) => `${f.title}, ${formatMoney(f.amountCents)}`);
  const last4 = (bill.accountRefMasked ?? "").replace(/\D/g, "").slice(-4);
  return {
    hospital_name: bill.hospital.name,
    account_last4: last4.length === 4 ? last4 : "not available",
    disputed_items: items.join("; "),
    ask: ASK,
  };
}

export function renderCallScript(vars: CallVars): string {
  return [
    `${DISCLOSURE} This call may be recorded and transcribed. Is it okay to continue?`,
    `If yes: I am calling about account ending in ${vars.account_last4} at ${vars.hospital_name}. The patient found items that look wrong: ${vars.disputed_items}. ${vars.ask}`,
    "If no: Thank you. I will end the call now.",
    "The assistant will not share anything else. It will not agree to payments.",
  ].join("\n\n");
}

export const CallTurnSchema = z.object({
  role: z.enum(["agent", "user"]),
  message: z.string(),
  t: z.number(),
});
export type CallTurn = z.infer<typeof CallTurnSchema>;

export const CallOutcomeSchema = z.object({
  status: z.enum(["done", "failed", "no_consent"]),
  summary: z.string(),
  referenceNumber: z.string().nullable(),
  billingResponse: z.string().nullable(),
  nextStep: z.string().nullable(),
  followUpDate: z.string().nullable(),
  durationSecs: z.number().nullable(),
  transcript: z.array(CallTurnSchema),
  recorded: z.boolean(),
  source: z.enum(["live", "recorded_fallback"]),
  recordedAt: z.string().optional(),
});
export type CallOutcome = z.infer<typeof CallOutcomeSchema>;

export function checkDisclosure(transcript: CallTurn[]): boolean {
  const first = transcript.find((t) => t.role === "agent");
  return first?.message.trim().startsWith(DISCLOSURE) ?? false;
}

export function isAllowedNumber(e164: string, allowlist: string): boolean {
  const allowed = allowlist
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return allowed.includes(e164.trim());
}

// "agent:" / "billing:" lines, the format the activity page's transcript
// card reads.
export function transcriptText(transcript: CallTurn[]): string {
  return transcript
    .map((t) => `${t.role === "agent" ? "agent" : "billing"}: ${t.message}`)
    .join("\n");
}

export type CallState =
  | "not_started"
  | "ringing"
  | "in_progress"
  | "done"
  | "failed"
  | "no_consent";

export function mapConversationStatus(status: string): CallState {
  if (status === "initiated") return "ringing";
  if (status === "in-progress" || status === "processing") return "in_progress";
  if (status === "done") return "done";
  return "failed";
}
