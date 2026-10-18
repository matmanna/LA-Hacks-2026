// Outbound call to the billing office (tickets A-08, A-09, A-11). Nothing is
// said on a call without an approval, with consent, of the exact script.
import {
  type Action,
  approvalRef,
  assertApproved,
  buildCallVars,
  type CallOutcome,
  CallOutcomeSchema,
  type CallState,
  isAllowedNumber,
  isConferenceScript,
  isPatientFirstConferenceScript,
  isSyntheticSampleCase,
  mapConversationStatus,
  type PatientConnection,
  renderCallScript,
  renderConferenceScript,
  sha256Hex,
  transcriptText,
  withConferenceParticipation,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable, caseEvent } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, isNull, notLike } from "drizzle-orm";
import { SAMPLES } from "../data";
import { RECORDED_CALL } from "../recorded-call";
import { addEvent, getCaseRow, listEvents, setStatus } from "../repo/cases";
import {
  checkTransition,
  getAction,
  loadAuditedCase,
  saveDraft,
} from "./actions";
import { buildOutcome } from "./call-outcome";
import {
  conferenceDestinations,
  conferenceProgress,
  expireConference,
  startConferenceCall,
} from "./conference";
import { getConversation, startOutboundCall } from "./elevenlabs";

const MAX_CALLS_PER_10_MIN = 3;
const NO_ANSWER_MS = 90_000;

type CallStatusResult = {
  status: CallState;
  transcript: string | null;
  outcome: string | null;
};

const startedFor =
  (actionId: string) => (e: { type: string; artifactRef?: string }) =>
    e.type === "call.started" &&
    (e.artifactRef?.startsWith(`action:${actionId}#`) ?? false);

// The first number on CALL_ALLOWLIST is the "billing office" test phone.
function billingTestPhone(): string | null {
  return (
    (process.env.CALL_ALLOWLIST ?? "")
      .split(",")
      .map((n) => n.trim())
      .find(Boolean) ?? null
  );
}

export async function draftCall(
  db: Database,
  input: { caseId: string; patientConnection?: PatientConnection },
): Promise<{
  action: Action;
  draftHash: string;
  claims: never[];
  usedFallback: boolean;
}> {
  const audited = await loadAuditedCase(db, input.caseId);
  if (
    input.patientConnection === "browser" &&
    process.env.CALL_MODE !== "conference"
  )
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Browser calls require the advocate conference service.",
    });
  if (audited.flags.length === 0) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Nothing on this bill needs a call.",
    });
  }
  const to = billingTestPhone();
  if (!to) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Calls are not set up yet.",
    });
  }
  const status = checkTransition(
    audited.status,
    "action.drafted",
    "This case is not ready for a call yet.",
  );
  const vars = buildCallVars(
    audited.bill,
    audited.flags,
    isSyntheticSampleCase(
      await listEvents(db, input.caseId),
      SAMPLES.map((sample) => sample.id),
    ),
  );
  const { action, draftHash } = await saveDraft(db, {
    caseId: input.caseId,
    kind: "call",
    draft:
      process.env.CALL_MODE === "conference"
        ? renderConferenceScript(
            vars,
            to,
            conferenceDestinations(to, input.patientConnection).patientNumber,
            input.patientConnection,
          )
        : renderCallScript(vars),
    recipient: to,
    status,
    summary: "Call script ready for you",
  });
  return { action, draftHash, claims: [], usedFallback: false };
}

