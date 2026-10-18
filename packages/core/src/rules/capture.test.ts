import { describe, expect, it } from "vitest";

import { pricesFromCapture } from "./capture";

const capture = {
  hospitalName: "Test Hospital (synthetic)",
  capturedAt: "2026-10-17T23:00:45Z",
  sources: [
    { kind: "price_page", url: "https://example.org/page" },
    { kind: "mrf", url: "https://example.org/mrf.json" },
  ],
  prices: [
    {
      code: "1",
      setting: "outpatient",
      discountedCashCents: 500,
      minNegotiatedCents: 1,
    },
    { code: "1", setting: "inpatient", discountedCashCents: 900 },
  ],
};

describe("pricesFromCapture", () => {
  it("keeps the setting's cash price and cites the machine-readable file", () => {
    expect(pricesFromCapture(capture)).toEqual([
      {
        hospitalName: "Test Hospital (synthetic)",
        code: "1",
        cashCents: 500,
        minNegotiatedCents: null,
        maxNegotiatedCents: null,
        sourceUrl: "https://example.org/mrf.json",
        capturedAt: "2026-10-17T23:00:45Z",
      },
    ]);
    expect(pricesFromCapture(capture, "inpatient")[0]?.cashCents).toBe(900);
  });

  it("falls back to the first source and rejects bad captures", () => {
    const one = {
      ...capture,
      sources: [{ kind: "page", url: "https://x.test" }],
    };
    expect(pricesFromCapture(one)[0]?.sourceUrl).toBe("https://x.test");
    expect(pricesFromCapture({ ...capture, sources: [] })[0]?.sourceUrl).toBe(
      "",
    );
    expect(() => pricesFromCapture({})).toThrow();
  });
});
