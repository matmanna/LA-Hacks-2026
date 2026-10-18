import { CaseSummary, computeSavings } from "@betterbill/core";
import { caseTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { PRICES, SAMPLES } from "../data";
import { publicProcedure } from "../index";
import { CaseCreateInput, CaseIdInput, EmptyInput } from "../inputs";
import { CaseDetail } from "../outputs";
import { saveParsedBill } from "../repo/bills";
import {
  addEvent,
  getCaseRow,
  latestAudit,
  listActions,
  loadBill,
  loadEob,
  saveEob,
  toSummary,
} from "../repo/cases";
import { auditResult } from "./audit";

export const caseRouter = {
  // New case. With `sample` (e.g. "SB-01") it starts from a synthetic bill.
  create: publicProcedure
    .input(CaseCreateInput)
    .output(CaseSummary)
    .handler(async ({ input, context }) => {
      const sample = input.sample
        ? SAMPLES.find((s) => s.id === input.sample)
        : undefined;
      if (input.sample && !sample) {
        throw new ORPCError("NOT_FOUND", { message: "Unknown sample bill." });
      }
      const caseId = crypto.randomUUID();
      await context.db.insert(caseTable).values({
        id: caseId,
        status: "new",
        userId: context.session?.user.id ?? null,
        hospitalName: sample?.bill.hospital.name ?? null,
      });
      await addEvent(context.db, caseId, "case.created", "Case created");
      if (sample) {
        const lines = sample.bill.lines.map((l, i) => ({
          ...l,
          id: `${caseId}-l${String(i + 1).padStart(2, "0")}`,
        }));
        await saveParsedBill(
          context.db,
          caseId,
          { ...sample.bill, id: `${caseId}-bill`, lines },
          `Loaded sample bill ${sample.id} (${lines.length} lines)`,
        );
        await saveEob(context.db, caseId, sample.eob);
      }
      const row = await getCaseRow(context.db, caseId);
      if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
      return toSummary(row, null);
    }),

  get: publicProcedure
    .input(CaseIdInput)
    .output(CaseDetail)
    .handler(async ({ input, context }) => {
      const row = await getCaseRow(context.db, input.caseId);
      if (!row)
        throw new ORPCError("NOT_FOUND", { message: "Case not found." });
      const loaded = await loadBill(context.db, input.caseId);
      const eob = await loadEob(context.db, input.caseId);
      const run = await latestAudit(context.db, input.caseId);
      const audit =
        run && loaded
          ? auditResult(input.caseId, loaded.bill, run.flags, 0)
          : null;
      return {
        case: toSummary(row, audit?.savings ?? null),
        bill: loaded?.bill ?? null,
        eob,
        audit,
        actions: await listActions(context.db, input.caseId),
      };
    }),

  // The session user's cases (B-11 makes this auth-only). Empty without one.
  list: publicProcedure
    .input(EmptyInput)
    .output(z.array(CaseSummary))
    .handler(async ({ context }) => {
      const userId = context.session?.user.id;
      if (!userId) return [];
      const rows = await context.db
        .select()
        .from(caseTable)
        .where(eq(caseTable.userId, userId))
        .orderBy(desc(caseTable.createdAt));
      return Promise.all(
        rows.map(async (r) => {
          const run = await latestAudit(context.db, r.id);
          const loaded = run ? await loadBill(context.db, r.id) : null;
          return toSummary(
            r,
            run && loaded
              ? computeSavings(run.flags, loaded.bill, PRICES)
              : null,
          );
        }),
      );
    }),
};
