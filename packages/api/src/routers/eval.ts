import { EVAL_RESULTS } from "../data";
import { publicProcedure } from "../index";
import { EmptyInput } from "../inputs";
import { EvalResults } from "../outputs";

export const evalRouter = {
  // C's data/eval/results.json (bundled), or an empty result until it exists.
  results: publicProcedure
    .input(EmptyInput)
    .output(EvalResults)
    .handler(() => {
      const parsed = EvalResults.safeParse(EVAL_RESULTS);
      return parsed.success ? parsed.data : { generatedAt: null, metrics: [] };
    }),
};
