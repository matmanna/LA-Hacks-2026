import { ParseResult } from "@betterbill/core";
import { fixtureParseResult } from "../fixtures";
import { publicProcedure } from "../index";
import { ConfirmLinesInput, ParsePhotoInput, ParseTextInput } from "../inputs";
import { ConfirmLinesOutput } from "../outputs";
import { readText } from "../reader/parseText";
import { saveParsedBill } from "../repo/bills";

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
  parsePhoto: publicProcedure
    .input(ParsePhotoInput)
    .output(ParseResult)
    .handler(({ input }) => fixtureParseResult(input.caseId)),
  // STUB: replaced in B-10
  confirmLines: publicProcedure
    .input(ConfirmLinesInput)
    .output(ConfirmLinesOutput)
    .handler(({ input }) => ({
      caseId: input.caseId,
      status: "lines_confirmed" as const,
    })),
};
