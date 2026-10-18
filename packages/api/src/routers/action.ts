import { Action } from "@betterbill/core";
import { fixtureAction } from "../fixtures";
import { publicProcedure } from "../index";
import { ActionIdInput, ApproveInput, DraftLetterInput } from "../inputs";
import { DraftLetterResult } from "../outputs";
import { approveAction, cancelAction } from "../services/approval";
import { draftLetter } from "../services/letter-drafter";

const AT = "2026-10-17T23:05:00.000Z";

export const actionRouter = {
  // Becomes protectedProcedure in B-11.
  draftLetter: publicProcedure
    .input(DraftLetterInput)
    .output(DraftLetterResult)
    .handler(({ input, context }) => draftLetter(context.db, input)),
  // Becomes protectedProcedure in B-11.
  approve: publicProcedure
    .input(ApproveInput)
    .output(Action)
    .handler(({ input, context }) =>
      input.cancel
        ? cancelAction(context.db, input)
        : approveAction(context.db, input),
    ),
  // STUB: owned by A. Sends nothing. Becomes protectedProcedure in B-11.
  send: publicProcedure
    .input(ActionIdInput)
    .output(Action)
    .handler(({ input }) => ({
      ...fixtureAction("case-demo"),
      id: input.actionId,
      approvedAt: AT,
      sentAt: AT,
      outcome: "STUB: nothing was sent",
    })),
};
