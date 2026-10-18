import { ORPCError } from "@orpc/server";

import { publicProcedure } from "../index";
import { CaseIdInput } from "../inputs";
import { LookupStatus } from "../outputs";
import { loadBill } from "../repo/cases";
import { browserUseKey } from "../services/browser-use";
import { type LookupDeps, lookupStatus, startLookup } from "../services/lookup";

const deps = (): LookupDeps => ({ key: browserUseKey(), fetch });

async function billFor(db: Parameters<typeof loadBill>[0], caseId: string) {
  const loaded = await loadBill(db, caseId);
  if (!loaded) {
    throw new ORPCError("NOT_FOUND", { message: "Add a bill first." });
  }
  return loaded.bill;
}

export const hospitalRouter = {
  // Starts the background lookup of the hospital's assistance policy (once
  // per case). "on_file" when we already have it, "unavailable" without a key.
  lookup: publicProcedure
    .input(CaseIdInput)
    .output(LookupStatus)
    .handler(async ({ input, context }) =>
      startLookup(
        context.db,
        input.caseId,
        await billFor(context.db, input.caseId),
        deps(),
      ),
    ),

  // Where the lookup stands: steps so far, and the policy when it's done.
  lookupStatus: publicProcedure
    .input(CaseIdInput)
    .output(LookupStatus)
    .handler(async ({ input, context }) =>
      lookupStatus(
        context.db,
        input.caseId,
        await billFor(context.db, input.caseId),
        deps(),
      ),
    ),
};
