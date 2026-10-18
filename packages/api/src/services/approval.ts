// Approve or cancel a drafted action (ticket A-05). The approval stores the
// hash of the exact text the user saw, so a changed draft can never go out.
import { type Action, approvalRef, sha256Hex } from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { addEvent, getCaseRow, setStatus } from "../repo/cases";
import { checkTransition, getAction } from "./actions";

const APPROVED_SUMMARY: Record<Action["kind"], string> = {
  letter: "You approved the letter",
  itemized_request: "You approved the request",
  call: "You approved the call",
};

export async function approveAction(
  db: Database,
  input: { actionId: string; draftHash: string; consent?: boolean },
): Promise<Action> {
  const action = await getAction(db, input.actionId);
  if ((await sha256Hex(action.draft)) !== input.draftHash) {
    throw new ORPCError("CONFLICT", {
      message: "This draft changed. Please review it again.",
    });
  }
  if (action.kind === "call" && input.consent !== true) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Please confirm the person agreed to the call.",
    });
  }
  const row = await getCaseRow(db, action.caseId);
  const status = checkTransition(
    row?.status ?? "",
    "action.approved",
    "This draft is not waiting for approval.",
  );
  const approvedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(actionTable)
      .set({ approvedAt })
      .where(eq(actionTable.id, action.id));
    await setStatus(tx, action.caseId, status);
    await addEvent(
      tx,
      action.caseId,
      "action.approved",
      APPROVED_SUMMARY[action.kind],
      { actor: "user", artifactRef: approvalRef(action.id, input.draftHash) },
    );
  });
  return { ...action, approvedAt: approvedAt.toISOString() };
}

// Cancelling clears any earlier approval: core's findApproval ignores an
// approval followed by action.cancelled for the same action.
export async function cancelAction(
  db: Database,
  input: { actionId: string },
): Promise<Action> {
  const action = await getAction(db, input.actionId);
  if (action.sentAt) {
    throw new ORPCError("CONFLICT", {
      message: "This was already sent, so it can't be cancelled.",
    });
  }
  const row = await getCaseRow(db, action.caseId);
  const status = checkTransition(
    row?.status ?? "",
    "action.cancelled",
    "This draft is not waiting for approval.",
  );
  await db.transaction(async (tx) => {
    await tx
      .update(actionTable)
      .set({ approvedAt: null })
      .where(eq(actionTable.id, action.id));
    await setStatus(tx, action.caseId, status);
    await addEvent(tx, action.caseId, "action.cancelled", "You cancelled it", {
      actor: "user",
      artifactRef: `action:${action.id}`,
    });
  });
  return { ...action, approvedAt: null };
}
