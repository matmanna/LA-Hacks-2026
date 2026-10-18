// Synthetic test builders. Not real hospitals, prices, or policy values.
import type { PublishedPrice } from "../rules/types";
import type { Bill, Eob, Line } from "../schemas";

const HOSPITAL = "Westside General Hospital (synthetic)";

export function line(p: Partial<Line> & { id: string }): Line {
  return {
    serviceDate: "2026-09-12",
    description: "TEST SERVICE",
    code: null,
    codeType: null,
    units: 1,
    chargeCents: 10000,
    source: { page: 1, bbox: null },
    confidence: 0.95,
    userEdited: false,
    ...p,
  };
}

export function bill(
  lines: Line[],
  totals: Partial<Bill["totals"]> = {},
  p: Partial<Bill> = {},
): Bill {
  const sum = lines.reduce((s, l) => s + l.chargeCents, 0);
  return {
    id: "bill-test",
    hospital: { name: HOSPITAL, city: "Los Angeles", state: "CA" },
    statementDate: "2026-09-30",
    accountRefMasked: "0000",
    kind: "itemized",
    sourceKind: "text",
    lines,
    totals: {
      chargesCents: sum,
      adjustmentsCents: 0,
      paidCents: 0,
      dueCents: sum,
      ...totals,
    },
    ...p,
  };
}

export function eob(p: Partial<Eob> = {}): Eob {
  return {
    payer: "Sample Health Plan (synthetic)",
    claimRefMasked: null,
    patientResponsibilityCents: 0,
    ...p,
  };
}

export function price(
  p: Partial<PublishedPrice> & { code: string },
): PublishedPrice {
  return {
    hospitalName: HOSPITAL,
    cashCents: null,
    minNegotiatedCents: null,
    maxNegotiatedCents: null,
    sourceUrl: "https://example.org/prices.json",
    capturedAt: "2026-10-17T20:00:00Z",
    ...p,
  };
}
