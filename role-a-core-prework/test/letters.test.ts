import { describe, expect, it } from "vitest";
import { checkLetterClaims } from "../src/letters/check-claims.js";
import { fallbackModelOutput } from "../src/letters/fallback.js";
import { renderLetter } from "../src/letters/render.js";
import type { Bill, Flag, Line } from "../src/schemas.js";

const line1: Line = {
  id: "line-1",
  serviceDate: "2026-09-02",
  description: "CBC w/ differential",
  code: "85025",
  codeType: "CPT",
  units: 1,
  chargeCents: 8400,
  source: { page: 1, bbox: null },
  confidence: 0.95,
  userEdited: false,
};
const line2: Line = { ...line1, id: "line-2" };
const line3: Line = {
  id: "line-3",
  serviceDate: "2026-09-02",
  description: "MRI lumbar, no contrast",
  code: "72148",
  codeType: "CPT",
  units: 1,
  chargeCents: 690000,
  source: { page: 1, bbox: null },
  confidence: 0.9,
  userEdited: false,
};

const duplicateFlag: Flag = {
  id: "flag-1",
  lineIds: ["line-1", "line-2"],
  lever: "duplicate",
  tier: "confirmed",
  title: "Duplicate lab charge",
  explanation: "Listed twice on the same date.",
  amountCents: 8400,
  evidence: { kind: "arithmetic", detail: "Same code and date appear twice." },
  confidence: 0.99,
};

const publishedFlag: Flag = {
  id: "flag-2",
  lineIds: ["line-3"],
  lever: "published_price",
  tier: "published",
  title: "Above the hospital's published price",
  explanation: "The billed charge is higher than the hospital's own cash price.",
  amountCents: 175685,
  evidence: {
    kind: "price_file",
    detail: "Hospital's published cash price is lower.",
    sourceUrl: "https://example.com/price-file",
    capturedAt: "2026-10-17",
  },
  confidence: 0.8,
};

const estimateFlag: Flag = {
  id: "flag-3",
  lineIds: [],
  lever: "assistance",
  tier: "estimate",
  title: "May qualify for financial assistance",
  explanation: "Based on the hospital's published policy, this is an estimate.",
  amountCents: 0,
  evidence: { kind: "quote", detail: "Household income is within the policy's published threshold." },
  confidence: 0.5,
};

const bill: Bill = {
  id: "bill-1",
  hospital: { name: "Example Hospital", city: "Los Angeles", state: "CA" },
  statementDate: "2026-09-10",
  accountRefMasked: "4321",
  kind: "itemized",
  sourceKind: "text",
  lines: [line1, line2, line3],
  totals: { chargesCents: 706800, adjustmentsCents: 0, paidCents: 0, dueCents: 706800 },
};

describe("fallbackModelOutput", () => {
  it("passes claim and wording checks for a duplicate flag", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    const result = checkLetterClaims(out, [duplicateFlag], [line1, line2]);
    expect(result.ok).toBe(true);
    expect(result.claims).toHaveLength(1);
  });

  it("passes for a published-price flag and mentions 'published'", () => {
    const out = fallbackModelOutput("letter", [publishedFlag], [line3]);
    const result = checkLetterClaims(out, [publishedFlag], [line3]);
    expect(result.ok).toBe(true);
  });

  it("passes for an estimate flag and mentions 'estimate'", () => {
    const out = fallbackModelOutput("letter", [estimateFlag], []);
    const result = checkLetterClaims(out, [estimateFlag], []);
    expect(result.ok).toBe(true);
  });

  it("only includes missing_itemization flags in an itemized request", () => {
    const missingFlag: Flag = { ...duplicateFlag, id: "flag-4", lever: "missing_itemization", tier: "rule" };
    const out = fallbackModelOutput("itemized_request", [missingFlag], [line1]);
    expect(out.paragraphs).toHaveLength(1);
    expect(out.paragraphs[0].flagId).toBe("flag-4");
  });
});

describe("checkLetterClaims", () => {
  it("fails on an unknown flagId", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs[0].flagId = "does-not-exist";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("fails when a flag has no paragraph", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs = [];
    const result = checkLetterClaims(out, [duplicateFlag], [line1, line2]);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes("has no paragraph"))).toBe(true);
  });

  it("fails when the same flag appears in two paragraphs", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs.push({ flagId: duplicateFlag.id, text: out.paragraphs[0].text });
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("passes a letter covering two flags with one paragraph each", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag, publishedFlag], [line1, line2, line3]);
    const result = checkLetterClaims(out, [duplicateFlag, publishedFlag], [line1, line2, line3]);
    expect(result.ok).toBe(true);
    expect(result.claims).toHaveLength(2);
  });

  it("fails when a dollar amount does not match the flag", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs[0].text += " We also noticed a $999.00 fee.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("fails when a code is not on the flag's lines", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs[0].text += " Also see code 99999.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("fails on a banned word", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs[0].text += " This looks like an overcharge.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("fails on an em dash", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs[0].text += " Please review — and respond.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });

  it("fails when an estimate paragraph omits the word 'estimate'", () => {
    const out = fallbackModelOutput("letter", [estimateFlag], []);
    out.paragraphs[0].text = "I may qualify for financial assistance based on your policy.";
    expect(checkLetterClaims(out, [estimateFlag], []).ok).toBe(false);
  });

  it("fails when a dollar sign appears in the subject", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.subject = "Please refund $84.00";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(false);
  });
});

describe("renderLetter", () => {
  it("renders the duplicate-charge example from the team brief", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    const text = renderLetter({
      kind: "letter",
      bill,
      flags: [duplicateFlag],
      out,
      patientName: "Jordan Patient",
      today: "2026-10-17",
    });
    expect(text).toContain("Example Hospital");
    expect(text).toContain("Account ending in 4321");
    expect(text).toContain("Confirmed from your bill");
    expect(text).toContain("CBC w/ differential");
  });
});
