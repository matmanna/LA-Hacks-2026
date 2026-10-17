import { describe, expect, it } from "vitest";

import {
  Action,
  AuditResult,
  Bill,
  CaseEvent,
  CaseSummary,
  Eob,
  Flag,
  Lever,
  Line,
  ParseResult,
  Tier,
} from "./schemas";

const cbc = {
  id: "l1",
  serviceDate: "2026-09-12",
  description: "CBC W/ DIFFERENTIAL",
  code: "85025",
  codeType: "CPT",
  units: 1,
  chargeCents: 8400,
  source: { page: 1, bbox: null },
  confidence: 0.95,
  userEdited: false,
} as const;

const bill = {
  id: "bill-01",
  hospital: { name: "Sample General (synthetic)", city: null, state: "CA" },
  statementDate: "2026-09-30",
  accountRefMasked: "1234",
  kind: "itemized",
  sourceKind: "text",
  lines: [cbc, { ...cbc, id: "l2" }],
  totals: {
    chargesCents: 16800,
    adjustmentsCents: 0,
    paidCents: 0,
    dueCents: 16800,
  },
} as const;

const savings = {
  confirmedCents: 8400,
  potentialLowCents: 0,
  potentialHighCents: 0,
  assistance: { status: "unknown" },
  method: ["Duplicate: same code, same date, listed twice."],
} as const;

const flag = {
  id: "f1",
  lineIds: ["l1", "l2"],
  lever: "duplicate",
  tier: "confirmed",
  title: "Listed twice on the same date",
  explanation:
    "Listed twice on the same date. Ask billing whether you had two tests.",
  amountCents: 8400,
  evidence: { kind: "arithmetic", detail: "85025 on 2026-09-12 appears 2x" },
  confidence: 0.9,
} as const;

describe("contracts", () => {
  it("parses a valid synthetic bill and round-trips it", () => {
    const parsed = Bill.parse(bill);
    expect(Bill.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it("defaults units to 1", () => {
    const { units: _units, ...noUnits } = cbc;
    expect(Line.parse(noUnits).units).toBe(1);
  });

  it("rejects fractional cents", () => {
    expect(Line.safeParse({ ...cbc, chargeCents: 84.5 }).success).toBe(false);
  });

  it("rejects bbox outside 0..1", () => {
    const bad = { ...cbc, source: { page: 1, bbox: [0, 0, 1.2, 1] } };
    expect(Line.safeParse(bad).success).toBe(false);
  });

  it("rejects a malformed service date", () => {
    expect(Line.safeParse({ ...cbc, serviceDate: "9/12/2026" }).success).toBe(
      false,
    );
  });

  it("rejects a flag title over 60 chars", () => {
    expect(Flag.safeParse(flag).success).toBe(true);
    expect(Flag.safeParse({ ...flag, title: "x".repeat(61) }).success).toBe(
      false,
    );
  });

  it("accepts every lever and tier literal", () => {
    for (const lever of Lever.options) {
      expect(Flag.safeParse({ ...flag, lever }).success).toBe(true);
    }
    for (const tier of Tier.options) {
      expect(Flag.safeParse({ ...flag, tier }).success).toBe(true);
    }
    expect(Lever.options).toHaveLength(6);
    expect(Tier.options).toEqual([
      "confirmed",
      "rule",
      "published",
      "estimate",
    ]);
  });

  it("parses an EOB with and without lines", () => {
    const eob = {
      payer: "Sample Health Plan (synthetic)",
      claimRefMasked: null,
      patientResponsibilityCents: 25000,
    };
    expect(Eob.safeParse(eob).success).toBe(true);
    expect(
      Eob.safeParse({
        ...eob,
        lines: [{ code: "85025", allowedCents: 1100, patientCents: null }],
      }).success,
    ).toBe(true);
  });

  it("requires UTC ISO times on events and actions", () => {
    const event = {
      id: "e1",
      caseId: "c1",
      at: "2026-10-17T23:00:00Z",
      actor: "system",
      type: "audit.run",
      summary: "1 flag",
    };
    expect(CaseEvent.safeParse(event).success).toBe(true);
    expect(CaseEvent.safeParse({ ...event, at: "yesterday" }).success).toBe(
      false,
    );
    const action = {
      id: "a1",
      caseId: "c1",
      kind: "letter",
      draft: "Dear billing office",
      recipient: "billing@example.org",
      approvedAt: null,
      sentAt: null,
      outcome: null,
    };
    expect(Action.safeParse(action).success).toBe(true);
    expect(Action.safeParse({ ...action, kind: "fax" }).success).toBe(false);
  });

  it("parses composite results", () => {
    expect(
      ParseResult.safeParse({
        caseId: "c1",
        bill,
        reconciliation: {
          linesSumCents: 16800,
          statedChargesCents: 16800,
          diffCents: 0,
          ok: true,
        },
        lowConfidenceLineIds: [],
        reader: {
          mode: "step-5-preview",
          model: "step-5-preview",
          latencyMs: 1200,
          cachedAt: null,
        },
        warnings: [],
      }).success,
    ).toBe(true);
    expect(
      AuditResult.safeParse({
        caseId: "c1",
        flags: [flag],
        savings,
        balance: {
          billedCents: 16800,
          fairBalanceCents: 8400,
          fairBalanceLowCents: 8400,
          lessThanBilledCents: 8400,
          isEstimate: false,
        },
        durationMs: 3,
      }).success,
    ).toBe(true);
    expect(
      CaseSummary.safeParse({
        id: "c1",
        status: "audited",
        hospitalName: null,
        createdAt: "2026-10-17T23:00:00.000Z",
        savings: null,
      }).success,
    ).toBe(true);
  });
});
