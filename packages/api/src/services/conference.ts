import { timingSafeEqual } from "node:crypto";

import {
  type Action,
  approvalRef,
  assertApproved,
  buildCallVars,
  buildConferenceIntroduction,
  type CaseEvent,
  CONFERENCE_FLOW_VERSION,
  CONFERENCE_STATUSES,
  type ConferenceStatus,
  canReportConferenceStatus,
  isAllowedNumber,
  isSyntheticSampleCase,
  type PatientConnection,
  patientConnectionForScript,
  renderConferenceScript,
  sha256Hex,
  validConferenceDestinations,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable, caseEvent } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { SAMPLES } from "../data";
import { listEvents } from "../repo/cases";
import { checkTransition, getAction, loadAuditedCase } from "./actions";
import {
  browserPatientSession,
  closeConference,
  dispatchConference,
  patientIsPresent,
} from "./livekit";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;
const SETUP_TIMEOUT_MS = 2 * 60_000;
const idFor = (actionId: string, event: string) => `voice:${actionId}:${event}`;
const roomFor = (actionId: string) => `bb-${actionId}`;
const statusType = (status: ConferenceStatus) =>
  `call.${status === "completed" || status === "failed" ? `conference_${status}` : status}`;
const statusSummary: Record<ConferenceStatus, string> = {
  ready: "Advocate connected",
  ringing: "Calling the billing test phone",
  patient_inviting: "Calling you",
  patient_joined: "Patient line connected; person not verified",
  patient_briefed: "Introduction playback finished",
  billing_connected: "Billing phone connected",
  ai_unavailable:
    "Advocate unavailable; the patient and billing line remain connected",
  patient_left: "You disconnected; ending the call",
  patient_failed: "Could not connect you",
  completed: "Conference finished",
  failed: "Conference ended before it could finish",
};

export function conferenceDestinations(
  billingNumber: string,
  connection: PatientConnection = "phone",
) {
  if (connection === "browser") {
    if (
      !/^\+[1-9]\d{7,14}$/.test(billingNumber) ||
      !isAllowedNumber(billingNumber, process.env.CALL_ALLOWLIST ?? "")
    )
      throw new ORPCError("FORBIDDEN", {
        message: "This demo only calls numbers on the test list.",
      });
    return { billingNumber, patientNumber: "" };
  }
  const patientNumber = process.env.CALL_PATIENT_NUMBER?.trim() ?? "";
  if (
    !validConferenceDestinations(
      billingNumber,
      patientNumber,
      process.env.CALL_ALLOWLIST ?? "",
    )
  ) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Set up two different consenting test phones before starting a patient connection call.",
    });
  }
  return { billingNumber, patientNumber };
}

function config() {
  if (process.env.BB_FAKE_PROVIDERS === "1") {
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Patient connection calls are disabled while fake providers are enabled.",
    });
  }
  const {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    LIVEKIT_PHOTON_TRUNK_ID: photonTrunkId,
    ELEVENLABS_AGENT_ID: agentId,
    ELEVENLABS_CONFERENCE_BRANCH_ID: branchId,
    BB_VOICE_WORKER_KEY,
  } = process.env;
  if (
    process.env.CALL_MODE !== "conference" ||
    !LIVEKIT_URL ||
    !LIVEKIT_API_KEY ||
    !LIVEKIT_API_SECRET ||
    !photonTrunkId ||
    !agentId ||
    !branchId ||
    !BB_VOICE_WORKER_KEY
  ) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Patient connection calls are not enabled yet.",
    });
  }
  return { photonTrunkId, agentId, branchId };
}

async function claim(
  db: Db,
  action: Action,
  key: string,
  type: string,
  summary: string,
  artifactRef: string,
): Promise<boolean> {
  const inserted = await db
    .insert(caseEvent)
    .values({
      id: idFor(action.id, key),
      caseId: action.caseId,
      actor: "system",
      type,
      summary,
      artifactRef,
    })
    .onConflictDoNothing()
    .returning({ id: caseEvent.id });
  return inserted.length === 1;
}

async function lock(db: Tx, actionId: string) {
  await db
    .select({ id: actionTable.id })
    .from(actionTable)
    .where(eq(actionTable.id, actionId))
    .for("update");
  return getAction(db, actionId);
}

function statuses(actionId: string, events: CaseEvent[]): ConferenceStatus[] {
  return CONFERENCE_STATUSES.filter((status) =>
    events.some((event) => event.id === idFor(actionId, status)),
  );
}

