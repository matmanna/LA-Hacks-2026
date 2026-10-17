// Integration test: needs DATABASE_URL pointing at a migrated local or CI
// database. Run with `bun run test:integration`.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { count, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./index";
import { bill, caseEvent, caseTable, eob, line } from "./schema";
import { caseIdFor, seed } from "./seed";

const url = process.env.DATABASE_URL;
const run = `t${Date.now()}`;

const fixture = {
  fixtureVersion: 1,
  id: `SB-T-${run}`,
  synthetic: true,
  bill: {
    id: `bill-${run}`,
    hospital: { name: "Test General (synthetic)", city: null, state: "CA" },
    statementDate: "2026-10-01",
    accountRefMasked: "0000",
    kind: "itemized",
    sourceKind: "text",
    lines: [1, 2].map((n) => ({
      id: `${run}-l${n}`,
      serviceDate: "2026-09-14",
      description: "CBC W/ AUTO DIFF",
      code: "85025",
      codeType: "CPT",
      units: 1,
      chargeCents: 8400,
      source: { page: 1, bbox: null },
      confidence: 1,
      userEdited: false,
    })),
    totals: {
      chargesCents: 16800,
      adjustmentsCents: 0,
      paidCents: 0,
      dueCents: 16800,
    },
  },
  eob: {
    payer: "Test Plan (synthetic)",
    claimRefMasked: null,
    patientResponsibilityCents: 5000,
  },
};

describe.skipIf(!url)("seed (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  let dir = "";
  const caseId = caseIdFor(fixture.id);

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "bb-seed-"));
    await writeFile(join(dir, "fixture.json"), JSON.stringify(fixture));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await db.$client.end();
  });

  const counts = async () => ({
    cases: (
      await db
        .select({ n: count() })
        .from(caseTable)
        .where(eq(caseTable.id, caseId))
    )[0]?.n,
    bills: (
      await db.select({ n: count() }).from(bill).where(eq(bill.caseId, caseId))
    )[0]?.n,
    lines: (
      await db
        .select({ n: count() })
        .from(line)
        .where(eq(line.billId, fixture.bill.id))
    )[0]?.n,
    eobs: (
      await db.select({ n: count() }).from(eob).where(eq(eob.caseId, caseId))
    )[0]?.n,
  });

  it("is idempotent", async () => {
    expect(await seed(db, dir)).toBe(1);
    const first = await counts();
    expect(first).toEqual({ cases: 1, bills: 1, lines: 2, eobs: 1 });
    await seed(db, dir);
    expect(await counts()).toEqual(first);
  });

  it("keeps case_event append-only", async () => {
    const id = `ev-${run}`;
    await db.insert(caseEvent).values({
      id,
      caseId,
      actor: "system",
      type: "test.inserted",
      summary: "insert works",
    });
    await expect(
      db.execute(sql`update case_event set summary = 'x' where id = ${id}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`delete from case_event where id = ${id}`),
    ).rejects.toThrow();
  });
});
