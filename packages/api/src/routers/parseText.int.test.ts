// Integration: bill.parseText persists the bill, lines, and a case_event.
import { createDb } from "@betterbill/db";
import { bill, caseEvent, line } from "@betterbill/db/schema/index";
import { createRouterClient } from "@orpc/server";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

const TEXT = `HOSPITAL: Westside General Hospital (synthetic) | Los Angeles | CA
TYPE: itemized
2026-09-12  85025  CPT  CBC W/ DIFFERENTIAL  1  84.00
2026-09-12  85025  CPT  CBC W/ DIFFERENTIAL  1  84.00
TOTAL CHARGES: 168.00`;

describe.skipIf(!url)("bill.parseText (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });
  const caseId = `case-int-${Date.now()}`;

  afterAll(async () => {
    await db.$client.end();
  });

  it("parses, persists, and replaces on re-parse", async () => {
    const r = await client.bill.parseText({ caseId, text: TEXT });
    expect(r.reader.mode).toBe("deterministic");
    expect(r.bill.lines).toHaveLength(2);
    expect(r.reconciliation.ok).toBe(true);

    await client.bill.parseText({ caseId, text: TEXT });
    const bills = await db.select().from(bill).where(eq(bill.caseId, caseId));
    expect(bills).toHaveLength(1);
    const lines = await db
      .select()
      .from(line)
      .where(eq(line.billId, r.bill.id));
    expect(lines.map((l) => l.chargeCents)).toEqual([8400, 8400]);
    const events = await db
      .select()
      .from(caseEvent)
      .where(eq(caseEvent.caseId, caseId));
    expect(events.map((e) => e.type)).toEqual(["bill.parsed", "bill.parsed"]);
    expect(events[0]?.summary).toBe("Read 2 lines from text (deterministic)");
  });
});
