import { describe, expect, it } from "vitest";

import { Bill } from "../schemas";
import { ReaderOutput, readerOutputToBill, toBbox } from "./readerOutput";

const out = ReaderOutput.parse({
  hospital: {
    name: " Westside General (synthetic) ",
    city: "Los Angeles",
    state: "CA",
  },
  statementDate: "09/30/2026",
  kind: "Itemized",
  lines: [
    {
      serviceDate: "09/12/2026",
      description: " CBC ",
      code: "85025",
      codeType: "cpt",
      units: null,
      charge: "$84.00",
      bbox: [0.1, 0.2, 0.9, 0.25],
      confidence: 0.92,
      page: 2,
    },
    {
      serviceDate: "sometime",
      description: "MYSTERY",
      code: " ",
      codeType: "weird",
      units: 0,
      charge: "1,200.50",
      bbox: [0.5, 0.5, 0.4, 0.6],
    },
    {
      serviceDate: null,
      description: "BAD",
      code: null,
      codeType: null,
      units: 1,
      charge: "n/a",
    },
  ],
  totals: { charges: "1,284.50", adjustments: "0.00", paid: "100.00" },
});

describe("readerOutputToBill", () => {
  const { bill, statedChargesCents, warnings } = readerOutputToBill(out, {
    idPrefix: "c9",
    sourceKind: "photo",
  });

  it("produces a valid contract Bill", () => {
    expect(Bill.safeParse(bill).success).toBe(true);
    expect(bill).toMatchObject({
      id: "c9-bill",
      hospital: {
        name: "Westside General (synthetic)",
        city: "Los Angeles",
        state: "CA",
      },
      statementDate: "2026-09-30",
      kind: "itemized",
      sourceKind: "photo",
      totals: {
        chargesCents: 128450,
        adjustmentsCents: 0,
        paidCents: 10000,
        dueCents: 118450,
      },
    });
    expect(statedChargesCents).toBe(128450);
  });

  it("converts each field", () => {
    expect(bill.lines[0]).toMatchObject({
      id: "c9-l01",
      serviceDate: "2026-09-12",
      description: "CBC",
      code: "85025",
      codeType: "CPT",
      units: 1,
      chargeCents: 8400,
      source: { page: 2, bbox: [0.1, 0.2, 0.9, 0.25] },
      confidence: 0.92,
    });
    expect(bill.lines[1]).toMatchObject({
      serviceDate: null,
      code: null,
      codeType: "OTHER",
      units: 1,
      chargeCents: 120050,
      source: { page: 1, bbox: null },
      confidence: 0.5,
    });
  });

  it("skips unreadable charges with a warning", () => {
    expect(bill.lines).toHaveLength(2);
    expect(warnings[0]).toContain("n/a");
  });

  it("defaults when the model returns almost nothing", () => {
    const r = readerOutputToBill(
      {
        lines: [
          {
            serviceDate: null,
            description: "X",
            code: null,
            codeType: null,
            units: 2,
            charge: "5.00",
          },
        ],
      },
      { idPrefix: "e", sourceKind: "text" },
    );
    expect(r.bill).toMatchObject({
      hospital: { name: "Unknown hospital", city: null, state: null },
      statementDate: null,
      kind: "summary",
      totals: { chargesCents: 500, dueCents: 500 },
    });
    expect(r.statedChargesCents).toBeNull();
    expect(r.bill.lines[0]?.codeType).toBeNull();
  });
});

describe("toBbox", () => {
  it("clamps and rejects inverted boxes", () => {
    expect(toBbox([-1, 0, 2, 1])).toEqual([0, 0, 1, 1]);
    expect(toBbox([0.5, 0.5, 0.5, 0.9])).toBeNull();
    expect(toBbox(null)).toBeNull();
    expect(toBbox([1, 2])).toBeNull();
  });
});
