import { describe, expect, it } from "vitest";

import { bill, line } from "../__fixtures__/golden";
import { detectUnitAnomalies } from "./units";

// Test fixture bound, not a real policy value.
const bound = { code: "36415", maxUnitsPerDay: 1, source: "test fixture" };

describe("detectUnitAnomalies", () => {
  it("flags 3 units of 36415 at $30 each when bound is 1", () => {
    const f = detectUnitAnomalies(
      bill([line({ id: "v1", code: "36415", units: 3, chargeCents: 9000 })]),
      [bound],
    );
    expect(f[0]).toMatchObject({
      id: "units:v1",
      lever: "units",
      tier: "rule",
      amountCents: 6000,
      evidence: { kind: "rule" },
    });
  });

  it("sums units across lines on the same date", () => {
    const f = detectUnitAnomalies(
      bill([
        line({ id: "a", code: "36415", units: 1, chargeCents: 3000 }),
        line({ id: "b", code: "36415", units: 1, chargeCents: 3000 }),
      ]),
      [{ ...bound, sourceUrl: "https://example.org/rule" }],
    );
    expect(f[0]).toMatchObject({ lineIds: ["a", "b"], amountCents: 3000 });
    expect(f[0]?.evidence.sourceUrl).toBe("https://example.org/rule");
  });

  it("ignores codes within the bound, unbounded codes, and uncoded lines", () => {
    expect(
      detectUnitAnomalies(
        bill([
          line({ id: "ok", code: "36415", units: 1 }),
          line({ id: "other", code: "99999", units: 9 }),
          line({ id: "none", code: null, units: 9 }),
        ]),
        [bound],
      ),
    ).toEqual([]);
  });
});