function startEvent(actionId: string, events: CaseEvent[]) {
  return events.find(
    (event) =>
      event.id === idFor(actionId, "start") && event.type === "call.started",
  );
}

export function conferenceProgress(actionId: string, events: CaseEvent[]) {
  const seen = statuses(actionId, events);
  const ready = events.find((event) => event.id === idFor(actionId, "ready"));
  const terminal = events.find(
    (event) =>
      event.id === idFor(actionId, "failed") ||
      event.id === idFor(actionId, "completed"),
  );
  return {
    started: Boolean(startEvent(actionId, events)),
    ended: seen.includes("failed") || seen.includes("completed"),
    failed: seen.includes("failed"),
    patientJoined: seen.includes("patient_joined"),
    billingConnected:
      seen.includes("billing_connected") ||
      (Boolean(ready) &&
        startEvent(actionId, events)?.summary ===
          `Conference requested (livekit:${roomFor(actionId)})`),
    endedAt: terminal?.at,
    reason:
      /\(reason:(patient_left|billing_left|timeout|error|finished)\)/.exec(
        terminal?.summary ?? "",
      )?.[1],
    status: seen.includes("failed")
      ? ("failed" as const)
      : seen.includes("completed")
        ? ("done" as const)
        : seen.includes("ready") || seen.includes("ai_unavailable")
          ? ("in_progress" as const)
          : ("ringing" as const),
    conversationId: /elevenlabs:([\w-]+)/.exec(ready?.summary ?? "")?.[1],
  };
}

async function validateApproval(db: Db, action: Action, events: CaseEvent[]) {
  if (action.kind !== "call" || action.outcome || !action.approvedAt)
    throw new ORPCError("FORBIDDEN", { message: "This call is not active." });
  const billing = (process.env.CALL_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  if (billing !== action.recipient)
    throw new ORPCError("FORBIDDEN", {
      message: "The call destination changed. Review the call again.",
    });
  const patientConnection = patientConnectionForScript(action.draft);
  const destinations = conferenceDestinations(
    action.recipient,
    patientConnection,
  );
  const audited = await loadAuditedCase(db, action.caseId);
  const vars = buildCallVars(
    audited.bill,
    audited.flags,
    isSyntheticSampleCase(
      events,
      SAMPLES.map((sample) => sample.id),
    ),
  );
  const hash = await sha256Hex(action.draft);
  try {
    assertApproved(events, action.id, hash);
  } catch {
    throw new ORPCError("FORBIDDEN", {
      message: "Please approve this exact call first.",
    });
  }
  if (
    renderConferenceScript(
      vars,
      destinations.billingNumber,
      destinations.patientNumber,
      patientConnection,
    ) !== action.draft
  ) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "The call script or patient destination changed. Review the call again.",
    });
  }
  return {
    ...destinations,
    patientConnection,
    vars,
    hash,
    caseStatus: audited.status,
  };
}

export async function startConferenceCall(
  db: Database,
  actionId: string,
): Promise<{
  callId: string;
  status: string;
  browserSession?: { serverUrl: string; token: string };
}> {
  const roomName = roomFor(actionId);
  let browserSession: { serverUrl: string; token: string } | undefined;
  const shouldDispatch = await db.transaction(async (tx) => {
    const action = await lock(tx, actionId);
    const events = await listEvents(tx, action.caseId);
    if (startEvent(action.id, events)) return false;
    config();
    const approved = await validateApproval(tx, action, events);
    checkTransition(
      approved.caseStatus,
      "call.started",
      "This call is not ready to start.",
    );
    // Different actions share the same call budget, so count and claim together.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('betterbill:conference'), 1)`,
    );
    const recent = await tx
      .select({ id: caseEvent.id })
      .from(caseEvent)
      .where(
        and(
          eq(caseEvent.type, "call.started"),
          gt(caseEvent.at, new Date(Date.now() - 10 * 60_000)),
        ),
      );
    if (recent.length >= 3)
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Too many calls in the last few minutes. Try again soon.",
      });
    return claim(
      tx,
      action,
      "start",
      "call.started",
      `Conference requested (${CONFERENCE_FLOW_VERSION}; livekit:${roomName})`,
      approvalRef(action.id, approved.hash),
    );
  });
  if (shouldDispatch) {
    try {
      const { dispatchId } = await dispatchConference({ actionId, roomName });
      const action = await getAction(db, actionId);
      // Issue credentials only to the winning start request, never to later polls/retries.
      if (patientConnectionForScript(action.draft) === "browser")
        browserSession = await browserPatientSession(roomName);
      await claim(
        db,
        action,
        "dispatch",
        "call.dispatching",
        `Call controller requested (livekit:${dispatchId})`,
        approvalRef(action.id, await sha256Hex(action.draft)),
      );
    } catch {
      await Promise.allSettled([
        reportStatus(
          db,
          {
            event: "status",
            actionId,
            roomName,
            flowVersion: CONFERENCE_FLOW_VERSION,
            status: "failed",
            reason: "error",
          },
          true,
        ),
        closeConference(roomName),
      ]);
      throw new ORPCError("BAD_GATEWAY", {
        message:
          "The call controller could not start. Review a new call before trying again.",
      });
    }
  }
  const action = await getAction(db, actionId);
  const progress = conferenceProgress(
    actionId,
    await listEvents(db, action.caseId),
  );
  return {
    callId: `call-${actionId}`,
    status: progress.status,
    ...(browserSession ? { browserSession } : {}),
  };
}

