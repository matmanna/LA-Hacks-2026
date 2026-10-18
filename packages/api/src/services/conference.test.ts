import {
  type Action,
  approvalRef,
  type Bill,
  buildCallVars,
  type CaseEvent,
  type Flag,
  renderConferenceScript,
  sha256Hex,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  events: [] as CaseEvent[],
  action: {} as Action,
  bill: {} as Bill,
  flags: [] as Flag[],
  dispatch: vi.fn(),
  close: vi.fn(),
  present: vi.fn(),
  browser: vi.fn(),
}));
vi.mock("./actions", () => ({
  getAction: async () => fixture.action,
  loadAuditedCase: async () => ({
    status: "action_pending",
    bill: fixture.bill,
    flags: fixture.flags,
  }),
  checkTransition: () => "action_pending",
}));
vi.mock("../repo/cases", () => ({
  listEvents: async () => [...fixture.events],
  setStatus: vi.fn(),
}));
vi.mock("./livekit", () => ({
  dispatchConference: fixture.dispatch,
  closeConference: fixture.close,
  patientIsPresent: fixture.present,
  browserPatientSession: fixture.browser,
}));

import {
  conferenceProgress,
  expireConference,
  handleVoiceRequest,
  processVoiceEvent,
  startConferenceCall,
} from "./conference";

afterEach(() => vi.unstubAllEnvs());

function fakeDb(failedClaims: string[] = []): Database {
  let queue = Promise.resolve();
  const db = {
    execute: async () => undefined,
    transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      const work = queue.then(() => fn(db));
      queue = work.then(
        () => undefined,
        () => undefined,
      );
      return work;
    },
    select: () => ({
      from: () => ({
        where: () =>
          Object.assign(Promise.resolve([]), {
            for: async () => [fixture.action],
          }),
      }),
    }),
    insert: () => ({
      values: (event: Omit<CaseEvent, "at">) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (failedClaims.some((key) => event.id.endsWith(`:${key}`)))
              throw new Error("Database unavailable");
            if (fixture.events.some((e) => e.id === event.id)) return [];
            fixture.events.push({ ...event, at: new Date().toISOString() });
            return [{ id: event.id }];
          },
        }),
      }),
    }),
  };
  return db as unknown as Database;
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("BB_FAKE_PROVIDERS", "0");
  fixture.events = [];
  fixture.bill = {
    id: "b1",
    hospital: { name: "Example", city: null, state: null },
    accountRefMasked: "1234",
    statementDate: null,
    kind: "itemized",
    sourceKind: "text",
    lines: [],
    totals: { chargesCents: 0, adjustmentsCents: 0, paidCents: 0, dueCents: 0 },
  };
  fixture.flags = [];
  fixture.present.mockResolvedValue(true);
  for (const [key, value] of Object.entries({
    CALL_MODE: "conference",
    CALL_ALLOWLIST: "+13105550100,+13105550101",
    CALL_PATIENT_NUMBER: "+13105550101",
    LIVEKIT_URL: "wss://test.livekit.cloud",
    LIVEKIT_API_KEY: "key",
    LIVEKIT_API_SECRET: "secret",
    LIVEKIT_PHOTON_TRUNK_ID: "ST_test",
    ELEVENLABS_AGENT_ID: "agent_test",
    ELEVENLABS_CONFERENCE_BRANCH_ID: "branch_test",
    BB_VOICE_WORKER_KEY: "worker-secret",
  }))
    vi.stubEnv(key, value);
  const vars = buildCallVars(fixture.bill, fixture.flags);
  fixture.action = {
    id: "a1",
    caseId: "c1",
    kind: "call",
    draft: renderConferenceScript(vars, "+13105550100", "+13105550101"),
    recipient: "+13105550100",
    approvedAt: new Date().toISOString(),
    sentAt: null,
    outcome: null,
  };
  fixture.events.push({
    id: "approval",
    caseId: "c1",
    type: "action.approved",
    actor: "user",
    summary: "Approved",
    at: new Date().toISOString(),
    artifactRef: approvalRef("a1", await sha256Hex(fixture.action.draft)),
  });
  fixture.dispatch.mockResolvedValue({ dispatchId: "AD_test" });
  fixture.browser.mockResolvedValue({
    serverUrl: "wss://test.livekit.cloud",
    token: "private-token",
  });
});

