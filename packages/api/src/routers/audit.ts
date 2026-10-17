import { AuditResult } from "@betterbill/core";
import { fixtureAudit } from "../fixtures";
import { publicProcedure } from "../index";
import { CaseIdInput } from "../inputs";

export const auditRouter = {
  // STUB: replaced in B-10 (rules engine from B-08)
  run: publicProcedure
    .input(CaseIdInput)
    .output(AuditResult)
    .handler(({ input }) => fixtureAudit(input.caseId)),
  // STUB: replaced in B-10. Includes balance: BalanceSummary.
  get: publicProcedure
    .input(CaseIdInput)
    .output(AuditResult.nullable())
    .handler(({ input }) => fixtureAudit(input.caseId)),
};