const binding = {
  flowVersion: z.literal(CONFERENCE_FLOW_VERSION),
  actionId: z.string().regex(/^[\w-]{1,128}$/),
  roomName: z.string().min(1).max(160),
};
const VoiceEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("bootstrap"), ...binding }).strict(),
  z
    .object({
      event: z.literal("dial"),
      ...binding,
      leg: z.enum(["patient", "billing"]),
    })
    .strict(),
  z
    .object({
      event: z.literal("status"),
      ...binding,
      status: z.enum(CONFERENCE_STATUSES),
      reason: z
        .enum(["patient_left", "billing_left", "timeout", "error", "finished"])
        .optional(),
      conversationId: z
        .string()
        .regex(/^[\w-]{1,200}$/)
        .optional(),
    })
    .strict(),
]);
type VoiceEvent = z.infer<typeof VoiceEventSchema>;
type StatusEvent = Extract<VoiceEvent, { event: "status" }>;

function assertBinding(
  action: Action,
  input: VoiceEvent,
  events: CaseEvent[],
  internal = false,
) {
  const started = startEvent(action.id, events);
  if (
    !started ||
    input.roomName !== roomFor(action.id) ||
    (started.summary !==
      `Conference requested (${CONFERENCE_FLOW_VERSION}; livekit:${input.roomName})` &&
      !(
        internal &&
        started.summary === `Conference requested (livekit:${input.roomName})`
      ))
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "The call room does not match its approved session.",
    });
  }
  return started;
}

async function reportStatus(
  db: Database,
  input: StatusEvent,
  internal = false,
) {
  if ((input.status === "ready") !== Boolean(input.conversationId))
    throw new ORPCError("BAD_REQUEST", {
      message: "Only ready requires a conversation ID.",
    });
  if (input.reason && !["completed", "failed"].includes(input.status))
    throw new ORPCError("BAD_REQUEST", {
      message: "Only terminal updates have an end reason.",
    });
  await db.transaction(async (tx) => {
    const action = await lock(tx, input.actionId);
    const events = await listEvents(tx, action.caseId);
    const started = assertBinding(action, input, events, internal);
    const existing = events.find(
      (event) => event.id === idFor(action.id, input.status),
    );
    if (existing) {
      if (
        input.conversationId &&
        !existing.summary.endsWith(`(elevenlabs:${input.conversationId})`)
      )
        throw new ORPCError("CONFLICT", {
          message: "The conversation ID is already bound.",
        });
      return;
    }
    if (
      !internal &&
      !events.some((event) => event.id === idFor(action.id, "bootstrap"))
    )
      throw new ORPCError("FORBIDDEN", {
        message: "The call controller has not started.",
      });
    if (
      !canReportConferenceStatus(statuses(action.id, events), input.status) ||
      (["patient_inviting", "ringing"].includes(input.status) && !internal)
    ) {
      throw new ORPCError("CONFLICT", {
        message: "This call update is out of order.",
      });
    }
    await claim(
      tx,
      action,
      input.status,
      statusType(input.status),
      `${statusSummary[input.status]}${input.conversationId ? ` (elevenlabs:${input.conversationId})` : ""}${input.reason ? ` (reason:${input.reason})` : ""}`,
      started.artifactRef ?? "",
    );
  });
  return { ok: true as const };
}

