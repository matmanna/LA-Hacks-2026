import {
  needsCleanup,
  type ParseResult,
  parseBillText,
  readerOutputToBill,
  reconcile,
} from "@betterbill/core";

import { heroStep } from "../telemetry";
import { cleanupText } from "./cleanup";
import { STEPFUN_MODEL } from "./stepfun";

const LOW_CONFIDENCE = 0.8;

// Deterministic first; the model only runs when more than 30% of rows
// failed and the reader mode allows live calls.
async function readTextInner(
  caseId: string,
  text: string,
  cleanup: typeof cleanupText = cleanupText,
): Promise<ParseResult> {
  const t0 = performance.now();
  const parsed = parseBillText(text, { idPrefix: caseId });
  let { bill, statedChargesCents, warnings } = parsed;
  let mode: ParseResult["reader"]["mode"] = "deterministic";
  let model: string | null = null;

  if (needsCleanup(parsed) && process.env.BB_READER_MODE !== "cache_only") {
    const out = await cleanup(text);
    if (out) {
      const r = readerOutputToBill(out, {
        idPrefix: caseId,
        sourceKind: "text",
      });
      ({ bill, statedChargesCents, warnings } = r);
      mode = "model_cleanup";
      model = STEPFUN_MODEL;
    } else {
      warnings = [...warnings, "Showing only the rows we could read."];
    }
  }

  return {
    caseId,
    bill,
    reconciliation: reconcile(bill, statedChargesCents),
    lowConfidenceLineIds: bill.lines
      .filter((l) => l.confidence < LOW_CONFIDENCE)
      .map((l) => l.id),
    reader: {
      mode,
      model,
      latencyMs: Math.round(performance.now() - t0),
      cachedAt: null,
    },
    warnings,
  };
}

export const readText = (
  caseId: string,
  text: string,
  cleanup: typeof cleanupText = cleanupText,
): Promise<ParseResult> =>
  heroStep(
    "parse",
    { caseId, source: "text" },
    () => readTextInner(caseId, text, cleanup),
    (r) => ({
      lineCount: r.bill.lines.length,
      readerMode: r.reader.mode,
      readerMs: r.reader.latencyMs,
    }),
  );
