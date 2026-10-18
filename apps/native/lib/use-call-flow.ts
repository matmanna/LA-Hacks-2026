import { CallOutcomeSchema, isConferenceScript } from "@betterbill/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

// One stage drives every call screen (L7a to L7e, A2, A3).
export type CallStage =
  | "on_hold" // L7a: sample: on hold. Live: dialing (conference: patient, then billing)
  | "incoming" // A2: a rep answered; we ring the patient to join
  | "joined" // L7b/L7c: the patient is on the line
  | "done" // L7d: call over, email going out
  | "waiting" // L7e: waiting on billing
  | "missed" // A3: the patient could not join
  | "failed";

// Hold-and-join (on hold, then ring the patient when a rep answers) only
// exists in the scripted sample call. Samples must exercise the real dial
// path in production; otherwise the UI advances through status copy without
// ever issuing call.start. Live calls dial billing alone unless the server is
// configured for CALL_MODE=conference.
export const DEMO_CALL_SCRIPT = false;

const SCRIPT: { stage: CallStage; ms: number }[] = [
  { stage: "on_hold", ms: 4000 },
  { stage: "incoming", ms: 0 }, // waits for Join or Not now
  { stage: "joined", ms: 7000 },
  { stage: "done", ms: 3500 },
  { stage: "waiting", ms: 0 },
];

// Live: map call.status (not_started, ringing, in_progress, done, failed).
// Conference calls report the same set: the server folds patient_inviting
// through billing_connected into "ringing", and ready or ai_unavailable into
// "in_progress" (conferenceProgress), so a live conference reaches "joined".
function liveStage(status: string | undefined, emailSent: boolean): CallStage {
  if (status === "failed" || status === "no_consent") return "failed";
  if (status === "done") return emailSent ? "waiting" : "done";
  if (status === "in_progress") return "joined";
  return "on_hold";
}

export function useCallFlow(caseId: string, scripted: boolean) {
  const detail = useQuery({
    ...orpc.case.get.queryOptions({ input: { caseId } }),
    refetchInterval: scripted ? false : 4000,
  });
  const actions = detail.data?.actions ?? [];
  const call = actions.find((a) => a.kind === "call");
  const email = actions.find(
    (a) => a.kind === "letter" || a.kind === "itemized_request",
  );
  const status = useQuery({
    ...orpc.call.status.queryOptions({
      input: { callId: `call-${call?.id ?? ""}` },
    }),
    enabled: !scripted && Boolean(call),
    refetchInterval: 3000,
  });

  const [step, setStep] = useState(0);
  const [missed, setMissed] = useState(false);
  useEffect(() => {
    if (!scripted || missed) return;
    const ms = SCRIPT[step]?.ms ?? 0;
    if (!ms) return;
    const t = setTimeout(() => setStep((s) => s + 1), ms);
    return () => clearTimeout(t);
  }, [scripted, step, missed]);

  const stage: CallStage = scripted
    ? missed
      ? "missed"
      : (SCRIPT[step]?.stage ?? "waiting")
    : liveStage(status.data?.status, Boolean(email?.sentAt));

  return {
    stage,
    // The approved script says whether the patient is called first.
    conference: !scripted && Boolean(call && isConferenceScript(call.draft)),
    detail: detail.data,
    outcome: status.data?.outcome
      ? CallOutcomeSchema.parse(JSON.parse(status.data.outcome))
      : null,
    // Scripted only: the patient answers or declines the incoming call.
    join: () => setStep(SCRIPT.findIndex((s) => s.stage === "joined")),
    decline: () => setMissed(true),
    retry: () => {
      setMissed(false);
      setStep(0);
    },
  };
}
