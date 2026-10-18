import { Action } from "@betterbill/core";
import { fixtureAction } from "../fixtures";
import { publicProcedure } from "../index";
import { ActionIdInput, DraftLetterInput } from "../inputs";
import { DraftLetterResult } from "../outputs";
import { draftLetter } from "../services/letter-drafter";

const AT = "2026-10-17T23:05:00.000Z";

export const actionRouter = {
  // Becomes protectedProcedure in B-11.
  draftLetter: publicProcedure
    .input(DraftLetterInput)
    .output(DraftLetterResult)
    .handler(({ input, context }) => draftLetter(context.db, input)),
  // STUB: owned by A. Becomes protectedProcedure in B-11.
  approve: publicProcedure
    .input(ActionIdInput)
    .output(Action)
    .handler(({ input }) => ({
      ...fixtureAction("case-demo"),
      id: input.actionId,
      approvedAt: AT,
    })),
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