it("passes only the approved synthetic profile and personalized briefing to the worker", async () => {
  fixture.events.unshift({
    id: "parsed",
    caseId: "c1",
    type: "bill.parsed",
    actor: "system",
    at: new Date().toISOString(),
    summary: "Loaded sample bill SB-01 (10 lines)",
  });
  fixture.action.draft = renderConferenceScript(
    buildCallVars(fixture.bill, fixture.flags, true),
    "+13105550100",
    "+13105550101",
  );
  const approval = fixture.events.find(
    (event) => event.type === "action.approved",
  );
  if (!approval) throw new Error("Missing approval");
  approval.artifactRef = approvalRef(
    "a1",
    await sha256Hex(fixture.action.draft),
  );
  const result = await boot(fakeDb());
  expect(result).toMatchObject({
    vars: { patient_name: "Alex Morgan", patient_dob: "1990-04-12" },
    introductionText: expect.stringContaining("Alex Morgan"),
  });
});

it("rejects an approved call when the available evidence changes", async () => {
  fixture.flags = [
    {
      id: "f1",
      lineIds: [],
      lever: "duplicate",
      tier: "confirmed",
      title: "Duplicate",
      explanation: "Listed twice",
      amountCents: 8400,
      evidence: { kind: "arithmetic", detail: "Two entries for $84" },
      confidence: 1,
    },
  ];
  fixture.action.draft = renderConferenceScript(
    buildCallVars(fixture.bill, fixture.flags),
    "+13105550100",
    "+13105550101",
  );
  const approval = fixture.events[0];
  const concern = fixture.flags[0];
  if (!approval || !concern) throw new Error("Missing case fixture");
  approval.artifactRef = approvalRef(
    "a1",
    await sha256Hex(fixture.action.draft),
  );
  concern.evidence.detail = "The entries are on different dates";
  await expect(startConferenceCall(fakeDb(), "a1")).rejects.toThrow(
    "script or patient destination changed",
  );
  expect(fixture.dispatch).not.toHaveBeenCalled();
});

it("issues one browser credential after approval, never dials the patient's phone, and waits to brief before billing", async () => {
  vi.stubEnv("CALL_PATIENT_NUMBER", "");
  fixture.action.draft = renderConferenceScript(
    buildCallVars(fixture.bill, fixture.flags),
    fixture.action.recipient,
    "",
    "browser",
  );
  const db = fakeDb();
  await expect(startConferenceCall(db, "a1")).rejects.toThrow(
    "approve this exact call",
  );
  expect(fixture.browser).not.toHaveBeenCalled();
  const approval = fixture.events[0];
  if (!approval) throw new Error("Missing approval fixture");
  approval.artifactRef = approvalRef(
    "a1",
    await sha256Hex(fixture.action.draft),
  );
  const starts = await Promise.all([
    startConferenceCall(db, "a1"),
    startConferenceCall(db, "a1"),
  ]);
  expect(starts.filter((result) => result.browserSession)).toHaveLength(1);
  expect(fixture.browser).toHaveBeenCalledWith("bb-a1");
  const bootstrap = await processVoiceEvent(db, {
    event: "bootstrap",
    ...binding,
  });
  expect(bootstrap).toMatchObject({ patientConnection: "browser" });
  expect(await dial(db, "patient")).toEqual({ allowed: false });
  expect(await dial(db, "billing")).toEqual({ allowed: false });
  await status(db, "patient_joined");
  expect(await dial(db, "billing")).toEqual({ allowed: false });
  await status(db, "patient_briefed");
  expect(await dial(db, "billing")).toMatchObject({
    allowed: true,
    phoneNumber: fixture.action.recipient,
  });
  expect(JSON.stringify(fixture.events)).not.toContain("private-token");
});

it("does not delete a connected call because fifteen minutes elapsed", async () => {
  const db = fakeDb();
  await boot(db);
  await brief(db);
  const started = fixture.events.find((event) => event.id === "voice:a1:start");
  if (!started) throw new Error("Missing start");
  started.at = new Date(Date.now() - 16 * 60_000).toISOString();
  expect(await expireConference(db, fixture.action, fixture.events)).toBe(
    false,
  );
  expect(fixture.close).not.toHaveBeenCalled();
});

it("claims concurrent starts once and does not retry an uncertain dispatch", async () => {
  const db = fakeDb();
  fixture.dispatch.mockRejectedValue(new Error("lost response with secret"));
  await Promise.allSettled([
    startConferenceCall(db, "a1"),
    startConferenceCall(db, "a1"),
  ]);
  expect(fixture.dispatch).toHaveBeenCalledTimes(1);
  expect((await startConferenceCall(db, "a1")).status).toBe("failed");
  expect(JSON.stringify(fixture.events)).not.toContain("secret");
});