export async function processVoiceEvent(db: Database, raw: unknown) {
  const input = VoiceEventSchema.parse(raw);
  if (input.event === "status") return reportStatus(db, input);
  return db.transaction(async (tx) => {
    const action = await lock(tx, input.actionId);
    const events = await listEvents(tx, action.caseId);
    const started = assertBinding(action, input, events);
    const seen = statuses(action.id, events);
    if (
      seen.includes("completed") ||
      seen.includes("failed") ||
      (!seen.includes("patient_joined") &&
        Date.now() - Date.parse(started.at) > SETUP_TIMEOUT_MS)
    )
      throw new ORPCError("FORBIDDEN", {
        message: "This call session has ended.",
      });
    const provider = config();
    const approved = await validateApproval(tx, action, events);
    if (started.artifactRef !== approvalRef(action.id, approved.hash))
      throw new ORPCError("FORBIDDEN", {
        message: "The call approval changed.",
      });
    if (input.event === "bootstrap") {
      const first = await claim(
        tx,
        action,
        "bootstrap",
        "call.worker_started",
        "Call controller connected",
        started.artifactRef,
      );
      if (!first)
        throw new ORPCError("CONFLICT", {
          message: "A controller already claimed this call. Do not redial.",
        });
      if (approved.patientConnection === "browser")
        await claim(
          tx,
          action,
          "patient_inviting",
          statusType("patient_inviting"),
          "Waiting for your browser microphone",
          started.artifactRef,
        );
      return {
        actionId: action.id,
        roomName: input.roomName,
        flowVersion: CONFERENCE_FLOW_VERSION,
        patientConnection: approved.patientConnection,
        vars: approved.vars,
        introductionText: buildConferenceIntroduction(approved.vars),
        ...provider,
      };
    }
    if (!events.some((event) => event.id === idFor(action.id, "bootstrap")))
      throw new ORPCError("FORBIDDEN", {
        message: "The call controller has not started.",
      });
    if (input.leg === "patient" && approved.patientConnection === "browser")
      return { allowed: false as const };
    const dialStatus = input.leg === "patient" ? "patient_inviting" : "ringing";
    if (!canReportConferenceStatus(seen, dialStatus))
      return { allowed: false as const };
    if (input.leg === "billing") {
      let present: boolean;
      try {
        present = await patientIsPresent(input.roomName);
      } catch {
        throw new ORPCError("BAD_GATEWAY", {
          message: "Could not verify the patient connection.",
        });
      }
      if (!present) return { allowed: false as const };
    }
    const first = await claim(
      tx,
      action,
      dialStatus,
      statusType(dialStatus),
      statusSummary[dialStatus],
      started.artifactRef,
    );
    return first
      ? {
          allowed: true as const,
          phoneNumber:
            input.leg === "patient"
              ? approved.patientNumber
              : approved.billingNumber,
        }
      : { allowed: false as const };
  });
}

export async function handleVoiceRequest(
  db: Database,
  request: Request,
): Promise<Response> {
  const expected = process.env.BB_VOICE_WORKER_KEY;
  const given = request.headers.get("x-bb-voice-key");
  if (
    !expected ||
    !given ||
    Buffer.byteLength(expected) !== Buffer.byteLength(given) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(given))
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 4096)
      return Response.json({ error: "Request too large" }, { status: 413 });
    return Response.json(await processVoiceEvent(db, JSON.parse(text)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status =
      error instanceof ORPCError
        ? error.status
        : error instanceof z.ZodError || error instanceof SyntaxError
          ? 400
          : 500;
    return Response.json(
      {
        error:
          status === 500
            ? "Call update failed"
            : error instanceof Error
              ? error.message
              : "Invalid request",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function expireConference(
  db: Database,
  action: Action,
  events: CaseEvent[],
): Promise<boolean> {
  const started = startEvent(action.id, events);
  if (
    !started ||
    conferenceProgress(action.id, events).ended ||
    conferenceProgress(action.id, events).patientJoined ||
    Date.now() - Date.parse(started.at) <= SETUP_TIMEOUT_MS
  )
    return false;
  await reportStatus(
    db,
    {
      event: "status",
      flowVersion: CONFERENCE_FLOW_VERSION,
      reason: "timeout",
      actionId: action.id,
      roomName: roomFor(action.id),
      status: "failed",
    },
    true,
  );
  await closeConference(roomFor(action.id));
  return true;
}