export async function startCall(
  db: Database,
  input: { actionId: string },
  start: typeof startOutboundCall = startOutboundCall,
): Promise<{
  callId: string;
  status: string;
  browserSession?: { serverUrl: string; token: string };
}> {
  const action = await getAction(db, input.actionId);
  if (action.kind !== "call") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Use action.send for letters.",
    });
  }
  if (isConferenceScript(action.draft))
    return startConferenceCall(db, action.id);
  if (process.env.CALL_MODE === "conference") {
    throw new ORPCError("FORBIDDEN", {
      message: "Review a new call script to approve the patient connection.",
    });
  }
  const callId = `call-${action.id}`;
  const events = await listEvents(db, action.caseId);
  if (events.some(startedFor(action.id))) return { callId, status: "started" };

  const hash = await sha256Hex(action.draft);
  try {
    assertApproved(events, action.id, hash);
  } catch {
    throw new ORPCError("FORBIDDEN", {
      message: "Please approve the call first.",
    });
  }
  if (!isAllowedNumber(action.recipient, process.env.CALL_ALLOWLIST ?? "")) {
    throw new ORPCError("FORBIDDEN", {
      message: "This demo only calls numbers on the test list.",
    });
  }
  // The agent speaks from variables, so rebuild them and make sure they still
  // produce the exact script the user approved.
  const audited = await loadAuditedCase(db, action.caseId);
  const vars = buildCallVars(
    audited.bill,
    audited.flags,
    isSyntheticSampleCase(
      events,
      SAMPLES.map((sample) => sample.id),
    ),
  );
  if (renderCallScript(vars) !== action.draft) {
    throw new ORPCError("FORBIDDEN", {
      message: "This call script changed. Please review it again.",
    });
  }
  const recent = await db
    .select({ id: caseEvent.id })
    .from(caseEvent)
    .where(
      and(
        eq(caseEvent.type, "call.started"),
        gt(caseEvent.at, new Date(Date.now() - 10 * 60_000)),
        // Fake test calls never ring a phone, so they don't count.
        notLike(caseEvent.summary, "%elevenlabs:fake_%"),
      ),
    );
  if (recent.length >= MAX_CALLS_PER_10_MIN) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Too many calls in the last few minutes. Try again soon.",
    });
  }
  const status = checkTransition(
    audited.status,
    "call.started",
    "This call is not ready to start.",
  );

  let conversationId: string;
  try {
    ({ conversationId } = await start({ to: action.recipient, vars }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    await addEvent(
      db,
      action.caseId,
      "call.failed",
      `Call could not start: ${reason.slice(0, 120)}`,
    );
    throw new ORPCError("BAD_GATEWAY", {
      message: "We could not place the call. Nothing was said. Try again.",
    });
  }
  await db.transaction(async (tx) => {
    await setStatus(tx, action.caseId, status);
    await addEvent(
      tx,
      action.caseId,
      "call.started",
      `Call started (elevenlabs:${conversationId})`,
      { artifactRef: approvalRef(action.id, hash) },
    );
  });
  return { callId, status: "ringing" };
}

function present(outcome: CallOutcome, conference = false): CallStatusResult {
  return {
    status: outcome.status,
    transcript: transcriptText(
      outcome.transcript,
      conference ? "participant" : "billing",
    ),
    outcome: JSON.stringify(outcome),
  };
}

// Saves the outcome once; later polls find it already stored. The status only
// moves to "called" when the state machine allows it (a letter sent during
// the call leaves the case at "sent"), but the result is never dropped.
async function saveOutcome(
  db: Database,
  action: Action,
  outcome: CallOutcome,
  summary: string,
) {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(actionTable)
      .set({ outcome: JSON.stringify(outcome) })
      .where(and(eq(actionTable.id, action.id), isNull(actionTable.outcome)))
      .returning({ id: actionTable.id });
    if (updated.length === 0) return;
    const row = await getCaseRow(tx, action.caseId);
    try {
      const status = checkTransition(row?.status ?? "", "call.completed", "");
      await setStatus(tx, action.caseId, status);
    } catch {
      // see comment above
    }
    await addEvent(tx, action.caseId, "call.completed", summary);
  });
}

