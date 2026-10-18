// Requires an already migrated local Postgres; never uses DATABASE_URL.
import { createDb } from "@betterbill/db";
import { createRouterClient } from "@orpc/server";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const provider = vi.hoisted(() => ({
  dispatch: vi.fn(async () => ({ dispatchId: "AD_local_test" })),
  browser: vi.fn(async () => ({
    serverUrl: "wss://test.livekit.cloud",
    token: "test-token",
  })),
}));
vi.mock("./livekit", () => ({
  dispatchConference: provider.dispatch,
  closeConference: vi.fn(),
  patientIsPresent: vi.fn(async () => true),
  browserPatientSession: provider.browser,
}));

import { appRouter } from "../routers/index";
import { processVoiceEvent } from "./conference";

const url = process.env.VOICE_TEST_DATABASE_URL;
const local =
  url && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);

describe.skipIf(!local)("conference durable claims (local Postgres)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });
  afterAll(async () => {
    await db.$client.end();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });
  beforeEach(() => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "0");
    for (const [key, value] of Object.entries({
      CALL_MODE: "conference",
      CALL_ALLOWLIST: "+13105550100,+13105550101",
      CALL_PATIENT_NUMBER: "+13105550101",
      LIVEKIT_URL: "wss://test.livekit.cloud",
      LIVEKIT_API_KEY: "test",
      LIVEKIT_API_SECRET: "test",
      LIVEKIT_PHOTON_TRUNK_ID: "ST_test",
      ELEVENLABS_AGENT_ID: "agent_test",
      ELEVENLABS_CONFERENCE_BRANCH_ID: "branch_test",
      BB_VOICE_WORKER_KEY: "test",
    }))
      vi.stubEnv(key, value);
  });

  it.each(["phone", "browser"] as const)(
    "commits one dispatch and one claim per leg under parallel requests (%s)",
    async (patientConnection) => {
      const created = await client.case.create({ sample: "SB-01" });
      const detail = await client.case.get({ caseId: created.id });
      await client.bill.confirmLines({
        caseId: created.id,
        lines: detail.bill?.lines ?? [],
      });
      await client.audit.run({ caseId: created.id });
      const draft = await client.action.draftLetter({
        caseId: created.id,
        kind: "call",
        patientConnection,
      });
      await client.action.approve({
        actionId: draft.action.id,
        draftHash: draft.draftHash,
        consent: true,
      });
      const starts = await Promise.all(
        Array.from({ length: 4 }, () =>
          client.call.start({ actionId: draft.action.id }),
        ),
      );
      expect(provider.dispatch).toHaveBeenCalledTimes(1);
      expect(starts.filter((result) => result.browserSession)).toHaveLength(
        patientConnection === "browser" ? 1 : 0,
      );
      const binding = {
        flowVersion: "patient-first-v1",
        actionId: draft.action.id,
        roomName: `bb-${draft.action.id}`,
      };
      const bootstrap = await processVoiceEvent(db, {
        event: "bootstrap",
        ...binding,
      });
      expect(bootstrap).toMatchObject({
        vars: {
          patient_name: "Alex Morgan",
          patient_dob: "1990-04-12",
          case_context: expect.stringContaining("Billed charge: $6,900.00"),
        },
        introductionText: expect.stringContaining(
          "Cedars-Sinai Medical Center",
        ),
      });
      expect(draft.action.draft).toContain(
        "Fictional role-play patient: Alex Morgan",
      );
      expect(draft.action.draft).toContain("Evidence tier: published");
      for (const leg of ["patient", "billing"] as const) {
        const claims = await Promise.all(
          Array.from({ length: 4 }, () =>
            processVoiceEvent(db, { event: "dial", ...binding, leg }),
          ),
        );
        expect(
          claims.filter((result) => "allowed" in result && result.allowed),
        ).toHaveLength(
          patientConnection === "browser" && leg === "patient" ? 0 : 1,
        );
        if (leg === "patient") {
          await processVoiceEvent(db, {
            event: "status",
            ...binding,
            status: "patient_joined",
          });
          await processVoiceEvent(db, {
            event: "status",
            ...binding,
            status: "patient_briefed",
          });
        }
      }
      const events = await client.event.list({ caseId: created.id });
      expect(
        events.filter((event) => event.type === "call.started"),
      ).toHaveLength(1);
      expect(
        events.filter((event) => event.type === "call.patient_inviting"),
      ).toHaveLength(1);
      expect(
        events.filter((event) => event.type === "call.ringing"),
      ).toHaveLength(1);
    },
  );

  it("allows only one more start across different actions after two recent calls", async () => {
    const created = await client.case.create({ sample: "SB-01" });
    const detail = await client.case.get({ caseId: created.id });
    await client.bill.confirmLines({
      caseId: created.id,
      lines: detail.bill?.lines ?? [],
    });
    await client.audit.run({ caseId: created.id });
    const actionIds = [];
    for (let index = 0; index < 4; index++) {
      const draft = await client.action.draftLetter({
        caseId: created.id,
        kind: "call",
        patientConnection: "browser",
      });
      await client.action.approve({
        actionId: draft.action.id,
        draftHash: draft.draftHash,
        consent: true,
      });
      actionIds.push(draft.action.id);
    }
    const starts = await Promise.allSettled(
      actionIds.map((actionId) => client.call.start({ actionId })),
    );
    expect(
      starts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = starts.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(3);
    for (const result of rejected)
      expect(result.reason).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    const events = await client.event.list({ caseId: created.id });
    expect(
      events.filter((event) => event.type === "call.started"),
    ).toHaveLength(1);
  });
});
