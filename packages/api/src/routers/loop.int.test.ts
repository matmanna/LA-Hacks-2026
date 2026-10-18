// Integration: the full core loop on every bundled sample bill, against a
// migrated Postgres (CI service container or local Docker).
import { createDb } from "@betterbill/db";
import { createRouterClient, ORPCError } from "@orpc/server";
import { afterAll, describe, expect, it } from "vitest";

import { SAMPLES } from "../data";
import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("core loop (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("refuses to audit before lines are confirmed", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    await expect(client.audit.run({ caseId: c.id })).rejects.toBeInstanceOf(
      ORPCError,
    );
    await expect(client.case.create({ sample: "nope" })).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it("SB-01: duplicate, units, and published price with the right numbers", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    const detail = await client.case.get({ caseId: c.id });
    expect(detail.bill?.lines).toHaveLength(11);
    await client.bill.confirmLines({
      caseId: c.id,
      lines: detail.bill?.lines ?? [],
    });
    const audit = await client.audit.run({ caseId: c.id });
    const byLever = Object.fromEntries(
      audit.flags.map((f) => [f.lever, f.amountCents]),
    );
    expect(byLever).toEqual({
      duplicate: 8400,
      units: 7600,
      published_price: 175685, // 6,900.00 billed vs 5,143.15 outpatient cash
    });
    expect(audit.savings).toMatchObject({
      confirmedCents: 8400,
      potentialLowCents: 7600 + 175685,
      potentialHighCents: 7600 + 175685,
    });
    expect(audit.balance).toMatchObject({
      billedCents: 1200000,
      lessThanBilledCents: 8400 + 7600 + 175685,
      isEstimate: true,
    });
    expect(await client.audit.get({ caseId: c.id })).toEqual({
      ...audit,
      durationMs: 0,
    });
    const events = await client.event.list({ caseId: c.id });
    expect(events.map((e) => e.type)).toEqual([
      "case.created",
      "bill.parsed",
      "bill.confirmed",
      "audit.completed",
    ]);
    const after = await client.case.get({ caseId: c.id });
    expect(after.case.status).toBe("audited");
    expect(after.audit?.flags).toEqual(audit.flags);
  });

  it("keeps a line the patient did not receive and flags it as reported", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    const lines = (await client.case.get({ caseId: c.id })).bill?.lines ?? [];
    // The patient says they never had the blood draw (36415, 4 units).
    const marked = lines.map((l) =>
      l.code === "36415" ? { ...l, notReceived: true } : l,
    );
    await client.bill.confirmLines({ caseId: c.id, lines: marked });
    const saved = (await client.case.get({ caseId: c.id })).bill?.lines ?? [];
    const draw = saved.find((l) => l.code === "36415");
    expect(draw).toMatchObject({ notReceived: true, userEdited: false });
    const audit = await client.audit.run({ caseId: c.id });
    const byLever = Object.fromEntries(
      audit.flags.map((f) => [f.lever, f.amountCents]),
    );
    // Units no longer looks at the blood draw; the full charge is disputed.
    expect(byLever).toEqual({
      not_received: 15200,
      duplicate: 8400,
      published_price: 175685,
    });
    expect(audit.flags.find((f) => f.lever === "not_received")?.tier).toBe(
      "reported",
    );
    expect(audit.savings.confirmedCents).toBe(8400);
    expect(audit.savings.potentialHighCents).toBe(175685 + 15200);
    const events = await client.event.list({ caseId: c.id });
    expect(events.find((e) => e.type === "bill.confirmed")?.summary).toContain(
      "1 you did not receive",
    );
  });

  it("marks edited lines and audits what the user confirmed", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    const lines = (await client.case.get({ caseId: c.id })).bill?.lines ?? [];
    // The user says the second CBC line was really a different test.
    const edited = lines.map((l, i) =>
      i === 4 ? { ...l, code: "80053", description: "CMP" } : l,
    );
    await client.bill.confirmLines({ caseId: c.id, lines: edited });
    const events = await client.event.list({ caseId: c.id });
    expect(events.at(-1)?.summary).toBe("Confirmed 11 lines (1 edited)");
    const audit = await client.audit.run({ caseId: c.id });
    expect(audit.flags.some((f) => f.lever === "duplicate")).toBe(false);
  });

  it("runs every sample bill end to end", async () => {
    for (const s of SAMPLES) {
      const c = await client.case.create({ sample: s.id });
      const lines = (await client.case.get({ caseId: c.id })).bill?.lines ?? [];
      await client.bill.confirmLines({ caseId: c.id, lines });
      const audit = await client.audit.run({ caseId: c.id });
      expect(audit.balance.billedCents, s.id).toBe(s.bill.totals.dueCents);
    }
  });

  it("eval.results returns a placeholder until C ships results", async () => {
    const r = await client.eval.results({});
    expect(r).toHaveProperty("generatedAt");
  });
});
