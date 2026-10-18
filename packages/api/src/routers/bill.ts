import { type Line, ParseResult } from "@betterbill/core";
import { ORPCError } from "@orpc/server";
import { PHOTO_CACHE } from "../data";
import { publicProcedure } from "../index";
import { ConfirmLinesInput, ParsePhotoInput, ParseTextInput } from "../inputs";
import { ConfirmLinesOutput } from "../outputs";
import { PhotoReadError } from "../reader/parsePhoto";
import { type ReaderMode, readPhotoWithCache } from "../reader/photoCache";

const readerMode = (): ReaderMode => {
  const m = process.env.BB_READER_MODE;
  return m === "cache_first" || m === "cache_only" ? m : "live";
};

import { readText } from "../reader/parseText";
import { saveParsedBill } from "../repo/bills";
import {
  addEvent,
  confirmBillLines,
  loadBill,
  saveEob,
  setStatus,
} from "../repo/cases";

const sameContent = (a: Line, b: Line) =>
  a.serviceDate === b.serviceDate &&
  a.description === b.description &&
  a.code === b.code &&
  a.codeType === b.codeType &&
  a.units === b.units &&
  a.chargeCents === b.chargeCents;

export const billRouter = {
  // B-09. eobText is read in B-14.
  parseText: publicProcedure
    .input(ParseTextInput)
    .output(ParseResult)
    .handler(async ({ input, context }) => {
      const result = await readText(input.caseId, input.text);
      const n = result.bill.lines.length;
      await saveParsedBill(
        context.db,
        input.caseId,
        result.bill,
        `Read ${n} line${n === 1 ? "" : "s"} from text (${result.reader.mode})`,
      );
      return result;
    }),
  // STUB: replaced in B-13 (step-5-preview)
  // B-13: StepFun step-5-preview reads the photo; core converts and checks.
  parsePhoto: publicProcedure
    .input(ParsePhotoInput)
    .output(ParseResult)
    .handler(async ({ input, context }) => {
      let result: ParseResult;
      try {
        result = await readPhotoWithCache(
          input.caseId,
          input.pages,
          PHOTO_CACHE,
          readerMode(),
        );
      } catch (e) {
        if (e instanceof PhotoReadError) {
          throw new ORPCError("UNPROCESSABLE_CONTENT", { message: e.message });
        }
        throw e;
      }
      const n = result.bill.lines.length;
      await saveParsedBill(
        context.db,
        input.caseId,
        result.bill,
        `Read ${n} line${n === 1 ? "" : "s"} from ${input.pages.length} photo${input.pages.length === 1 ? "" : "s"} (${result.reader.mode === "cache" ? `saved reading from ${result.reader.cachedAt}` : `step-5-preview, ${result.reader.latencyMs} ms`})`,
      );
      return result;
    }),
  // Saves the lines the user confirmed. Lines that differ from what was
  // read are marked userEdited. Ids are kept unless they belong elsewhere.
  confirmLines: publicProcedure
    .input(ConfirmLinesInput)
    .output(ConfirmLinesOutput)
    .handler(async ({ input, context }) => {
      const loaded = await loadBill(context.db, input.caseId);
      if (!loaded) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Add a bill before confirming lines.",
        });
      }
      const before = new Map(loaded.bill.lines.map((l) => [l.id, l]));
      const prefix = `${input.caseId}-`;
      let edited = 0;
      const lines = input.lines.map((l, i) => {
        const was = before.get(l.id);
        const changed = !was || !sameContent(was, l);
        if (changed) edited++;
        return {
          ...l,
          id:
            l.id.startsWith(prefix) || before.has(l.id)
              ? l.id
              : `${prefix}u${i + 1}`,
          userEdited: l.userEdited || changed,
        };
      });
      await context.db.transaction(async (tx) => {
        await confirmBillLines(tx, loaded.bill.id, lines);
        if (input.eob !== undefined) await saveEob(tx, input.caseId, input.eob);
        await setStatus(tx, input.caseId, "lines_confirmed");
        await addEvent(
          tx,
          input.caseId,
          "bill.confirmed",
          `Confirmed ${lines.length} lines (${edited} edited)`,
          { actor: "user" },
        );
      });
      return { caseId: input.caseId, status: "lines_confirmed" as const };
    }),
};
