// Integration: assistance.check on the demo bill (SB-01, Cedars-Sinai, CA)
// against a migrated Postgres. The answers match SB-01's synthetic patient.
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("assistance.check (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  const audited = async () => {
    const c = await client.case.create({ sample: "SB-01" });
    const detail = await client.case.get({ caseId: c.id });
    await client.bill.confirmLines({
      caseId: c.id,
      lines: detail.bill?.lines ?? [],
    });
    const audit = await client.audit.run({ caseId: c.id });
    return { id: c.id, audit };
  };

  it("needs a bill", async () => {
    const c = await client.case.create({});
    await expect(
      client.assistance.check({ caseId: c.id }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("every audit carries the checks that need no answers, and asks about income", async () => {
    const { audit } = await audited();
    const a = audit.savings.assistance;
    expect(a.status).toBe("unknown");
    expect(a.asksIncome).toBe(true);
    expect(a.checks?.find((c) => c.id === "policy")?.outcome).toBe(
      "needs_info",
    );
    expect(audit.balance.fairBalanceLowCents).toBe(
      audit.balance.fairBalanceCents,
    );
  });

  it("returns income ranges for a household size, without saving anything", async () => {
    const { id } = await audited();
    const a = await client.assistance.check({ caseId: id, householdSize: 3 });
    expect(a.incomeBands?.length).toBe(3);
    const events = await client.event.list({ caseId: id });
    expect(events.some((e) => e.type === "assistance.checked")).toBe(false);
  });

  it("SB-01 patient: likely free care, saved without income, $0 estimate, and in the letter", async () => {
    const { id } = await audited();
    const bands = await client.assistance.check({
      caseId: id,
      householdSize: 3,
    });
    const band = bands.incomeBands?.find(
      (b) =>
        b.minCents <= 5_200_000 &&
        (b.maxCents === null || 5_200_000 < b.maxCents),
    );
    const a = await client.assistance.check({
      caseId: id,
      householdSize: 3,
      annualIncomeCents: band?.incomeCents ?? 0,
      insurance: "none",
      emergency: true,
    });
    expect(a.status).toBe("likely");
    expect(a.freeCare).toBe(true);
    expect(a.checks?.find((c) => c.id === "income")).toBeDefined();

    const ev = (await client.event.list({ caseId: id })).find(
      (e) => e.type === "assistance.checked",
    );
    expect(ev).toMatchObject({
      actor: "agent",
      summary: "Checked 7 rules: 4 may help",
    });
    // The stored result never holds the income check, ranges or the answers.
    expect(ev?.artifactRef).not.toMatch(
      /"id":"income"|incomeBands|householdSize|annualIncome|5200000/,
    );

    const after = await client.case.get({ caseId: id });
    expect(after.audit?.savings.assistance.status).toBe("likely");
    expect(after.audit?.balance.fairBalanceLowCents).toBe(0);
    expect(after.audit?.balance.isEstimate).toBe(true);

    const letter = await client.action.draftLetter({
      caseId: id,
      kind: "letter",
    });
    expect(letter.claims.map((c) => c.flagId)).toContain("assistance:screen");
    expect(letter.action.draft).toMatch(/May qualify for free care: Estimate/);
  });
});
