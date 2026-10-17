// Seeds synthetic fixtures (data/synthetic/bills/*.json, format owned by C)
// into case, bill, line and eob. Idempotent: upserts the case and replaces
// its bill, lines and eob. Never touches case_event (append-only).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Bill, Eob } from "@betterbill/core";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createDb, type Database } from "./index";
import { bill, caseTable, eob, line } from "./schema";

export const FIXTURE_DIR = fileURLToPath(
  new URL("../../../data/synthetic/bills", import.meta.url),
);

const Fixture = z.looseObject({
  id: z.string(),
  synthetic: z.literal(true),
  bill: Bill,
  eob: Eob.nullable(),
});
type Fixture = z.infer<typeof Fixture>;

export const caseIdFor = (fixtureId: string) => `case-${fixtureId}`;

export async function loadFixtures(dir = FIXTURE_DIR): Promise<Fixture[]> {
  const files = await readdir(dir).catch(() => [] as string[]);
  const fixtures: Fixture[] = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
    const raw = JSON.parse(await readFile(join(dir, file), "utf8"));
    fixtures.push(Fixture.parse(raw));
  }
  return fixtures;
}

export async function seedFixture(db: Database, fx: Fixture): Promise<void> {
  const caseId = caseIdFor(fx.id);
  const b = fx.bill;
  await db.transaction(async (tx) => {
    await tx
      .insert(caseTable)
      .values({ id: caseId, status: "new", hospitalName: b.hospital.name })
      .onConflictDoUpdate({
        target: caseTable.id,
        set: { status: "new", hospitalName: b.hospital.name },
      });
    await tx.delete(bill).where(eq(bill.caseId, caseId));
    await tx.delete(eob).where(eq(eob.caseId, caseId));
    await tx.insert(bill).values({
      id: b.id,
      caseId,
      hospitalName: b.hospital.name,
      hospitalCity: b.hospital.city,
      hospitalState: b.hospital.state,
      statementDate: b.statementDate,
      accountRefMasked: b.accountRefMasked,
      kind: b.kind,
      sourceKind: b.sourceKind,
      chargesCents: b.totals.chargesCents,
      adjustmentsCents: b.totals.adjustmentsCents,
      paidCents: b.totals.paidCents,
      dueCents: b.totals.dueCents,
    });
    if (b.lines.length > 0) {
      await tx.insert(line).values(
        b.lines.map((l, position) => ({
          id: l.id,
          billId: b.id,
          position,
          serviceDate: l.serviceDate,
          description: l.description,
          code: l.code,
          codeType: l.codeType,
          units: l.units,
          chargeCents: l.chargeCents,
          sourcePage: l.source.page,
          bbox: l.source.bbox,
          confidence: l.confidence,
          userEdited: l.userEdited,
        })),
      );
    }
    if (fx.eob) {
      await tx.insert(eob).values({
        id: `eob-${fx.id}`,
        caseId,
        payer: fx.eob.payer,
        claimRefMasked: fx.eob.claimRefMasked,
        patientResponsibilityCents: fx.eob.patientResponsibilityCents,
        lines: fx.eob.lines ?? null,
      });
    }
  });
}

export async function seed(db: Database, dir = FIXTURE_DIR): Promise<number> {
  const fixtures = await loadFixtures(dir);
  for (const fx of fixtures) await seedFixture(db, fx);
  return fixtures.length;
}

if (import.meta.main) {
  await import("varlock/auto-load");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createDb({ DATABASE_URL: url });
  const n = await seed(db);
  console.log(`seeded ${n} fixture(s) from ${FIXTURE_DIR}`);
  await db.$client.end();
}
