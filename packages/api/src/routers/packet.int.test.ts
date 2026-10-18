// Integration: share an audited case, read its packet by token, revoke it.
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("evidence packet (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  async function auditedCase() {
    const c = await client.case.create({ sample: "SB-01" });
    const lines = (await client.case.get({ caseId: c.id })).bill?.lines ?? [];
    await client.bill.confirmLines({ caseId: c.id, lines });
    await client.audit.run({ caseId: c.id });
    return c.id;
  }

  it("needs an audit before sharing", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    await expect(client.case.share({ caseId: c.id })).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it("shares, reads, and revokes", async () => {
    const caseId = await auditedCase();
    const { token, path } = await client.case.share({ caseId });
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(path).toBe(`/packet/${token}`);
    expect((await client.case.share({ caseId })).token).toBe(token);

    const p = await client.case.packet({ token });
    // The packet never carries the case id, which unlocks other procedures.
    expect(p.case.id).toBe("shared");
    expect(JSON.stringify(p)).not.toContain(caseId);
    expect(p.flags.map((f) => f.lever).sort()).toEqual([
      "duplicate",
      "published_price",
      "units",
    ]);
    expect(p.balance.lessThanBilledCents).toBe(191685);
    expect(p.bill.accountRefMasked?.length ?? 0).toBeLessThanOrEqual(4);
    const hashes = p.sources.map((s) => s.sha256);
    expect(p.sources).toHaveLength(2); // Cedars-Sinai price file, CMS MUE table
    expect(hashes.every((h) => h && /^[0-9a-f]{64}$/.test(h))).toBe(true);
    expect(p.events.map((e) => e.type)).toContain("case.shared");

    expect(await client.case.revokeShare({ caseId })).toEqual({
      caseId,
      revoked: true,
    });
    await expect(client.case.packet({ token })).rejects.toBeInstanceOf(
      ORPCError,
    );
    expect((await client.case.revokeShare({ caseId })).revoked).toBe(false);
    expect((await client.case.share({ caseId })).token).not.toBe(token);
  });

  it("does not reveal anything for an unknown token", async () => {
    await expect(
      client.case.packet({ token: "x".repeat(43) }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("shows the free-care result, with no income and no screener records", async () => {
    const caseId = await auditedCase();
    const bands = await client.assistance.check({ caseId, householdSize: 3 });
    await client.assistance.check({
      caseId,
      householdSize: 3,
      annualIncomeCents: bands.incomeBands?.[0]?.incomeCents ?? 0,
      insurance: "none",
    });
    const { token } = await client.case.share({ caseId });
    const p = await client.case.packet({ token });

    expect(p.savings.assistance.status).toBe("likely");
    expect(p.balance.fairBalanceLowCents).toBe(0);
    expect(p.case.status).toBe("audited");
    const checked = p.events.find((e) => e.type === "assistance.checked");
    expect(checked?.summary).toMatch(/^Checked \d+ rules: \d+ may help$/);
    expect(checked?.artifactRef).toBeUndefined();
    expect(JSON.stringify(p)).not.toMatch(
      /"id":"income"|incomeBands|householdSize/,
    );
  });
});
