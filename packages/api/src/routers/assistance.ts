import { Assistance } from "@betterbill/core";
import { ORPCError } from "@orpc/server";

import { publicProcedure } from "../index";
import { AssistanceCheckInput } from "../inputs";
import { loadBill } from "../repo/cases";
import { saveAssistance, screenBill } from "../services/assistance";

export const assistanceRouter = {
  // Runs every check for the case's bill. With an income range it is the
  // patient's answer, so the result (never the income) is saved as an event.
  check: publicProcedure
    .input(AssistanceCheckInput)
    .output(Assistance)
    .handler(async ({ input, context }) => {
      const loaded = await loadBill(context.db, input.caseId);
      if (!loaded) {
        throw new ORPCError("NOT_FOUND", { message: "Add a bill first." });
      }
      const { caseId: _caseId, ...answers } = input;
      const result = screenBill(loaded.bill, answers);
      if (input.annualIncomeCents !== undefined && input.householdSize) {
        await saveAssistance(context.db, input.caseId, result);
      }
      return result;
    }),
};
