// Query helpers for cases, bills, audits and events. No business logic.
import type {
  Action,
  Bill,
  CaseEvent,
  CaseStatus,
  CaseSummary,
  Eob,
  Flag,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import {
  action as actionTable,
  bill as billTable,
  caseEvent,
  caseTable,
  eob as eobTable,
  flag as flagTable,
  line as lineTable,
} from "@betterbill/db/schema/index";
import { and, asc, desc, eq } from "drizzle-orm";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export async function addEvent(
  db: Db,
  caseId: string,
  type: string,
  summary: string,
  opts: { actor?: CaseEvent["actor"]; artifactRef?: string } = {},
): Promise<void> {
  await db.insert(caseEvent).values({
    id: crypto.randomUUID(),
    caseId,
    actor: opts.actor ?? "system",
    type,
    summary,
    artifactRef: opts.artifactRef ?? null,
  });
}

export async function setStatus(db: Db, caseId: string, status: CaseStatus) {
  await db.update(caseTable).set({ status }).where(eq(caseTable.id, caseId));
}

export async function getCaseRow(db: Db, caseId: string) {
  const [row] = await db
    .select()
    .from(caseTable)
    .where(eq(caseTable.id, caseId));
  return row ?? null;
}

export async function loadBill(
  db: Db,
  caseId: string,
): Promise<{ bill: Bill; confirmedAt: Date | null } | null> {
  const [b] = await db
    .select()
    .from(billTable)
    .where(eq(billTable.caseId, caseId));
  if (!b) return null;
  const rows = await db
    .select()
    .from(lineTable)
    .where(eq(lineTable.billId, b.id))
    .orderBy(asc(lineTable.position));
  return {
    confirmedAt: b.confirmedAt,
    bill: {
      id: b.id,
      hospital: {
        name: b.hospitalName,
        city: b.hospitalCity,
        state: b.hospitalState,
      },
      statementDate: b.statementDate,
      accountRefMasked: b.accountRefMasked,
      kind: b.kind as Bill["kind"],
      sourceKind: b.sourceKind as Bill["sourceKind"],
      lines: rows.map((l) => ({
        id: l.id,
        serviceDate: l.serviceDate,
        description: l.description,
        code: l.code,
        codeType: l.codeType as Bill["lines"][number]["codeType"],
        units: l.units,
        chargeCents: l.chargeCents,
        source: { page: l.sourcePage, bbox: l.bbox ?? null },
        confidence: l.confidence,
        userEdited: l.userEdited,
      })),
      totals: {
        chargesCents: b.chargesCents,
        adjustmentsCents: b.adjustmentsCents,
        paidCents: b.paidCents,
        dueCents: b.dueCents,
      },
    },
  };
}

export async function loadEob(db: Db, caseId: string): Promise<Eob | null> {
  const [e] = await db
    .select()
    .from(eobTable)
    .where(eq(eobTable.caseId, caseId));
  if (!e) return null;
  return {
    payer: e.payer,
    claimRefMasked: e.claimRefMasked,
    patientResponsibilityCents: e.patientResponsibilityCents,
    ...(e.lines ? { lines: e.lines } : {}),
  };
}

export async function saveEob(db: Db, caseId: string, eob: Eob | null) {
  await db.delete(eobTable).where(eq(eobTable.caseId, caseId));
  if (!eob) return;
  await db.insert(eobTable).values({
    id: `${caseId}-eob`,
    caseId,
    payer: eob.payer,
    claimRefMasked: eob.claimRefMasked,
    patientResponsibilityCents: eob.patientResponsibilityCents,
    lines: eob.lines ?? null,
  });
}

// Replaces the bill's lines with the confirmed ones and stamps confirmed_at.
export async function confirmBillLines(
  db: Db,
  billId: string,
  lines: Bill["lines"],
) {
  await db.delete(lineTable).where(eq(lineTable.billId, billId));
  if (lines.length > 0) {
    await db.insert(lineTable).values(
      lines.map((l, position) => ({
        id: l.id,
        billId,
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
  await db
    .update(billTable)
    .set({ confirmedAt: new Date() })
    .where(eq(billTable.id, billId));
}

export async function saveFlags(
  db: Db,
  caseId: string,
  auditRunId: string,
  flags: Flag[],
) {
  if (flags.length === 0) return;
  await db.insert(flagTable).values(
    flags.map((f) => ({
      id: `${auditRunId}:${f.id}`,
      caseId,
      auditRunId,
      lineIds: f.lineIds,
      lever: f.lever,
      tier: f.tier,
      title: f.title,
      explanation: f.explanation,
      amountCents: f.amountCents,
      evidence: f.evidence,
      confidence: f.confidence,
    })),
  );
}

// The latest audit run is recorded on its audit.completed event.
export async function latestAudit(
  db: Db,
  caseId: string,
): Promise<{ runId: string; flags: Flag[] } | null> {
  const [ev] = await db
    .select()
    .from(caseEvent)
    .where(
      and(eq(caseEvent.caseId, caseId), eq(caseEvent.type, "audit.completed")),
    )
    .orderBy(desc(caseEvent.at))
    .limit(1);
  if (!ev?.artifactRef) return null;
  const rows = await db
    .select()
    .from(flagTable)
    .where(eq(flagTable.auditRunId, ev.artifactRef));
  return {
    runId: ev.artifactRef,
    flags: rows
      .map((f) => ({
        id: f.id.slice(ev.artifactRef?.length ?? 0).replace(/^:/, ""),
        lineIds: f.lineIds,
        lever: f.lever as Flag["lever"],
        tier: f.tier as Flag["tier"],
        title: f.title,
        explanation: f.explanation,
        amountCents: f.amountCents,
        evidence: f.evidence,
        confidence: f.confidence,
      }))
      .sort(
        (a, b) => b.amountCents - a.amountCents || a.id.localeCompare(b.id),
      ),
  };
}

export async function listEvents(db: Db, caseId: string): Promise<CaseEvent[]> {
  const rows = await db
    .select()
    .from(caseEvent)
    .where(eq(caseEvent.caseId, caseId))
    .orderBy(asc(caseEvent.at));
  return rows.map((e) => ({
    id: e.id,
    caseId: e.caseId,
    at: e.at.toISOString(),
    actor: e.actor as CaseEvent["actor"],
    type: e.type,
    summary: e.summary,
    ...(e.artifactRef ? { artifactRef: e.artifactRef } : {}),
  }));
}

export async function listActions(db: Db, caseId: string): Promise<Action[]> {
  const rows = await db
    .select()
    .from(actionTable)
    .where(eq(actionTable.caseId, caseId));
  return rows.map((a) => ({
    id: a.id,
    caseId: a.caseId,
    kind: a.kind as Action["kind"],
    draft: a.draft,
    recipient: a.recipient,
    approvedAt: a.approvedAt?.toISOString() ?? null,
    sentAt: a.sentAt?.toISOString() ?? null,
    outcome: a.outcome,
  }));
}

export function toSummary(
  row: NonNullable<Awaited<ReturnType<typeof getCaseRow>>>,
  savings: CaseSummary["savings"],
): CaseSummary {
  return {
    id: row.id,
    status: row.status as CaseStatus,
    hospitalName: row.hospitalName,
    createdAt: row.createdAt.toISOString(),
    savings,
  };
}
