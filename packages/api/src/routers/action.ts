import { Action } from "@betterbill/core";
import { accountProcedure, publicProcedure } from "../index";
import { ActionIdInput, ApproveInput, DraftLetterInput } from "../inputs";
import { DraftLetterResult } from "../outputs";
import { approveAction, cancelAction } from "../services/approval";
import { draftCall } from "../services/call";
import { draftLetter } from "../services/letter-drafter";
import { sendAction } from "../services/send";
import { heroStep } from "../telemetry";

export const actionRouter = {
  // Open to everyone: a draft is a preview, nothing is sent.
  draftLetter: publicProcedure
    .input(DraftLetterInput)
    .output(DraftLetterResult)
    .handler(({ input, context }) =>
      heroStep(
        "draft",
        { caseId: input.caseId, kind: input.kind },
        () =>
          input.kind === "call"
            ? draftCall(context.db, input)
            : draftLetter(context.db, {
                caseId: input.caseId,
                kind: input.kind,
              }),
        (r) => ({
          usedFallback: "usedFallback" in r ? Boolean(r.usedFallback) : false,
        }),
      ),
    ),
  // Needs a real account when BB_REQUIRE_ACCOUNT=true (B-11).
  approve: accountProcedure
    .input(ApproveInput)
    .output(Action)
    .handler(({ input, context }) =>
      heroStep(
        "approve",
        { actionId: input.actionId, cancel: Boolean(input.cancel) },
        () =>
          input.cancel
            ? cancelAction(context.db, input)
            : approveAction(context.db, input),
        (a) => ({ caseId: a.caseId, kind: a.kind }),
      ),
    ),
  // Needs a real account when BB_REQUIRE_ACCOUNT=true (B-11).
  send: accountProcedure
    .input(ActionIdInput)
    .output(Action)
    .handler(({ input, context }) =>
      heroStep(
        "send",
        { actionId: input.actionId },
        () => sendAction(context.db, input),
        (a) => ({ caseId: a.caseId, kind: a.kind }),
      ),
    ),
};
