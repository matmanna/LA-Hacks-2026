import { describe, expect, it } from "vitest";

import { type LabCapture, labPrices } from "./labs";

const lab = (
  key: string,
  name: string,
  prices: LabCapture["prices"],
): LabCapture => ({
  labKey: key,
  labName: name,
  capturedAt: "2026-10-18T16:32:25Z",
  sources: [
    { kind: "product_page", url: `https://${key}.example/cbc`, sha256: "abc" },
  ],
  prices,
});

const labs = [
  lab("q", "Quest Diagnostics (questhealth.com)", [
    {
      code: "85025",
      productName: "CBC",
      cashCents: 3500,
      listedPriceCents: 2900,
      addedFees: [{ name: "Physician Service Fee", cents: 600 }],
      sourceUrl: "https://q.example/cbc",
      quote: "$29.00 + $6.00 Physician Service Fee",
    },
  ]),
  lab("l", "Labcorp OnDemand", [
    {
      code: "85025",
      productName: "CBC",
      cashCents: 2900,
      listedPriceCents: 2900,
      addedFees: [],
      includes: "The price includes the ordering provider's fee.",
      sourceUrl: "https://l.example/cbc",
      quote: "$29",
    },
    {
      code: "80053",
      productName: "CMP",
      cashCents: null,
      sourceUrl: "https://l.example/cmp",
      quote: "",
    },
  ]),
];

describe("labPrices", () => {
  it("lists labs lowest first with what each price is made of", () => {
    expect(labPrices({ labs, code: "85025" })).toEqual([
      {
        labKey: "l",
        labName: "Labcorp OnDemand",
        productName: "CBC",
        cashCents: 2900,
        detail: "The price includes the ordering provider's fee.",
        quote: "$29",
        sourceUrl: "https://l.example/cbc",
        sourceSha256: "abc",
        capturedAt: "2026-10-18T16:32:25Z",
      },
      {
        labKey: "q",
        labName: "Quest Diagnostics",
        productName: "CBC",
        cashCents: 3500,
        detail: "$29 test + $6 Physician Service Fee",
        quote: "$29.00 + $6.00 Physician Service Fee",
        sourceUrl: "https://q.example/cbc",
        sourceSha256: "abc",
        capturedAt: "2026-10-18T16:32:25Z",
      },
    ]);
  });

  it("skips labs without a price for the service", () => {
    expect(labPrices({ labs, code: "80053" })).toEqual([]);
    expect(labPrices({ labs, code: "72148" })).toEqual([]);
  });
});
