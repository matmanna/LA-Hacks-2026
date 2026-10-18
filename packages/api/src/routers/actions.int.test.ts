// Integration: A's action routes on a real audited case, against a migrated
// Postgres. Without GEMINI_API_KEY (CI) drafting uses the fallback letter.
import {
  approvalCoverage,
  approvalRef,
  checkWording,
  DISCLOSURE,
  findApproval,
  sha256Hex,
} from "@betterbill/core";
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("action routes (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  async function auditedCase(sample = "SB-01") {
    const c = await client.case.create({ sample });
    const detail = await client.case.get({ caseId: c.id });
    await client.bill.confirmLines({
      caseId: c.id,
      lines: detail.bill?.lines ?? [],
    });
    const audit = await client.audit.run({ caseId: c.id });
    return { caseId: c.id, flags: audit.flags };
  }

  async function drafted() {
    const { caseId, flags } = await auditedCase();
    const res = await client.action.draftLetter({ caseId, kind: "letter" });
    return { caseId, flags, ...res };
  }

  async function status(caseId: string) {
    return (await client.case.get({ caseId })).case.status;
  }

  it("walks one case from new to sent, with every send approved (A-10)", async () => {
    vi.stubEnv("EMAIL_TEST_INBOX", "flow@example.com");
    vi.stubEnv("EMAIL_ALLOWLIST", "flow@example.com");
    vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    try {
      const c = await client.case.create({ sample: "SB-01" });
      const seen = [await status(c.id)];
      const detail = await client.case.get({ caseId: c.id });
      await client.bill.confirmLines({
        caseId: c.id,
        lines: detail.bill?.lines ?? [],
      });
      seen.push(await status(c.id));
      await client.audit.run({ caseId: c.id });
      seen.push(await status(c.id));
      const { action, draftHash } = await client.action.draftLetter({
        caseId: c.id,
        kind: "letter",
      });
      seen.push(await status(c.id));
      await client.action.approve({ actionId: action.id, draftHash });
      await client.action.send({ actionId: action.id });
      seen.push(await status(c.id));

      expect(seen).toEqual([
        "new",
        "lines_confirmed",
        "audited",
        "action_pending",
        "sent",
      ]);
      const events = await client.event.list({ caseId: c.id });
      expect(approvalCoverage(events)).toEqual({
        outbound: 1,
        approved: 1,
        ratio: 1,
      });
      expect(checkWording(action.draft)).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  describe("draftLetter", () => {
    it("refuses to draft before the bill is checked", async () => {
      const c = await client.case.create({ sample: "SB-01" });
      await expect(
        client.action.draftLetter({ caseId: c.id, kind: "letter" }),
      ).rejects.toBeInstanceOf(ORPCError);
    });

    it("SB-01: drafts a checked letter, records it, and moves the case on", async () => {
      const { caseId, flags, action, draftHash, claims } = await drafted();

      expect(claims.map((x) => x.flagId).sort()).toEqual(
        flags.map((f) => f.id).sort(),
      );
      expect(draftHash).toBe(await sha256Hex(action.draft));
      expect(checkWording(action.draft)).toEqual([]);
      expect(action.approvedAt).toBeNull();

      const after = await client.case.get({ caseId });
      expect(after.case.status).toBe("action_pending");
      expect(after.actions.map((a) => a.id)).toContain(action.id);

      const events = await client.event.list({ caseId });
      expect(events.at(-1)).toMatchObject({
        type: "action.drafted",
        actor: "agent",
        artifactRef: approvalRef(action.id, draftHash),
      });
    });
  });

  describe("approve and cancel", () => {
    it("rejects a hash that does not match the stored draft", async () => {
      const { action } = await drafted();
      await expect(
        client.action.approve({ actionId: action.id, draftHash: "stale" }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: "This draft changed. Please review it again.",
      });
    });

    it("approves the exact text and records the hash", async () => {
      const { caseId, action, draftHash } = await drafted();
      const approved = await client.action.approve({
        actionId: action.id,
        draftHash,
      });
      expect(approved.approvedAt).not.toBeNull();
      expect(await status(caseId)).toBe("action_pending");

      const events = await client.event.list({ caseId });
      expect(events.at(-1)).toMatchObject({
        type: "action.approved",
        actor: "user",
        artifactRef: approvalRef(action.id, draftHash),
      });
      expect(findApproval(events, action.id)?.hash).toBe(draftHash);
    });

    it("cancel withdraws an approval so nothing can be sent", async () => {
      const { caseId, action, draftHash } = await drafted();
      await client.action.approve({ actionId: action.id, draftHash });
      const cancelled = await client.action.approve({
        actionId: action.id,
        draftHash,
        cancel: true,
      });
      expect(cancelled.approvedAt).toBeNull();

      const events = await client.event.list({ caseId });
      expect(events.at(-1)?.type).toBe("action.cancelled");
      expect(findApproval(events, action.id)).toBeNull();
    });
  });

  describe("send", () => {
    const INBOX = "test-inbox@example.com";

    beforeEach(() => {
      vi.stubEnv("EMAIL_TEST_INBOX", INBOX);
      vi.stubEnv("EMAIL_ALLOWLIST", INBOX);
      vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const sentEvents = async (caseId: string) =>
      (await client.event.list({ caseId })).filter(
        (e) => e.type === "action.sent",
      );

    it("refuses to send a letter nobody approved", async () => {
      const { action } = await drafted();
      await expect(
        client.action.send({ actionId: action.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("sends once after approval, and a second send changes nothing", async () => {
      const { caseId, action, draftHash } = await drafted();
      await client.action.approve({ actionId: action.id, draftHash });

      const sent = await client.action.send({ actionId: action.id });
      expect(sent.sentAt).not.toBeNull();
      expect(await status(caseId)).toBe("sent");
      await client.action.send({ actionId: action.id });

      const events = await client.event.list({ caseId });
      const sends = events.filter((e) => e.type === "action.sent");
      expect(sends).toHaveLength(1);
      expect(sends[0]?.artifactRef).toBe(approvalRef(action.id, draftHash));
      expect(sends[0]?.summary).toContain("fake");
      expect(approvalCoverage(events).ratio).toBe(1);
    });

    it("only sends to the allowlisted test inbox", async () => {
      const { action, draftHash } = await drafted();
      await client.action.approve({ actionId: action.id, draftHash });
      vi.stubEnv("EMAIL_ALLOWLIST", "someone-else@example.com");
      await expect(
        client.action.send({ actionId: action.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "This demo only sends to the test inbox.",
      });
    });

    it("records a failed send and keeps the approval for a retry", async () => {
      const { caseId, action, draftHash } = await drafted();
      await client.action.approve({ actionId: action.id, draftHash });
      vi.stubEnv("BB_FAKE_PROVIDERS", "");
      vi.stubEnv("PHOTON_API_KEY", "");
      await expect(
        client.action.send({ actionId: action.id }),
      ).rejects.toMatchObject({ code: "BAD_GATEWAY" });

      const events = await client.event.list({ caseId });
      expect(events.at(-1)?.type).toBe("action.send_failed");
      expect(await status(caseId)).toBe("action_pending");
      expect(await sentEvents(caseId)).toHaveLength(0);
      expect(findApproval(events, action.id)?.hash).toBe(draftHash);
    });
  });

  describe("call", () => {
    const PHONE = "+13105550100";

    beforeEach(() => {
      vi.stubEnv("CALL_MODE", "direct");
      vi.stubEnv("CALL_ALLOWLIST", PHONE);
      vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    async function draftedCall() {
      const { caseId } = await auditedCase();
      const res = await client.action.draftLetter({ caseId, kind: "call" });
      return { caseId, ...res };
    }

    it("won't draft a call when no test phone is set up", async () => {
      vi.stubEnv("CALL_ALLOWLIST", "");
      const { caseId } = await auditedCase();
      await expect(
        client.action.draftLetter({ caseId, kind: "call" }),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    });

    it("needs approval with consent before it dials", async () => {
      const { action, draftHash } = await draftedCall();
      expect(action.kind).toBe("call");
      expect(action.recipient).toBe(PHONE);
      expect(action.draft.startsWith(DISCLOSURE)).toBe(true);

      await expect(
        client.call.start({ actionId: action.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        client.action.approve({ actionId: action.id, draftHash }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("only dials numbers on the test list", async () => {
      const { action, draftHash } = await draftedCall();
      await client.action.approve({
        actionId: action.id,
        draftHash,
        consent: true,
      });
      vi.stubEnv("CALL_ALLOWLIST", "+13105550199");
      await expect(
        client.call.start({ actionId: action.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("places one call and saves its outcome once", async () => {
      const { caseId, action, draftHash } = await draftedCall();
      await client.action.approve({
        actionId: action.id,
        draftHash,
        consent: true,
      });

      const started = await client.call.start({ actionId: action.id });
      expect(started).toEqual({
        callId: `call-${action.id}`,
        status: "ringing",
      });
      expect((await client.call.start({ actionId: action.id })).status).toBe(
        "started",
      );

      const first = await client.call.status({ callId: started.callId });
      const second = await client.call.status({ callId: started.callId });
      expect(first.status).toBe("done");
      expect(second).toEqual(first);
      expect(first.transcript?.startsWith(`agent: ${DISCLOSURE}`)).toBe(true);
      expect(JSON.parse(first.outcome ?? "{}").summary).toContain(
        "No phone call was placed",
      );

      const events = await client.event.list({ caseId });
      expect(events.filter((e) => e.type === "call.started")).toHaveLength(1);
      expect(events.filter((e) => e.type === "call.completed")).toHaveLength(1);
      expect(approvalCoverage(events).ratio).toBe(1);
      expect(await status(caseId)).toBe("called");
    });

    it("saves the outcome when the case is opened, even if nobody polled", async () => {
      const { caseId, action, draftHash } = await draftedCall();
      await client.action.approve({
        actionId: action.id,
        draftHash,
        consent: true,
      });
      await client.call.start({ actionId: action.id });

      const detail = await client.case.get({ caseId });
      const call = detail.actions.find((a) => a.id === action.id);
      expect(call?.outcome).toBeTruthy();
      expect(detail.case.status).toBe("called");
    });
  });
});
