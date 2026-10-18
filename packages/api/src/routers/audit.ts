import {
  AuditResult,
  type Bill,
  balanceSummary,
  computeSavings,
  type Flag,
  runAudit,
} from "@betterbill/core";
import { ORPCError } from "@orpc/server";

import { PRICES, UNIT_BOUNDS } from "../data";
import { publicProcedure } from "../index";
import { CaseIdInput } from "../inputs";
import {
  addEvent,
  latestAudit,
  loadBill,
  loadEob,
  saveFlags,
  setStatus,
} from "../repo/cases";
import { heroStep } from "../telemetry";

// Savings and balance always come from core, never from the UI.
export function auditResult(
  caseId: string,
  bill: Bill,
  flags: Flag[],
  durationMs: number,
): AuditResult {
  const savings = computeSavings(flags, bill, PRICES);
  return {
    caseId,
    flags,
    savings,
    balance: balanceSummary(bill.totals.dueCents, savings),
    durationMs,
  };
}

export const auditRouter = {
  run: publicProcedure
    .input(CaseIdInput)
    .output(AuditResult)
    .handler(({ input, context }) =>
      heroStep(
        "audit",
        { caseId: input.caseId },
        async () => {
          const loaded = await loadBill(context.db, input.caseId);
          if (!loaded?.confirmedAt) {
            throw new ORPCError("PRECONDITION_FAILED", {
              message: "Confirm the bill's lines before checking it.",
            });
          }
          const eob = await loadEob(context.db, input.caseId);
          const t0 = performance.now();
          const { flags } = runAudit({
            bill: loaded.bill,
            eob,
            unitBounds: UNIT_BOUNDS,
            prices: PRICES,
          });
          const durationMs = Math.round(performance.now() - t0);
          const runId = `audit-${crypto.randomUUID()}`;
          await context.db.transaction(async (tx) => {
            await saveFlags(tx, input.caseId, runId, flags);
            await setStatus(tx, input.caseId, "audited");
            await addEvent(
              tx,
              input.caseId,
              "audit.completed",
              `Found ${flags.length} flag${flags.length === 1 ? "" : "s"}`,
              { artifactRef: runId },
            );
          });
          return auditResult(input.caseId, loaded.bill, flags, durationMs);
        },
        (r) => ({
          flagCount: r.flags.length,
          auditMs: r.durationMs,
          ...Object.fromEntries(
            r.flags.map((f) => [`lever_${f.lever}`, true] as const),
          ),
        }),
      ),
    ),

  // Latest audit run, or null. durationMs is 0 (not re-measured).
  get: publicProcedure
    .input(CaseIdInput)
    .output(AuditResult.nullable())
    .handler(async ({ input, context }) => {
      const run = await latestAudit(context.db, input.caseId);
      const loaded = run ? await loadBill(context.db, input.caseId) : null;
      if (!run || !loaded) return null;
      return auditResult(input.caseId, loaded.bill, run.flags, 0);
    }),
};
