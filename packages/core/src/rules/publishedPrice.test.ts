import { describe, expect, it } from "vitest";

import { bill, line, price } from "../__fixtures__/golden";
import { detectPublishedPrice } from "./publishedPrice";

describe("detectPublishedPrice", () => {
  // Fixture price, not a real hospital value.
  it("flags MRI 72148 billed $6,900 vs fixture cash $4,800", () => {
    const f = detectPublishedPrice(
      bill([line({ id: "m1", code: "72148", chargeCents: 690000 })]),
      [price({ code: "72148", cashCents: 480000 })],
    );
    expect(f[0]).toMatchObject({
      lever: "published_price",
      tier: "published",
      amountCents: 210000,
      evidence: {
        kind: "price_file",
        sourceUrl: "https://example.org/prices.json",
        capturedAt: "2026-10-17T20:00:00Z",
      },
    });
  });

  it("matches hospital names case-insensitively and multiplies by units", () => {
    const f = detectPublishedPrice(
      bill([line({ id: "x", code: "J1885", units: 2, chargeCents: 5000 })]),
      [
        price({
          code: "J1885",
          cashCents: 1000,
          hospitalName: "  WESTSIDE general hospital (synthetic) ",
        }),
      ],
    );
    expect(f[0]?.amountCents).toBe(3000);
  });

  it("skips null cash, cheaper charges, other hospitals, uncoded lines", () => {
    expect(
      detectPublishedPrice(
        bill([
          line({ id: "a", code: "1", chargeCents: 500 }),
          line({ id: "b", code: "2", chargeCents: 500 }),
          line({ id: "c", code: "3", chargeCents: 500 }),
          line({ id: "d", code: null, chargeCents: 500 }),
        ]),
        [
          price({ code: "1", cashCents: null, minNegotiatedCents: 1 }),
          price({ code: "2", cashCents: 900 }),
          price({ code: "3", cashCents: 1, hospitalName: "Other (synthetic)" }),
        ],
      ),
    ).toEqual([]);
  });
});
