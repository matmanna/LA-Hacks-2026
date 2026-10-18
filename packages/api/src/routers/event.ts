import { CaseEvent } from "@betterbill/core";
import { z } from "zod";

import { publicProcedure } from "../index";
import { CaseIdInput } from "../inputs";
import { listEvents } from "../repo/cases";

export const eventRouter = {
  // Append-only case history, oldest first.
  list: publicProcedure
    .input(CaseIdInput)
    .output(z.array(CaseEvent))
    .handler(({ input, context }) => listEvents(context.db, input.caseId)),
};
