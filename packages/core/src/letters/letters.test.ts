import { describe, expect, it } from "vitest";
import type { Bill, Flag, Line } from "../schemas";
import { checkLetterClaims } from "./check-claims";
import { fallbackModelOutput } from "./fallback";
import {
  type LetterModelOutput,
  LetterModelOutputSchema,
} from "./model-schema";
import { renderLetter } from "./render";

function firstParagraph(out: LetterModelOutput) {
  const paragraph = out.paragraphs[0];
  if (!paragraph) throw new Error("fixture has no paragraph");
  return paragraph;
}

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
  explanation:
    "The billed charge is higher than the hospital's own cash price.",
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
  evidence: {
    kind: "quote",
    detail: "Household income is within the policy's published threshold.",
  },
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
  totals: {
    chargesCents: 706800,
    adjustmentsCents: 0,
    paidCents: 0,
    dueCents: 706800,
  },
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

  it("states the real charge and the gap for a published-price flag", () => {
    const out = fallbackModelOutput("letter", [publishedFlag], [line3]);
    const text = firstParagraph(out).text;
    expect(text).toContain("is $6,900.00");
    expect(text).toContain("$1,756.85 higher than your own published price");
  });

  it("asks rather than accuses for a duplicate", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    expect(firstParagraph(out).text).toContain("Did I have more than one?");
  });

  it("accepts a model letter that states the published price", () => {
    const out = {
      subject: "Questions about my bill",
      opening: "I am writing about charges on my bill.",
      paragraphs: [
        {
          flagId: publishedFlag.id,
          text: "For code 72148, I was billed $6,900.00. The hospital's own published price is $5,143.15.",
        },
      ],
      closingRequest: "Please reply in writing.",
    };
    expect(checkLetterClaims(out, [publishedFlag], [line3]).ok).toBe(true);
    const wrong = {
      ...out,
      paragraphs: [
        { flagId: publishedFlag.id, text: "The published price is $4,000.00." },
      ],
    };
    expect(checkLetterClaims(wrong, [publishedFlag], [line3]).ok).toBe(false);
  });

  it("accepts amounts stated in the flag's own evidence", () => {
    const eobFlag: Flag = {
      ...duplicateFlag,
      id: "flag-eob",
      lever: "eob_mismatch",
      amountCents: 197000,
      evidence: {
        kind: "arithmetic",
        detail: "Bill asks $3,120.00; the EOB says you owe $1,150.00.",
      },
    };
    const out = {
      subject: "Questions about my bill",
      opening: "I am writing about my balance.",
      paragraphs: [
        {
          flagId: eobFlag.id,
          text: "My bill asks for $3,120.00, but my EOB says I owe $1,150.00, a gap of $1,970.00.",
        },
      ],
      closingRequest: "Please reply in writing.",
    };
    expect(checkLetterClaims(out, [eobFlag], [line1, line2]).ok).toBe(true);
  });

  it("passes for an estimate flag and mentions 'estimate'", () => {
    const out = fallbackModelOutput("letter", [estimateFlag], []);
    const result = checkLetterClaims(out, [estimateFlag], []);
    expect(result.ok).toBe(true);
  });

  it("only includes missing_itemization flags in an itemized request", () => {
    const missingFlag: Flag = {
      ...duplicateFlag,
      id: "flag-4",
      lever: "missing_itemization",
      tier: "rule",
    };
    const out = fallbackModelOutput("itemized_request", [missingFlag], [line1]);
    expect(out.paragraphs).toHaveLength(1);
    expect(firstParagraph(out).flagId).toBe("flag-4");
  });
});

