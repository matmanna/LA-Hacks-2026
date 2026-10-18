// Shared helpers for A's action routes: load an action or an audited case,
// check a status transition with core's state machine, and save a draft.
import {
  type Action,
  approvalRef,
  type Bill,
  type CaseStatus,
  type EventTypeName,
  type Flag,
  nextStatus,
  sha256Hex,
  TransitionError,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import {
  addEvent,
  getCaseRow,
  latestAudit,
  loadBill,
  setStatus,
} from "../repo/cases";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function loadAuditedCase(
  db: Db,
  caseId: string,
): Promise<{ status: string; bill: Bill; flags: Flag[] }> {
  const [row, loaded, audit] = await Promise.all([
    getCaseRow(db, caseId),
    loadBill(db, caseId),
    latestAudit(db, caseId),
  ]);
  if (!row) throw new ORPCError("NOT_FOUND", { message: "Case not found." });
  if (!loaded || !audit) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Check the bill first.",
    });
  }
  return { status: row.status, bill: loaded.bill, flags: audit.flags };
}

// Inserts the action and its action.drafted event. The event's artifactRef
// carries the draft hash that approval and send are checked against.
export async function saveDraft(
  db: Database,
  input: {
    caseId: string;
    kind: Action["kind"];
    draft: string;
    recipient: string;
    status: CaseStatus;
    summary: string;
  },
): Promise<{ action: Action; draftHash: string }> {
  const { caseId, kind, draft, recipient } = input;
  const draftHash = await sha256Hex(draft);
  const action: Action = {
    id: crypto.randomUUID(),
    caseId,
    kind,
    draft,
    recipient,
    approvedAt: null,
    sentAt: null,
    outcome: null,
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(actionTable)
      .values({ id: action.id, caseId, kind, draft, recipient });
    await setStatus(tx, caseId, input.status);
    await addEvent(tx, caseId, "action.drafted", input.summary, {
      actor: "agent",
      artifactRef: approvalRef(action.id, draftHash),
    });
  });
  return { action, draftHash };
}

export async function getAction(db: Db, actionId: string): Promise<Action> {
  const [a] = await db
    .select()
    .from(actionTable)
    .where(eq(actionTable.id, actionId));
  if (!a) throw new ORPCError("NOT_FOUND", { message: "Action not found." });
  return {
    id: a.id,
    caseId: a.caseId,
    kind: a.kind as Action["kind"],
    draft: a.draft,
    recipient: a.recipient,
    approvedAt: a.approvedAt?.toISOString() ?? null,
    sentAt: a.sentAt?.toISOString() ?? null,
    outcome: a.outcome,
  };
}

export function checkTransition(
  current: string,
  type: EventTypeName,
  message: string,
): CaseStatus {
  try {
    return nextStatus(current as CaseStatus, type);
  } catch (error) {
    if (error instanceof TransitionError) {
      throw new ORPCError("CONFLICT", { message });
    }
    throw error;
  }
}
