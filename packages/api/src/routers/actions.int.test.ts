// Integration: action.draftLetter on a real audited case, against a migrated
// Postgres. Without GEMINI_API_KEY (CI) this exercises the fallback letter.
import { approvalRef, checkWording, sha256Hex } from "@betterbill/core";
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("action.draftLetter (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("refuses to draft before the bill is checked", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    await expect(
      client.action.draftLetter({ caseId: c.id, kind: "letter" }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("SB-01: drafts a checked letter, records it, and moves the case on", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    const detail = await client.case.get({ caseId: c.id });
    await client.bill.confirmLines({
      caseId: c.id,
      lines: detail.bill?.lines ?? [],
    });
    const audit = await client.audit.run({ caseId: c.id });

    const res = await client.action.draftLetter({
      caseId: c.id,
      kind: "letter",
    });

    expect(res.claims.map((x) => x.flagId).sort()).toEqual(
      audit.flags.map((f) => f.id).sort(),
    );
    expect(res.draftHash).toBe(await sha256Hex(res.action.draft));
    expect(checkWording(res.action.draft)).toEqual([]);
    expect(res.action.approvedAt).toBeNull();

    const after = await client.case.get({ caseId: c.id });
    expect(after.case.status).toBe("action_pending");
    expect(after.actions.map((a) => a.id)).toContain(res.action.id);

    const events = await client.event.list({ caseId: c.id });
    expect(events.at(-1)).toMatchObject({
      type: "action.drafted",
      actor: "agent",
      artifactRef: approvalRef(res.action.id, res.draftHash),
    });
  });
});
