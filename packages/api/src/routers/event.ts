import { CaseEvent } from "@betterbill/core";
import { z } from "zod";
import { fixtureEvents } from "../fixtures";
import { publicProcedure } from "../index";
import { CaseIdInput } from "../inputs";

export const eventRouter = {
  // STUB: replaced in B-10 (ordered by at)
  list: publicProcedure
    .input(CaseIdInput)
    .output(z.array(CaseEvent))
    .handler(({ input }) => fixtureEvents(input.caseId)),
};
