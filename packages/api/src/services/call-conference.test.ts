import {
  type Action,
  type CaseEvent,
  renderConferenceScript,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  action: {} as Action,
  events: [] as CaseEvent[],
  expire: vi.fn(),
  addEvent: vi.fn(),
  getConversation: vi.fn(),
}));
vi.mock("./actions", () => ({
  getAction: async () => fixture.action,
  checkTransition: () => "called",
  loadAuditedCase: vi.fn(),
  saveDraft: vi.fn(),
}));
vi.mock("../repo/cases", () => ({
  listEvents: async () => fixture.events,
  getCaseRow: async () => ({ status: "action_pending" }),
  setStatus: vi.fn(),
  addEvent: fixture.addEvent,
}));
vi.mock("./conference", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./conference")>()),
  expireConference: fixture.expire,
}));
vi.mock("./elevenlabs", () => ({
  getConversation: fixture.getConversation,
  startOutboundCall: vi.fn(),
}));

import { setStatus } from "../repo/cases";
import { callStatus } from "./call";

function add(status: string, summary = status, at = new Date().toISOString()) {
  fixture.events.push({
    id: `voice:a1:${status}`,
    caseId: "c1",
    actor: "system",
    at,
    type: status === "start" ? "call.started" : `call.${status}`,
    summary,
    artifactRef: "action:a1#sha256:test",
  });
}
const db = {
  transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  update: () => ({
    set: ({ outcome }: { outcome: string }) => ({
      where: () => ({
        returning: async () => {
          fixture.action.outcome = outcome;
          return [{ id: "a1" }];
        },
      }),
    }),
  }),
} as unknown as Database;
beforeEach(() => {
  vi.clearAllMocks();
  fixture.expire.mockResolvedValue(false);
  fixture.action = {
    id: "a1",
    caseId: "c1",
    kind: "call",
    draft: renderConferenceScript(
      {
        hospital_name: "Example",
        account_last4: "1234",
        disputed_items: "Duplicate",
        ask: "Review",
        review_topics: "Duplicate",
        case_context: "Review the duplicate charge",
        patient_name: "",
        patient_dob: "",
      },
      "+13105550100",
      "+13105550101",
    ),
    recipient: "+13105550100",
    approvedAt: new Date().toISOString(),
    sentAt: null,
    outcome: null,
  };
  fixture.events = [];
  add("start");
});
it("persists a failed attempt without a hosted conversation and never fetches a fabricated transcript", async () => {
  add("failed", "Ended (reason:error)");
  const result = await callStatus(db, { callId: "call-a1" });
  expect(result.status).toBe("failed");
  expect(JSON.parse(result.outcome ?? "null")).toMatchObject({
    status: "failed",
    transcript: [],
    recorded: false,
    summary: expect.stringContaining("did not connect"),
  });
  expect(fixture.getConversation).not.toHaveBeenCalled();
  // Nobody was called, so a retry drafted meanwhile stays approvable.
  expect(setStatus).not.toHaveBeenCalled();
});
it("stores an interrupted call as connected to billing even if hosted startup failed", async () => {
  add("patient_joined");
  add("billing_connected");
  add("failed", "Ended (reason:patient_left)");
  const result = await callStatus(db, { callId: "call-a1" });
  expect(JSON.parse(result.outcome ?? "null").summary).toContain("ended early");
});
it("keeps polling provider analysis briefly, then stores a truthful result without waiting forever", async () => {
  add("patient_joined");
  add("billing_connected");
  add("ready", "Ready (elevenlabs:conv_test)");
  add("failed", "Ended (reason:patient_left)");
  fixture.getConversation.mockResolvedValue({ status: "processing" });
  expect(await callStatus(db, { callId: "call-a1" })).toMatchObject({
    status: "in_progress",
    outcome: null,
  });
  const terminal = fixture.events.at(-1);
  if (!terminal) throw new Error("Missing terminal fixture");
  terminal.at = new Date(Date.now() - 61_000).toISOString();
  const result = await callStatus(db, { callId: "call-a1" });
  expect(JSON.parse(result.outcome ?? "null")).toMatchObject({
    status: "failed",
    transcript: [],
    summary: expect.stringContaining("unavailable"),
  });
});
it("bounds failed provider lookups", async () => {
  add("billing_connected");
  add("ready", "Ready (elevenlabs:conv_test)");
  add("failed", "Ended", new Date(Date.now() - 61_000).toISOString());
  fixture.getConversation.mockRejectedValue(new Error("provider unavailable"));
  expect((await callStatus(db, { callId: "call-a1" })).outcome).not.toBeNull();
});
it("keeps human transcript speech neutral and does not infer who refused from a mixed reply", async () => {
  add("patient_joined");
  add("billing_connected");
  add("ready", "Ready (elevenlabs:conv_test)");
  add("completed", "Ended (reason:finished)");
  fixture.getConversation.mockResolvedValue({
    status: "done",
    transcript: [{ role: "user", message: "No", time_in_call_secs: 1 }],
    metadata: { call_duration_secs: 15 },
  });
  const result = await callStatus(db, { callId: "call-a1" });
  expect(result.status).toBe("done");
  expect(result.transcript).toBe("participant: No");
});