describe("checkLetterClaims", () => {
  it("fails on an unknown flagId", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    firstParagraph(out).flagId = "does-not-exist";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("fails when a flag has no paragraph", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs = [];
    const result = checkLetterClaims(out, [duplicateFlag], [line1, line2]);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes("has no paragraph"))).toBe(
      true,
    );
  });

  it("fails when the same flag appears in two paragraphs", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.paragraphs.push({
      flagId: duplicateFlag.id,
      text: firstParagraph(out).text,
    });
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("passes a letter covering two flags with one paragraph each", () => {
    const out = fallbackModelOutput(
      "letter",
      [duplicateFlag, publishedFlag],
      [line1, line2, line3],
    );
    const result = checkLetterClaims(
      out,
      [duplicateFlag, publishedFlag],
      [line1, line2, line3],
    );
    expect(result.ok).toBe(true);
    expect(result.claims).toHaveLength(2);
  });

  it("fails when a dollar amount does not match the flag", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    firstParagraph(out).text += " We also noticed a $999.00 fee.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("fails when a code is not on the flag's lines", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    firstParagraph(out).text += " Also see code 99999.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("fails on a banned word", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    firstParagraph(out).text += " This looks like an overcharge.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("fails on an em dash", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    firstParagraph(out).text += " Please review — and respond.";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("fails when an estimate paragraph omits the word 'estimate'", () => {
    const out = fallbackModelOutput("letter", [estimateFlag], []);
    firstParagraph(out).text =
      "I may qualify for financial assistance based on your policy.";
    expect(checkLetterClaims(out, [estimateFlag], []).ok).toBe(false);
  });

  it("fails when a dollar sign appears in the subject", () => {
    const out = fallbackModelOutput("letter", [duplicateFlag], [line1, line2]);
    out.subject = "Please refund $84.00";
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
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

describe("more levers and edges", () => {
  const line4: Line = { ...line1, id: "line-4", units: 4 };
  const unitsFlag: Flag = {
    ...duplicateFlag,
    id: "flag-5",
    lineIds: ["line-4"],
    lever: "units",
    tier: "rule",
  };
  const eobFlag: Flag = {
    ...duplicateFlag,
    id: "flag-6",
    lineIds: [],
    lever: "eob_mismatch",
    tier: "confirmed",
    amountCents: 25000,
  };
  const letter = (flags: Flag[], lines: Line[]) =>
    fallbackModelOutput("letter", flags, lines);

  it("passes checks for a units flag", () => {
    const out = letter([unitsFlag], [line4]);
    expect(out.paragraphs[0]?.text).toContain("lists 4 units");
    expect(checkLetterClaims(out, [unitsFlag], [line4]).ok).toBe(true);
  });

  it("passes checks for an EOB mismatch flag", () => {
    const out = letter([eobFlag], []);
    expect(out.paragraphs[0]?.text).toContain("$250.00");
    expect(checkLetterClaims(out, [eobFlag], []).ok).toBe(true);
  });

  it("says 'the same date' when the duplicate line has no date", () => {
    const undated: Line = { ...line1, serviceDate: null };
    const out = letter(
      [duplicateFlag],
      [undated, { ...undated, id: "line-2" }],
    );
    expect(out.paragraphs[0]?.text).toContain("the same date");
  });

  it("fails when a published paragraph omits 'published'", () => {
    const out = {
      ...letter([publishedFlag], [line3]),
      paragraphs: [
        { flagId: publishedFlag.id, text: "Please review the MRI." },
      ],
    };
    expect(checkLetterClaims(out, [publishedFlag], [line3]).ok).toBe(false);
  });

  it("fails when the opening has a long digit sequence", () => {
    const out = {
      ...letter([duplicateFlag], [line1, line2]),
      opening: "My account number is 123456789.",
    };
    expect(checkLetterClaims(out, [duplicateFlag], [line1, line2]).ok).toBe(
      false,
    );
  });

  it("validates model output with the schema", () => {
    const out = letter([duplicateFlag], [line1, line2]);
    expect(LetterModelOutputSchema.safeParse(out).success).toBe(true);
    const tooLong = { ...out, subject: "x".repeat(91) };
    expect(LetterModelOutputSchema.safeParse(tooLong).success).toBe(false);
  });

  it("renders the source and capture date for sourced evidence", () => {
    const text = renderLetter({
      kind: "letter",
      bill,
      flags: [publishedFlag],
      out: letter([publishedFlag], [line3]),
      patientName: "Jordan Patient",
      today: "2026-10-17",
    });
    expect(text).toContain(
      "Source: https://example.com/price-file, captured 2026-10-17",
    );
  });

  it("says 'date unknown' and 'not shown' when those are missing", () => {
    const undatedSource: Flag = {
      ...publishedFlag,
      evidence: {
        kind: "price_file",
        detail: "Lower.",
        sourceUrl: "https://example.com/p",
      },
    };
    const text = renderLetter({
      kind: "letter",
      bill: { ...bill, accountRefMasked: null },
      flags: [undatedSource],
      out: letter([undatedSource], [line3]),
      patientName: "Jordan Patient",
      today: "2026-10-17",
    });
    expect(text).toContain("captured date unknown");
    expect(text).toContain("Account ending in not shown");
  });
});
