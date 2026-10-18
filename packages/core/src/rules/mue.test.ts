import { describe, expect, it } from "vitest";

import { unitBoundsFromMue } from "./mue";

describe("unitBoundsFromMue", () => {
  it("maps entries with their source", () => {
    expect(
      unitBoundsFromMue({
        table: "Test MUE table",
        sourcePage: "https://example.org/mue",
        effectiveDate: "2026-10-01",
        entries: [{ code: "36415", maxUnitsPerDay: 2, mai: "x" }],
      }),
    ).toEqual([
      {
        code: "36415",
        maxUnitsPerDay: 2,
        source: "Test MUE table, effective 2026-10-01",
        sourceUrl: "https://example.org/mue",
      },
    ]);
  });

  it("rejects a malformed table", () => {
    expect(() => unitBoundsFromMue({ entries: "no" })).toThrow();
  });
});