const binding = {
  actionId: "a1",
  roomName: "bb-a1",
  flowVersion: "patient-first-v1",
};
async function boot(db: Database) {
  await startConferenceCall(db, "a1");
  return processVoiceEvent(db, { event: "bootstrap", ...binding });
}
const status = (db: Database, status: string, extra = {}) =>
  processVoiceEvent(db, { event: "status", ...binding, status, ...extra });
const dial = (db: Database, leg: "patient" | "billing") =>
  processVoiceEvent(db, { event: "dial", ...binding, leg });
async function brief(db: Database) {
  await dial(db, "patient");
  await status(db, "patient_joined");
  await status(db, "patient_briefed");
}

it("keeps the human conference active when the advocate withdraws", async () => {
  const db = fakeDb();
  await boot(db);
  await brief(db);
  await dial(db, "billing");
  await status(db, "billing_connected");
  await status(db, "ai_unavailable");
  expect(conferenceProgress("a1", fixture.events)).toMatchObject({
    ended: false,
    failed: false,
    billingConnected: true,
    status: "in_progress",
  });
  expect(fixture.close).not.toHaveBeenCalled();
  await status(db, "completed", { reason: "finished" });
  expect(conferenceProgress("a1", fixture.events).ended).toBe(true);
});

it("binds a versioned bootstrap without exposing destinations and prevents duplicate workers", async () => {
  const db = fakeDb();
  await startConferenceCall(db, "a1");
  for (const change of [
    { roomName: "other" },
    { flowVersion: "legacy" },
    { flowVersion: undefined },
  ])
    await expect(
      processVoiceEvent(db, { event: "bootstrap", ...binding, ...change }),
    ).rejects.toThrow();
  const result = await processVoiceEvent(db, {
    event: "bootstrap",
    ...binding,
  });
  expect(result).toMatchObject({
    flowVersion: "patient-first-v1",
    branchId: "branch_test",
    introductionText: expect.any(String),
  });
  expect(JSON.stringify(result)).not.toContain("+1310555");
  await expect(
    processVoiceEvent(db, { event: "bootstrap", ...binding }),
  ).rejects.toThrow();
});
it("claims each phone leg exactly once and requires briefing before billing", async () => {
  const db = fakeDb();
  await boot(db);
  expect(await dial(db, "billing")).toEqual({ allowed: false });
  const patients = await Promise.all([
    dial(db, "patient"),
    dial(db, "patient"),
  ]);
  expect(patients).toContainEqual({
    allowed: true,
    phoneNumber: "+13105550101",
  });
  expect(patients).toContainEqual({ allowed: false });
  await status(db, "patient_joined");
  expect(await dial(db, "billing")).toEqual({ allowed: false });
  await status(db, "patient_briefed");
  const offices = await Promise.all([dial(db, "billing"), dial(db, "billing")]);
  expect(offices).toContainEqual({
    allowed: true,
    phoneNumber: "+13105550100",
  });
  expect(offices).toContainEqual({ allowed: false });
  expect(fixture.events.filter((e) => e.type === "call.ringing")).toHaveLength(
    1,
  );
});
it("fails closed when patient presence is absent or unavailable and blocks after departure", async () => {
  const db = fakeDb();
  await boot(db);
  await brief(db);
  fixture.present.mockResolvedValueOnce(false);
  expect(await dial(db, "billing")).toEqual({ allowed: false });
  fixture.present.mockRejectedValueOnce(new Error("provider credential"));
  await expect(dial(db, "billing")).rejects.toThrow(
    "Could not verify the patient connection",
  );
  expect(JSON.stringify(fixture.events)).not.toContain("credential");
  await status(db, "patient_left");
  expect(await dial(db, "billing")).toEqual({ allowed: false });
});
it("revalidates exact approval and both destinations at each dial", async () => {
  const db = fakeDb();
  await boot(db);
  vi.stubEnv("CALL_PATIENT_NUMBER", "+13105550102");
  await expect(dial(db, "patient")).rejects.toThrow();
  vi.stubEnv("CALL_PATIENT_NUMBER", "+13105550101");
  await brief(db);
  fixture.action.draft += " changed";
  await expect(dial(db, "billing")).rejects.toThrow();
});
it("rejects legacy approved scripts before dispatching a new call", async () => {
  fixture.action.draft = "Patient connection approval: old invitation";
  const approval = fixture.events[0];
  if (!approval) throw new Error("Missing test approval");
  approval.artifactRef = approvalRef(
    "a1",
    await sha256Hex(fixture.action.draft),
  );
  await expect(startConferenceCall(fakeDb(), "a1")).rejects.toThrow();
  expect(fixture.dispatch).not.toHaveBeenCalled();
});
it("requires bootstrap and prevents workers from forging dial claims", async () => {
  const db = fakeDb();
  await startConferenceCall(db, "a1");
  await expect(dial(db, "patient")).rejects.toThrow();
  await processVoiceEvent(db, { event: "bootstrap", ...binding });
  for (const next of ["patient_inviting", "ringing", "ready", "patient_joined"])
    await expect(
      status(db, next, next === "ready" ? { conversationId: "conv_test" } : {}),
    ).rejects.toThrow();
});
it("records ordered connection history and terminal reason without interpreting patient approval", async () => {
  const db = fakeDb();
  await boot(db);
  await brief(db);
  await dial(db, "billing");
  await status(db, "billing_connected");
  await status(db, "ready", { conversationId: "conv_test" });
  await expect(
    status(db, "ready", { conversationId: "conv_other" }),
  ).rejects.toThrow();
  await status(db, "patient_left");
  await status(db, "failed", { reason: "patient_left" });
  await expect(
    status(db, "failed", { reason: "patient_left" }),
  ).resolves.toEqual({ ok: true });
  const progress = conferenceProgress("a1", fixture.events);
  expect(progress).toMatchObject({
    ended: true,
    failed: true,
    billingConnected: true,
    reason: "patient_left",
    conversationId: "conv_test",
  });
  expect(
    fixture.events.find((e) => e.type === "call.conference_failed")?.summary,
  ).toContain("patient_left");
  await expect(dial(db, "patient")).rejects.toThrow();
  await expect(
    status(db, "completed", { reason: "finished" }),
  ).rejects.toThrow();
  await expect(
    status(db, "failed", { reason: "secret invalid reason" }),
  ).rejects.toThrow();
});
it("records normal completion with both phone legs present", async () => {
  const db = fakeDb();
  await boot(db);
  await brief(db);
  await dial(db, "billing");
  await status(db, "billing_connected");
  await status(db, "ready", { conversationId: "conv_test" });
  await status(db, "completed", { reason: "finished" });
  expect(conferenceProgress("a1", fixture.events)).toMatchObject({
    status: "done",
    reason: "finished",
  });
});
it("rejects worker requests before reading the body when the key is absent or wrong", async () => {
  const response = await handleVoiceRequest(
    fakeDb(),
    new Request("http://test/api/voice", {
      method: "POST",
      body: "not json",
      headers: { "x-bb-voice-key": "wrong" },
    }),
  );
  expect(response.status).toBe(401);
});
it("never dispatches a real conference while fake providers are enabled", async () => {
  vi.stubEnv("BB_FAKE_PROVIDERS", "1");
  await expect(startConferenceCall(fakeDb(), "a1")).rejects.toThrow();
  expect(fixture.dispatch).not.toHaveBeenCalled();
});
it("closes rooms if persistence fails even when recording failure also fails", async () => {
  await expect(
    startConferenceCall(fakeDb(["dispatch", "failed"]), "a1"),
  ).rejects.toThrow();
  expect(fixture.close).toHaveBeenCalledWith("bb-a1");
});

it("revoked app approval prevents either new phone leg from dialing", async () => {
  const db = fakeDb();
  await boot(db);
  fixture.events.push({
    id: "cancelled",
    caseId: "c1",
    type: "action.cancelled",
    actor: "user",
    summary: "Cancelled",
    at: new Date(Date.now() + 1).toISOString(),
    artifactRef: "action:a1",
  });
  await expect(dial(db, "patient")).rejects.toThrow();
});

it("reads legacy connection history but prevents a new worker from claiming it", async () => {
  const db = fakeDb();
  await startConferenceCall(db, "a1");
  const started = fixture.events.find((event) => event.id === "voice:a1:start");
  if (!started) throw new Error("Missing started event");
  started.summary = "Conference requested (livekit:bb-a1)";
  fixture.events.push({
    id: "voice:a1:ready",
    caseId: "c1",
    type: "call.ready",
    actor: "system",
    summary: "Ready (elevenlabs:conv_legacy)",
    at: new Date().toISOString(),
  });
  expect(conferenceProgress("a1", fixture.events)).toMatchObject({
    billingConnected: true,
    conversationId: "conv_legacy",
  });
  await expect(
    processVoiceEvent(db, { event: "bootstrap", ...binding }),
  ).rejects.toThrow();
});
