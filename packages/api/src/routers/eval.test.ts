import { describe, expect, it } from "vitest";

import { EVAL_RESULTS } from "../data";
import { toEvalResults } from "./eval";

describe("toEvalResults", () => {
  it("uses runAt as generatedAt and keeps the rest", () => {
    const r = toEvalResults({ runAt: "2026-10-18T01:00:00Z", metrics: [1] });
    expect(r).toMatchObject({
      generatedAt: "2026-10-18T01:00:00Z",
      metrics: [1],
    });
  });

  it("prefers generatedAt and falls back when missing or invalid", () => {
    expect(toEvalResults({ generatedAt: "a", runAt: "b" }).generatedAt).toBe(
      "a",
    );
    expect(toEvalResults(null)).toEqual({ generatedAt: null, metrics: [] });
    expect(toEvalResults({ generatedAt: 5 })).toEqual({
      generatedAt: null,
      metrics: [],
    });
  });

  it("returns C's bundled results with a timestamp", () => {
    expect(toEvalResults(EVAL_RESULTS).generatedAt).not.toBeNull();
  });
});
