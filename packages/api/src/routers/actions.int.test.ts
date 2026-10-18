// Integration: A's action routes on a real audited case, against a migrated
// Postgres. Without GEMINI_API_KEY (CI) drafting uses the fallback letter.
import {
  approvalRef,
  checkWording,
  findApproval,
  sha256Hex,
} from "@betterbill/core";
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import { afterAll, describe, expect, it } from "vitest";

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
});
