// Shared helpers for A's action routes: load an action, and check a case
// status transition with core's state machine before writing its event.
import {
  type Action,
  type CaseStatus,
  type EventTypeName,
  nextStatus,
  TransitionError,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

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
