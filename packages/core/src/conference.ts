import {
  type CallOutcome,
  type CallVars,
  DISCLOSURE,
  isDialableNumber,
} from "./call";

const LEGACY_APPROVAL_MARKER = "Patient connection approval:";
export const CONFERENCE_FLOW_VERSION = "patient-first-v1";
const APPROVAL_MARKER = "Your call with the advocate:";
const BROWSER_MARKER = `${APPROVAL_MARKER} Join in your browser`;
export type PatientConnection = "phone" | "browser";

export function patientConnectionForScript(script: string): PatientConnection {
  return script.startsWith(BROWSER_MARKER) ? "browser" : "phone";
}
// The agent's first message to billing. The live agent config uses this same
// text, so the approved script and the spoken opening match.
export const CONFERENCE_OPENING = `${DISCLOSURE} The patient is here with us and can answer you directly. This call may be recorded and transcribed. Is it okay to continue?`;

// Said to the patient once, when billing needs to verify them. Then the
// advocate goes quiet.
export const PATIENT_CUE = "They need to verify you. Go ahead.";

export function buildConferenceIntroduction(vars: CallVars): string {
  return [
    "This is BetterBill's automated advocate.",
    ...(vars.patient_name
      ? [`For this demo, you're ${vars.patient_name}.`]
      : []),
    `I'll call ${vars.hospital_name} billing and ask for three things.`,
    "A hold on your account while you review it.",
    "Your itemized bill by email.",
    `And how to get your medical records for ${vars.review_topics || "this visit"}.`,
    "They'll need to verify you. When they ask, answer them yourself.",
    "After that I stay quiet. If you want me to speak, say 'Advocate, can you help?' I'll answer once, then listen again.",
    "This call may be recorded and transcribed. Hanging up ends everyone's call. Connecting billing now.",
  ].join(" ");
}

export function renderConferenceScript(
  vars: CallVars,
  billingNumber: string,
  patientNumber: string,
  patientConnection: PatientConnection = "phone",
): string {
  return [
    patientConnection === "browser"
      ? `${BROWSER_MARKER} with your microphone and speakers first. After the introduction finishes, automatically call the consenting billing test participant at ${billingNumber}. Both participants have agreed to this test.`
      : `${APPROVAL_MARKER} Call the consenting patient test participant at ${patientNumber} first. After the introduction finishes, automatically call the consenting billing test participant at ${billingNumber}. Both participants have agreed to this test.`,
    `The patient hears first: "${buildConferenceIntroduction(vars)}"`,
    patientConnection === "browser"
      ? "Keep this browser tab open. Your microphone connects you to the advocate and billing. Leaving or closing the tab ends the call for everyone. A connection does not verify identity or approval."
      : "The patient's phone remains connected while billing answers. A phone connection does not verify that a human answered.",
    `The advocate tells billing:\n${CONFERENCE_OPENING}`,
    `After permission: I'm calling about account ending in ${vars.account_last4} at ${vars.hospital_name}. ${vars.ask}`,
    `When billing needs to verify the patient, the advocate says once: "${PATIENT_CUE}" Then it stays silent. After that it speaks only when the patient asks, for example 'Advocate, can you help?' Each request permits one answer, then the advocate returns to silence. Staff requests, identity answers, silence, or a finished verification do not resume it. The advocate does not argue charges, challenge the patient's identity answers, infer approval, or agree to payments or settlements. If either person hangs up, the entire call ends.`,
    `Approved facts, only if the patient asks:\n${vars.case_context}`,
  ].join("\n\n");
}

export function isPatientFirstConferenceScript(script: string): boolean {
  return script.includes(APPROVAL_MARKER);
}

export function isConferenceScript(script: string): boolean {
  return (
    isPatientFirstConferenceScript(script) ||
    script.includes(LEGACY_APPROVAL_MARKER)
  );
}

export function withConferenceParticipation(
  outcome: CallOutcome,
  patientJoined: boolean,
): CallOutcome {
  return {
    ...outcome,
    summary: `${outcome.summary} ${patientJoined ? "The patient line connected. This does not confirm a person answered and does not establish approval or verify who spoke." : "No patient connection was recorded."}`,
    // Mixed phone audio cannot identify which person gave this response.
    billingResponse: patientJoined ? null : outcome.billingResponse,
  };
}

export function validConferenceDestinations(
  billing: string,
  patient: string,
  allowlist: string,
  allowUserNumbers = false,
): boolean {
  return (
    billing !== patient &&
    /^\+[1-9]\d{7,14}$/.test(billing) &&
    /^\+[1-9]\d{7,14}$/.test(patient) &&
    isDialableNumber(billing, allowlist, allowUserNumbers) &&
    isDialableNumber(patient, allowlist, allowUserNumbers)
  );
}

export const CONFERENCE_STATUSES = [
  "ready",
  "ringing",
  "patient_inviting",
  "patient_joined",
  "patient_briefed",
  "billing_connected",
  "ai_unavailable",
  "patient_left",
  "patient_failed",
  "completed",
  "failed",
] as const;
export type ConferenceStatus = (typeof CONFERENCE_STATUSES)[number];

export function canReportConferenceStatus(
  seen: ConferenceStatus[],
  next: ConferenceStatus,
): boolean {
  if (seen.includes("completed") || seen.includes("failed")) return false;
  if (seen.includes(next)) return false;
  if (next === "failed") return true;
  if (seen.includes("patient_left") || seen.includes("patient_failed"))
    return false;
  switch (next) {
    case "patient_inviting":
      return seen.length === 0;
    case "patient_joined":
      return seen.includes("patient_inviting");
    case "patient_briefed":
      return seen.includes("patient_joined");
    case "ringing":
      return seen.includes("patient_briefed");
    case "billing_connected":
      return seen.includes("ringing");
    case "ready":
      return seen.includes("billing_connected");
    case "ai_unavailable":
      return seen.includes("billing_connected");
    case "patient_left":
      return seen.includes("patient_joined");
    case "patient_failed":
      return (
        seen.includes("patient_inviting") && !seen.includes("patient_joined")
      );
    case "completed":
      return seen.includes("ready") || seen.includes("ai_unavailable");
  }
}
