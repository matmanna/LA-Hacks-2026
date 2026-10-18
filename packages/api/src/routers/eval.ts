import { EVAL_RESULTS } from "../data";
import { publicProcedure } from "../index";
import { EmptyInput } from "../inputs";
import { EvalResults } from "../outputs";

// C's results.json stamps the run as runAt; the contract field is generatedAt.
export function toEvalResults(raw: unknown) {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const parsed = EvalResults.safeParse({
      ...r,
      generatedAt: r.generatedAt ?? r.runAt ?? null,
    });
    if (parsed.success) return parsed.data;
  }
  return { generatedAt: null, metrics: [] };
}

export const evalRouter = {
  // C's data/eval/results.json (bundled), or an empty result until it exists.
  results: publicProcedure
    .input(EmptyInput)
    .output(EvalResults)
    .handler(() => toEvalResults(EVAL_RESULTS)),
};