export async function callStatus(
  db: Database,
  input: { callId: string },
  fetchConversation: typeof getConversation = getConversation,
): Promise<CallStatusResult> {
  const action = await getAction(db, input.callId.replace(/^call-/, ""));
  const conference = isConferenceScript(action.draft);
  if (action.outcome) {
    return present(
      CallOutcomeSchema.parse(JSON.parse(action.outcome)),
      conference,
    );
  }
  let events = await listEvents(db, action.caseId);
  const started = events.filter(startedFor(action.id)).at(-1);
  if (!started)
    return { status: "not_started", transcript: null, outcome: null };

  if (conference) {
    if (await expireConference(db, action, events))
      events = await listEvents(db, action.caseId);
    const progress = conferenceProgress(action.id, events);
    if (!progress.ended)
      return { status: progress.status, transcript: null, outcome: null };
    let conversation: Awaited<ReturnType<typeof getConversation>> | null = null;
    if (progress.conversationId) {
      try {
        const result = await fetchConversation(progress.conversationId);
        if (["done", "failed"].includes(result.status)) conversation = result;
      } catch {
        // Provider analysis can lag the phone hangup; polling has a fixed deadline.
      }
      if (
        !conversation &&
        Date.now() - Date.parse(progress.endedAt ?? started.at) < 60_000
      )
        return { status: "in_progress", transcript: null, outcome: null };
    }
    const outcome = withConferenceParticipation(
      conversation
        ? buildOutcome(conversation)
        : {
            status: progress.failed ? "failed" : "done",
            summary: progress.billingConnected
              ? `${progress.failed ? "The call ended early" : "The call ended"} after the billing phone connected. The conversation transcript is unavailable.`
              : "The billing phone did not connect. No hospital conversation was recorded.",
            referenceNumber: null,
            billingResponse: null,
            nextStep: null,
            followUpDate: null,
            durationSecs: null,
            transcript: [],
            recorded: false,
            source: "live",
          },
      progress.patientJoined,
    );
    if (progress.failed || conversation?.status === "failed")
      outcome.status = "failed";
    // A mixed first reply cannot establish which human refused consent.
    else if (isPatientFirstConferenceScript(action.draft))
      outcome.status = "done";
    await saveOutcome(
      db,
      action,
      outcome,
      progress.failed
        ? "Call ended early; result saved."
        : "Call ended; result saved.",
    );
    return present(outcome, true);
  }

  const conversationId = /elevenlabs:([\w-]+)/.exec(started.summary)?.[1];
  let state: CallState = "failed";
  let conversation: Awaited<ReturnType<typeof getConversation>> | null = null;
  if (conversationId) {
    try {
      conversation = await fetchConversation(conversationId);
      state = mapConversationStatus(conversation.status);
    } catch {
      // A failed status check is not a failed call; keep polling.
      return { status: "in_progress", transcript: null, outcome: null };
    }
  }

  if (state === "done" && conversation) {
    const outcome = buildOutcome(conversation);
    await saveOutcome(
      db,
      action,
      outcome,
      `Call finished. Reference: ${outcome.referenceNumber ?? "not given"}`,
    );
    return present(outcome);
  }

  const noAnswer =
    state === "ringing" && Date.now() - Date.parse(started.at) > NO_ANSWER_MS;
  if (
    (state === "failed" || noAnswer) &&
    process.env.DEMO_CALL_FALLBACK === "1" &&
    RECORDED_CALL
  ) {
    const outcome: CallOutcome = {
      ...RECORDED_CALL,
      source: "recorded_fallback",
    };
    await saveOutcome(
      db,
      action,
      outcome,
      "Showing a recorded rehearsal call (live call failed)",
    );
    return present(outcome);
  }
  if (state === "failed") {
    const alreadyLogged = events.some(
      (e) => e.type === "call.failed" && e.at >= started.at,
    );
    if (!alreadyLogged) {
      await addEvent(db, action.caseId, "call.failed", "Call did not connect.");
    }
  }
  return { status: state, transcript: null, outcome: null };
}
