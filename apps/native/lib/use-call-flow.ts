import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

// One stage drives every call screen (L7a to L7e, A2, A3).
export type CallStage =
  | "on_hold" // L7a: the advocate is calling and waiting for a person
  | "incoming" // A2: a rep answered; we ring the patient to join
  | "joined" // L7b/L7c: the patient is on the line
  | "done" // L7d: call over, email going out
  | "waiting" // L7e: waiting on billing
  | "missed" // A3: the patient could not join
  | "failed";

// The phone backend does not bring the patient onto the call yet, so the
// join stages only exist in the scripted sample call. Set to false to show
// live call states only. A scripted call places no call and writes nothing.
export const DEMO_CALL_SCRIPT = true;

const SCRIPT: { stage: CallStage; ms: number }[] = [
  { stage: "on_hold", ms: 4000 },
  { stage: "incoming", ms: 0 }, // waits for Join or Not now
  { stage: "joined", ms: 7000 },
  { stage: "done", ms: 3500 },
  { stage: "waiting", ms: 0 },
];

// Live: map call.status (not_started, ringing, in_progress, done, failed).
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
    detail: detail.data,
    transcript: status.data?.transcript ?? null,
    outcome: status.data?.outcome ?? null,
    // Scripted only: the patient answers or declines the incoming call.
    join: () => setStep(SCRIPT.findIndex((s) => s.stage === "joined")),
    decline: () => setMissed(true),
    retry: () => {
      setMissed(false);
      setStep(0);
    },
  };
}
