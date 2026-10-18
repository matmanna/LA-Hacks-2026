// Small query helpers for bills. Routers stay thin and call these.
import type { Bill } from "@betterbill/core";
import type { Database } from "@betterbill/db";
import {
  bill as billTable,
  caseEvent,
  caseTable,
  line,
} from "@betterbill/db/schema/index";
import { eq } from "drizzle-orm";

// Replace the case's bill with a freshly parsed one and log the event.
// Creates the case row if it does not exist yet.
export async function saveParsedBill(
  db: Database,
  caseId: string,
  bill: Bill,
  summary: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(caseTable)
      .values({ id: caseId, status: "new", hospitalName: bill.hospital.name })
      .onConflictDoUpdate({
        target: caseTable.id,
        set: { hospitalName: bill.hospital.name, status: "new" },
      });
    await tx.delete(billTable).where(eq(billTable.caseId, caseId));
    await tx.insert(billTable).values({
      id: bill.id,
      caseId,
      hospitalName: bill.hospital.name,
      hospitalCity: bill.hospital.city,
      hospitalState: bill.hospital.state,
      statementDate: bill.statementDate,
      accountRefMasked: bill.accountRefMasked,
      kind: bill.kind,
      sourceKind: bill.sourceKind,
      chargesCents: bill.totals.chargesCents,
      adjustmentsCents: bill.totals.adjustmentsCents,
      paidCents: bill.totals.paidCents,
      dueCents: bill.totals.dueCents,
    });
    if (bill.lines.length > 0) {
      await tx.insert(line).values(
        bill.lines.map((l, position) => ({
          id: l.id,
          billId: bill.id,
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
    await tx.insert(caseEvent).values({
      id: crypto.randomUUID(),
      caseId,
      actor: "system",
      type: "bill.parsed",
      summary,
    });
  });
}
