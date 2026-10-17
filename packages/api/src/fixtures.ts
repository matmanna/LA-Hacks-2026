// STUB fixtures (B-05). Synthetic only. Replaced by real data in B-06/B-10.
import {
  type Action,
  type AuditResult,
  type Bill,
  balanceSummary,
  type CaseEvent,
  type CaseSummary,
  type Line,
  type ParseResult,
  type Savings,
} from "@betterbill/core";

export const FIXTURE_CASE_ID = "case-demo";
const AT = "2026-10-17T23:00:00.000Z";

const cbc = (id: string): Line => ({
  id,
  serviceDate: "2026-09-12",
  description: "CBC W/ AUTO DIFFERENTIAL",
  code: "85025",
  codeType: "CPT",
  units: 1,
  chargeCents: 8400,
  source: { page: 1, bbox: null },
  confidence: 0.95,
  userEdited: false,
});

export function fixtureBill(): Bill {
  return {
    id: "bill-demo",
    hospital: { name: "Sample General (synthetic)", city: null, state: "CA" },
    statementDate: "2026-09-30",
    accountRefMasked: "0000",
    kind: "itemized",
    sourceKind: "text",
    lines: [cbc("line-1"), cbc("line-2")],
    totals: {
      chargesCents: 16800,
      adjustmentsCents: 0,
      paidCents: 0,
      dueCents: 16800,
    },
  };
}

export function fixtureSavings(): Savings {
  return {
    confirmedCents: 8400,
    potentialLowCents: 0,
    potentialHighCents: 0,
    assistance: { status: "unknown" },
    method: ["Duplicate: the same test is listed twice on the same date."],
  };
}

export function fixtureCaseSummary(caseId = FIXTURE_CASE_ID): CaseSummary {
  return {
    id: caseId,
    status: "audited",
    hospitalName: "Sample General (synthetic)",
    createdAt: AT,
    savings: fixtureSavings(),
  };
}

export function fixtureParseResult(caseId: string): ParseResult {
  const bill = fixtureBill();
  return {
    caseId,
    bill,
    reconciliation: {
      linesSumCents: 16800,
      statedChargesCents: bill.totals.chargesCents,
      diffCents: 0,
      ok: true,
    },
    lowConfidenceLineIds: [],
    reader: {
      mode: "deterministic",
      model: null,
      latencyMs: 0,
      cachedAt: null,
    },
    warnings: ["STUB: fixture data, input was not read"],
  };
}

export function fixtureAudit(caseId: string): AuditResult {
  const bill = fixtureBill();
  const savings = fixtureSavings();
  return {
    caseId,
    flags: [
      {
        id: "flag-1",
        lineIds: ["line-1", "line-2"],
        lever: "duplicate",
        tier: "confirmed",
        title: "Listed twice on the same date",
        explanation:
          "Listed twice on the same date. Ask billing whether you had two tests.",
        amountCents: 8400,
        evidence: {
          kind: "arithmetic",
          detail: "Code 85025 on 2026-09-12 appears 2 times at $84.00 each.",
        },
        confidence: 0.9,
      },
    ],
    savings,
    balance: balanceSummary(bill.totals.dueCents, savings),
    durationMs: 0,
  };
}

export function fixtureAction(
  caseId: string,
  kind: Action["kind"] = "letter",
): Action {
  return {
    id: "action-1",
    caseId,
    kind,
    draft:
      "STUB letter. Please review the duplicate CBC charge (85025) on 2026-09-12.",
    recipient: "billing@sample-general.example",
    approvedAt: null,
    sentAt: null,
    outcome: null,
  };
}

export function fixtureEvents(caseId: string): CaseEvent[] {
  return [
    {
      id: "event-1",
      caseId,
      at: AT,
      actor: "system",
      type: "case.created",
      summary: "Case created",
    },
    {
      id: "event-2",
      caseId,
      at: AT,
      actor: "system",
      type: "audit.run",
      summary: "1 flag",
    },
  ];
}
