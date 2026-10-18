// Outbound call to the billing office (tickets A-08, A-09). Pure: builds the
// exact script the user approves and shapes the call's outcome.
import { z } from "zod";

import { formatMoney } from "./money";
import type { Bill, CaseEvent, Flag } from "./schemas";

export const DISCLOSURE =
  "Hi, this is an automated assistant calling on behalf of a patient.";

// Every available fact is included in the approval; identity is fictional demo data only.
// Key names are the agent's dynamic variables, so they stay as they are.
export type CallVars = {
  hospital_name: string;
  account_last4: string;
  disputed_items: string; // the services whose records the patient wants
  ask: string;
  review_topics: string;
  case_context: string;
  patient_name: string;
  patient_dob: string;
};

// The call asks only for what billing can do now. Disputes go in the letter,
// which carries the evidence.
export const HOLD_ASK =
  "Please put the account on hold while the patient reviews it, with no collections or late fees.";
export const ITEMIZED_ASK =
  "Please email the itemized bill, with billing codes, to the patient.";

// "2026-09-14" -> "September 14, 2026", so the agent says a date, not digits.
function spokenDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// These flags are about the whole bill, so there is no one line to name.
const WHOLE_BILL: Flag["lever"][] = ["eob_mismatch", "missing_itemization"];

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
  // Billing finds a service by its printed name and date.
  const services = [
    ...new Set(
      selected.flatMap((f) => {
        const line = WHOLE_BILL.includes(f.lever)
          ? undefined
          : bill.lines.find((l) => l.id === f.lineIds[0]);
        if (!line) return [];
        return line.serviceDate
          ? `${line.description} on ${spokenDate(line.serviceDate)}`
          : line.description;
      }),
    ),
  ].join("; ");
  const last4 = (bill.accountRefMasked ?? "").replace(/\D/g, "").slice(-4);
  // Only the server's sample provenance may enable this; never infer it from a hospital name.
  const patientName = syntheticSample ? "Alex Morgan" : "";
  const patientDob = syntheticSample ? "1990-04-12" : "";
  const context = [
    "Why the patient wants these records. Use only when the patient asks you to explain; do not argue charges with billing.",
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
    disputed_items: services,
    ask: [
      HOLD_ASK,
      ITEMIZED_ASK,
      `Please tell us how the patient can get the medical records for ${services || "this visit"}.`,
      "May I have a reference number for this call?",
    ].join(" "),
    review_topics: services,
    case_context: context.join("\n\n"),
    patient_name: patientName,
    patient_dob: patientDob,
  };
}

// Direct call: billing only, no patient on the line. Billing won't release
// anything without the patient, so the agent asks how the patient can get it.
export function renderCallScript(vars: CallVars): string {
  return [
    `${DISCLOSURE} This call may be recorded and transcribed. Is it okay to continue?`,
    `If yes: I'm calling about account ending in ${vars.account_last4} at ${vars.hospital_name}. The patient is not on this call. ${vars.ask}`,
    "If they need the patient to verify or approve anything: ask what the patient should do to get each of these, and share nothing else.",
    `Approved facts, only if asked:\n${vars.case_context}`,
    "If no: Thank you. I will end the call now.",
    "The assistant will not agree to payments.",
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
  // What billing agreed to on the call. Null when they didn't say; defaults
  // keep outcomes saved before these fields existed valid.
  holdAgreed: z.boolean().nullable().default(null),
  itemizedPromised: z.boolean().nullable().default(null),
  recordsProcess: z.string().nullable().default(null),
  durationSecs: z.number().nullable(),
  transcript: z.array(CallTurnSchema),
  recorded: z.boolean(),
  source: z.enum(["live", "recorded_fallback"]),
  recordedAt: z.string().optional(),
});
export type CallOutcome = z.infer<typeof CallOutcomeSchema>;

// Plain words for a yes/no billing gave on the call; nothing when they didn't say.
export function agreedText(
  value: boolean | null | undefined,
  yes: string,
): string | undefined {
  return value === true ? yes : value === false ? "Billing said no" : undefined;
}

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
