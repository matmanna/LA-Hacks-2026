import { ParseResult } from "@betterbill/core";
import { fixtureParseResult } from "../fixtures";
import { publicProcedure } from "../index";
import { ConfirmLinesInput, ParsePhotoInput, ParseTextInput } from "../inputs";
import { ConfirmLinesOutput } from "../outputs";

export const billRouter = {
  // STUB: replaced in B-09
  parseText: publicProcedure
    .input(ParseTextInput)
    .output(ParseResult)
    .handler(({ input }) => fixtureParseResult(input.caseId)),
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
