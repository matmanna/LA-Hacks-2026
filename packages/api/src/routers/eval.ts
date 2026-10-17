import { publicProcedure } from "../index";
import { EmptyInput } from "../inputs";
import { EvalResults } from "../outputs";

export const evalRouter = {
  // STUB: reads data/eval/results.json once C ships it
  results: publicProcedure
    .input(EmptyInput)
    .output(EvalResults)
    .handler(() => ({ generatedAt: "1970-01-01T00:00:00.000Z", stub: true })),
};
