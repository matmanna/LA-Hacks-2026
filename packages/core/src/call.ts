// Outbound call to the billing office (tickets A-08, A-09). Pure: builds the
// exact script the user approves and shapes the call's outcome.
import { z } from "zod";

import { formatMoney } from "./money";
import type { Bill, CaseEvent, Flag } from "./schemas";

export const DISCLOSURE =
  "Hi, this is an automated assistant calling on behalf of a patient.";

// Every available fact is included in the approval; identity is fictional demo data only.
export type CallVars = {
  hospital_name: string;
  account_last4: string;
  disputed_items: string;
  ask: string;
  review_topics: string;
  case_context: string;
  patient_name: string;
  patient_dob: string;
};

const ASK =
  "Please review these items and tell me the next step and a reference number.";

export function isSyntheticSampleCase(
  events: Pick<CaseEvent, "type" | "actor" | "at" | "summary">[],
  knownSampleIds: readonly string[],
): boolean {
  const parsed = events
    .filter((event) => event.type === "bill.parsed")
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .at(-1);
  if (parsed?.actor !== "system") return false;
  const sampleId = /^Loaded sample bill (SB-\d+) \(\d+ lines\)$/.exec(
    parsed.summary,
  )?.[1];
  return sampleId !== undefined && knownSampleIds.includes(sampleId);
}

export function buildCallVars(
  bill: Bill,
  flags: Flag[],
  syntheticSample = false,
): CallVars {
  const selected = [...flags]
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 3);
  const last4 = (bill.accountRefMasked ?? "").replace(/\D/g, "").slice(-4);
  // Only the server's sample provenance may enable this; never infer it from a hospital name.
  const patientName = syntheticSample ? "Alex Morgan" : "";
  const patientDob = syntheticSample ? "1990-04-12" : "";
  const context = [
    syntheticSample
      ? `Fictional role-play patient: ${patientName}. Date of birth: ${patientDob}. These are synthetic demo details, not the user's identity. Use them only for requested account lookup; hospital staff verify identity directly with the patient. Do not compare, challenge, or correct the patient's identity answers.`
      : "Patient name and date of birth are not provided. Ask the patient to answer directly; do not invent identity details.",
    ...selected.map((f, i) =>
      [
        `Item ${i + 1}: ${f.title}`,
        `Amount under review: ${formatMoney(f.amountCents)} (the flagged difference or amount at issue, not the original billed charge).`,
        `Evidence tier: ${f.tier}. ${f.explanation}`,
        ...bill.lines
          .filter((line) => f.lineIds.includes(line.id))
          .map(
            (line) =>
              `Service: ${line.description}. Date: ${line.serviceDate ?? "not provided"}. Code: ${line.code ? `${line.codeType ?? ""} ${line.code}`.trim() : "not provided"}. Units: ${line.units}. Billed charge: ${formatMoney(line.chargeCents)}.`,
          ),
        `Evidence (${f.evidence.kind}): ${f.evidence.detail}`,
        ...(f.evidence.quote ? [`Source quote: ${f.evidence.quote}`] : []),
        ...(f.evidence.sourceUrl ? [`Source: ${f.evidence.sourceUrl}`] : []),
        ...(f.evidence.capturedAt
          ? [`Captured: ${f.evidence.capturedAt}`]
          : []),
      ].join("\n"),
    ),
  ];
  return {
    hospital_name: bill.hospital.name,
    account_last4: last4.length === 4 ? last4 : "not available",
    disputed_items: selected
      .map((f) => `${f.title}, ${formatMoney(f.amountCents)}`)
      .join("; "),
    ask: ASK,
    review_topics: selected.map((f) => f.title).join("; "),
    case_context: context.join("\n\n"),
    patient_name: patientName,
    patient_dob: patientDob,
  };
}

export function renderCallScript(vars: CallVars): string {
  return [
    `${DISCLOSURE} This call may be recorded and transcribed. Is it okay to continue?`,
    `After permission: Let the representative locate account ending in ${vars.account_last4} at ${vars.hospital_name} and complete their identity and authorization checks directly with the patient. Permission to continue is not identity verification. Never compare or correct the patient's identity answers. Allow time for lookup, thinking, and replies without repeating questions or filling every pause. Once the patient and representative speak directly, stay silent until the patient specifically asks for help. Each patient request permits one answer, then return to silence; staff requests or silence do not resume advocacy. When invited to discuss billing, wait until the representative is ready, discuss one item at a time, and answer using the facts below. Amounts under review: ${vars.disputed_items}. ${vars.ask}`,
    `Approved facts for discussion:\n${vars.case_context}`,
    "If no: Thank you. I will stop participating now.",
    "The assistant may explain these approved facts in its own words. It will not agree to payments.",
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
export function transcriptText(
  transcript: CallTurn[],
  humanRole: "billing" | "participant" = "billing",
): string {
  return transcript
    .map((t) => `${t.role === "agent" ? "agent" : humanRole}: ${t.message}`)
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
