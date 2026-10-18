// Integration: case.summary adds up the cases on a phone (Home V4), against
// a migrated Postgres (CI service container or local Docker).
import { createDb } from "@betterbill/db";
import { createRouterClient } from "@orpc/server";
import { afterAll, describe, expect, it, vi } from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("case.summary (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("totals one bill that needs you and one still being read", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    try {
      const needsYou = await client.case.create({ sample: "SB-01" });
      const detail = await client.case.get({ caseId: needsYou.id });
      await client.bill.confirmLines({
        caseId: needsYou.id,
        lines: detail.bill?.lines ?? [],
      });
      const audit = await client.audit.run({ caseId: needsYou.id });
      await client.action.draftLetter({ caseId: needsYou.id, kind: "letter" });
      const reading = await client.case.create({ sample: "SB-03" });

      const s = await client.case.summary({
        caseIds: [reading.id, needsYou.id, "not-a-case"],
      });
      expect(s.bills).toBe(2);
      expect(s.savingsCents).toBe(audit.balance.lessThanBilledCents);
      expect(s.confirmedCents + s.estimateCents).toBe(s.savingsCents);
      expect(s.needsYou).toBe(1);
      expect(s.waiting).toBe(0);
      expect(s.reading).toBe(1);
      expect(s.flags).toBe(audit.flags.length);
      expect(s.callsMade).toBe(0);
      expect(s.emailsSent).toBe(0);
      expect(s.order.map((b) => b.id)).toEqual([needsYou.id, reading.id]);
      expect(s.order[0]?.needs).toBe("approve the letter");
      expect(s.order[1]).toMatchObject({ group: "reading", needs: null });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("is empty for unknown ids", async () => {
    const s = await client.case.summary({ caseIds: ["nope"] });
    expect(s.bills).toBe(0);
    expect(s.order).toEqual([]);
  });
});
