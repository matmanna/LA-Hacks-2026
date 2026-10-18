// Send an approved letter to the test inbox (ticket A-06). Nothing leaves
// without an action.approved event whose hash matches the stored draft.
import {
  type Action,
  approvalRef,
  assertApproved,
  sha256Hex,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { action as actionTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { addEvent, getCaseRow, listEvents, setStatus } from "../repo/cases";
import { checkTransition, getAction } from "./actions";
import { isAllowlisted, sendEmail } from "./email";

const DEMO_NOTE =
  "This is a demo message from BetterBill sent to a test inbox. It uses a synthetic bill.";

export function emailFromDraft(draft: string): {
  subject: string;
  text: string;
} {
  const subjectLine = draft
    .split("\n")
    .find((line) => line.startsWith("Subject: "));
  const subject = subjectLine?.slice("Subject: ".length).trim() || "Your bill";
  return {
    subject: `[BetterBill demo] ${subject}`,
    text: `${DEMO_NOTE}\n\n${draft}`,
  };
}

export async function sendAction(
  db: Database,
  input: { actionId: string },
  send: typeof sendEmail = sendEmail,
): Promise<Action> {
  const action = await getAction(db, input.actionId);
  if (action.kind === "call") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Use call.start for calls.",
    });
  }
  if (action.sentAt) return action;

  const events = await listEvents(db, action.caseId);
  const hash = await sha256Hex(action.draft);
  try {
    assertApproved(events, action.id, hash);
  } catch {
    throw new ORPCError("FORBIDDEN", {
      message: "Please approve the letter first.",
    });
  }
  if (!isAllowlisted(action.recipient)) {
    throw new ORPCError("FORBIDDEN", {
      message: "This demo only sends to the test inbox.",
    });
  }
  const row = await getCaseRow(db, action.caseId);
  const status = checkTransition(
    row?.status ?? "",
    "action.sent",
    "This letter is not ready to send.",
  );

  let sent: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sent = await send({
      to: action.recipient,
      ...emailFromDraft(action.draft),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    await addEvent(
      db,
      action.caseId,
      "action.send_failed",
      `Letter not sent: ${reason.slice(0, 120)}`,
    );
    throw new ORPCError("BAD_GATEWAY", {
      message: "We could not send it. Nothing was sent. Try again.",
    });
  }

  const sentAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(actionTable)
      .set({ sentAt })
      .where(eq(actionTable.id, action.id));
    await setStatus(tx, action.caseId, status);
    await addEvent(
      tx,
      action.caseId,
      "action.sent",
      `Letter sent to the test inbox (${sent.provider} ${sent.messageId})`,
      { artifactRef: approvalRef(action.id, hash) },
    );
  });
  return { ...action, sentAt: sentAt.toISOString() };
}
