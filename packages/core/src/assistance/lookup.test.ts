import { describe, expect, it } from "vitest";

import {
  type PolicyLookupOutput,
  policyFromLookup,
  policyLookupTask,
  quoteStates,
} from "./lookup";

// Synthetic agent output for a made-up hospital.
const out = (p: Partial<PolicyLookupOutput> = {}): PolicyLookupOutput => ({
  policy_url: "https://example.test/fap",
  policy_title: "Financial Assistance Policy",
  pdf_urls: ["https://example.test/fap.pdf"],
  quotes: [
    "Patients with family income at or below 300% of the FPL receive free care.",
    "Patients between 301% and 450% of the FPL receive a discount.",
  ],
  free_care_max_fpl_pct: 300,
  discount_max_fpl_pct: 450,
  references_501r_quote:
    "This policy meets Section 501(r) of the Internal Revenue Code.",
  billing_phone: "(555) 010-0000",
  ...p,
});

const meta = {
  hospitalName: "Valley General (synthetic)",
  capturedAt: "2026-10-18T10:00:00Z",
};

describe("quoteStates", () => {
  it("matches a percent or the word percent, not a longer number", () => {
    expect(quoteStates("at or below 400% of FPL", 400)).toBe(true);
    expect(quoteStates("not exceed 400 percent of the federal", 400)).toBe(
      true,
    );
    expect(quoteStates("up to 1400% of FPL", 400)).toBe(false);
    expect(quoteStates("400 patients", 400)).toBe(false);
  });
});

describe("policyFromLookup", () => {
  it("keeps limits its quotes state, with those quotes", () => {
    const r = policyFromLookup(out(), meta);
    expect(r?.policy).toMatchObject({
      hospitalName: "Valley General (synthetic)",
      freeCareMaxFplPct: 300,
      discountMaxFplPct: 450,
      references501r:
        "This policy meets Section 501(r) of the Internal Revenue Code.",
    });
    expect(r?.policy.freeCareQuote).toMatch(/300%/);
    expect(r?.policy.discountQuote).toMatch(/450%/);
  });

  it("drops a limit no quote states", () => {
    const r = policyFromLookup(out({ discount_max_fpl_pct: 500 }), meta);
    expect(r?.policy.discountMaxFplPct).toBeNull();
    expect(r?.policy.freeCareMaxFplPct).toBe(300);
  });

  it("drops quotes missing from the captured source text", () => {
    const r = policyFromLookup(out(), {
      ...meta,
      sourceText:
        "...Patients with family income at or below 300%   of the FPL receive free care. ...",
    });
    expect(r?.quotes).toHaveLength(1);
    expect(r?.dropped).toHaveLength(1);
    expect(r?.policy.discountMaxFplPct).toBeNull();
    expect(r?.policy.references501r).toBeNull();
  });

  it("returns null when nothing is backed", () => {
    expect(policyFromLookup(out({ quotes: [] }), meta)).toBeNull();
    expect(policyFromLookup(out({ policy_url: "" }), meta)).toBeNull();
  });

  it("writes a task that asks for verbatim quotes", () => {
    expect(
      policyLookupTask({
        name: "Valley General",
        city: "Los Angeles",
        state: "CA",
      }),
    ).toMatch(
      /^Find the financial assistance \(charity care\) policy for Valley General in Los Angeles, CA\..*verbatim/,
    );
  });
});
