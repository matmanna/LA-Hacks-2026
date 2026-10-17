import { describe, expect, it } from "vitest";

import { needsCleanup, parseBillText, reconcile, toIsoDate } from "./text";

const SAMPLE = `HOSPITAL: Westside General Hospital (synthetic) | Los Angeles | CA
STATEMENT DATE: 2026-09-30
ACCOUNT: ****4821
TYPE: itemized
DATE        CODE   TYPE  DESCRIPTION                     UNITS  CHARGE
2026-09-12  85025  CPT   CBC W/ DIFFERENTIAL             1      84.00
2026-09-12  85025  CPT   CBC W/ DIFFERENTIAL             1      84.00
2026-09-12  72148  CPT   MRI LUMBAR SPINE W/O CONTRAST   1      6,900.00
TOTAL CHARGES: 7,068.00
ADJUSTMENTS: 0.00
PAYMENTS: 0.00
AMOUNT DUE: 7,068.00`;

describe("parseBillText", () => {
  it("parses the agreed sample", () => {
    const r = parseBillText(SAMPLE, { idPrefix: "c1" });
    expect(r.unparsedLines).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.bill.hospital).toEqual({
      name: "Westside General Hospital (synthetic)",
      city: "Los Angeles",
      state: "CA",
    });
    expect(r.bill).toMatchObject({
      id: "c1-bill",
      statementDate: "2026-09-30",
      accountRefMasked: "4821",
      kind: "itemized",
      sourceKind: "text",
      totals: {
        chargesCents: 706800,
        adjustmentsCents: 0,
        paidCents: 0,
        dueCents: 706800,
      },
    });
    expect(r.bill.lines.map((l) => [l.id, l.code, l.chargeCents])).toEqual([
      ["c1-l01", "85025", 8400],
      ["c1-l02", "85025", 8400],
      ["c1-l03", "72148", 690000],
    ]);
    expect(r.bill.lines[0]).toMatchObject({
      serviceDate: "2026-09-12",
      codeType: "CPT",
      description: "CBC W/ DIFFERENTIAL",
      units: 1,
      source: { page: 1, bbox: null },
      confidence: 1,
      userEdited: false,
    });
    expect(reconcile(r.bill, r.statedChargesCents).ok).toBe(true);
    expect(needsCleanup(r)).toBe(false);
  });

  it("accepts MM/DD/YYYY dates, '-' codes, and other code types", () => {
    const r = parseBillText(
      "09/12/2026  -  -  ROOM AND BOARD  2  1,500.00\n09/12/2026  0450  rev  ER  1  10.00\n09/12/2026  X1  ZZZ  OTHER  1  1.00",
      { idPrefix: "p" },
    );
    expect(r.bill.lines[0]).toMatchObject({
      serviceDate: "2026-09-12",
      code: null,
      codeType: null,
      units: 2,
      chargeCents: 150000,
    });
    expect(r.bill.lines[1]?.codeType).toBe("REV");
    expect(r.bill.lines[2]?.codeType).toBe("OTHER");
    expect(toIsoDate("2026-01-02")).toBe("2026-01-02");
  });

  it("sends malformed rows to unparsedLines and asks for cleanup", () => {
    const r = parseBillText(
      "2026-09-12  85025  CPT  CBC  one  84.00\n2026-09-12  85025 CPT CBC 1 84.00\nLab work total 12.00",
      { idPrefix: "x" },
    );
    expect(r.bill.lines).toEqual([]);
    expect(r.unparsedLines).toHaveLength(3);
    expect(r.warnings[0]).toContain("3 row(s)");
    expect(needsCleanup(r)).toBe(true);
  });

  it("defaults kind, hospital, and totals when headers are missing", () => {
    const coded = parseBillText("2026-09-12  85025  CPT  CBC  1  84.00", {
      idPrefix: "a",
    });
    expect(coded.bill.kind).toBe("itemized");
    expect(coded.bill.hospital.name).toBe("Unknown hospital");
    expect(coded.warnings).toContain("Hospital name not found");
    expect(coded.statedChargesCents).toBeNull();
    expect(coded.bill.totals).toEqual({
      chargesCents: 8400,
      adjustmentsCents: 0,
      paidCents: 0,
      dueCents: 8400,
    });
    expect(reconcile(coded.bill, coded.statedChargesCents)).toEqual({
      linesSumCents: 8400,
      statedChargesCents: null,
      diffCents: 0,
      ok: true,
    });
    const uncoded = parseBillText(
      "HOSPITAL: X\nTYPE: weird\n2026-09-12  -  -  ROOM  1  5.00\nPAYMENTS: 1.00",
      { idPrefix: "b" },
    );
    expect(uncoded.bill.kind).toBe("summary");
    expect(uncoded.bill.totals.dueCents).toBe(400);
    expect(uncoded.bill.accountRefMasked).toBeNull();
    expect(uncoded.bill.statementDate).toBeNull();
  });

  it("reports a reconciliation mismatch", () => {
    const r = parseBillText(
      SAMPLE.replace("TOTAL CHARGES: 7,068.00", "TOTAL CHARGES: 12,000.00"),
      {
        idPrefix: "c",
      },
    );
    expect(reconcile(r.bill, r.statedChargesCents)).toEqual({
      linesSumCents: 706800,
      statedChargesCents: 1200000,
      diffCents: 493200,
      ok: false,
    });
    expect(reconcile(r.bill).statedChargesCents).toBe(1200000);
  });

  it("cleanup is needed when no rows were recognised at all", () => {
    expect(needsCleanup({ unparsedLines: ["x"], candidateRows: 0 })).toBe(true);
    expect(needsCleanup({ unparsedLines: ["x"], candidateRows: 10 })).toBe(
      false,
    );
  });
});
