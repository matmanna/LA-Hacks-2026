import { CaseSummary } from "@betterbill/core";
import { z } from "zod";
import {
  fixtureAction,
  fixtureAudit,
  fixtureCaseSummary,
  fixtureParseResult,
} from "../fixtures";
import { publicProcedure } from "../index";
import { CaseCreateInput, CaseIdInput, EmptyInput } from "../inputs";
import { CaseDetail } from "../outputs";

export const caseRouter = {
  // STUB: replaced in B-10
  create: publicProcedure
    .input(CaseCreateInput)
    .output(CaseSummary)
    .handler(() => ({ ...fixtureCaseSummary(), status: "new" as const })),
  // STUB: replaced in B-10
  get: publicProcedure
    .input(CaseIdInput)
    .output(CaseDetail)
    .handler(({ input }) => ({
      case: fixtureCaseSummary(input.caseId),
      bill: fixtureParseResult(input.caseId).bill,
      eob: null,
      audit: fixtureAudit(input.caseId),
      actions: [fixtureAction(input.caseId)],
    })),
  // STUB: replaced in B-10 (session user's cases)
  list: publicProcedure
    .input(EmptyInput)
    .output(z.array(CaseSummary))
    .handler(() => [fixtureCaseSummary()]),
};
