import { describe, expect, it } from "vitest";

import {
  buildCallVars,
  CallOutcomeSchema,
  type CallTurn,
  checkDisclosure,
  DISCLOSURE,
  isAllowedNumber,
  isSyntheticSampleCase,
  mapConversationStatus,
  renderCallScript,
  transcriptText,
} from "./call";
import type { Bill, Flag } from "./schemas";

describe("synthetic call provenance", () => {
  const sample = {
    type: "bill.parsed",
    actor: "system" as const,
    at: "2026-10-18T01:00:00Z",
    summary: "Loaded sample bill SB-01 (10 lines)",
  };
  it("requires a known sample in the latest server bill parse event", () => {
    expect(isSyntheticSampleCase([sample], ["SB-01"])).toBe(true);
    expect(isSyntheticSampleCase([sample], ["SB-02"])).toBe(false);
    expect(
      isSyntheticSampleCase([{ ...sample, actor: "user" }], ["SB-01"]),
    ).toBe(false);
    expect(
      isSyntheticSampleCase(
        [{ ...sample, summary: `${sample.summary} extra` }],
        ["SB-01"],
      ),
    ).toBe(false);
    expect(isSyntheticSampleCase([], ["SB-01"])).toBe(false);
    const upload = {
      ...sample,
      at: "2026-10-18T01:01:00Z",
      summary: "Read uploaded bill",
    };
    expect(isSyntheticSampleCase([upload, sample], ["SB-01"])).toBe(false);
    expect(
      isSyntheticSampleCase(
        [sample, { ...upload, type: "bill.confirmed" }],
        ["SB-01"],
      ),
    ).toBe(true);
  });
});

const bill = {
  id: "b1",
  hospital: { name: "Example Hospital", city: null, state: null },
  statementDate: null,
  accountRefMasked: "****4321",
  kind: "itemized",
  sourceKind: "text",
  lines: [],
  totals: { chargesCents: 0, adjustmentsCents: 0, paidCents: 0, dueCents: 0 },
} as Bill;

function flag(id: string, title: string, amountCents: number): Flag {
  return {
    id,
    lineIds: [],
    lever: "duplicate",
    tier: "confirmed",
    title,
    explanation: "",
    amountCents,
    evidence: { kind: "arithmetic", detail: "" },
    confidence: 1,
  };
}

describe("buildCallVars", () => {
  it("provides approved line facts and separates the disputed difference from the charge", () => {
    const vars = buildCallVars(
      {
        ...bill,
        lines: [
          {
            id: "mri",
            serviceDate: "2026-09-14",
            description: "MRI lumbar spine",
            code: "72148",
            codeType: "CPT",
            units: 1,
            chargeCents: 690000,
            source: { page: 1, bbox: null },
            confidence: 1,
            userEdited: false,
          },
        ],
      },
      [
        {
          ...flag("price", "Published price difference", 175685),
          lineIds: ["mri"],
          lever: "published_price",
          tier: "published",
          explanation: "Published cash price $5,143.15; billed $6,900.00.",
          evidence: {
            kind: "price_file",
            detail:
              "72148: billed 690000 cents, published cash price 514315 cents.",
            sourceUrl: "https://example.org/prices.csv",
            capturedAt: "2026-10-17",
          },
        },
        flag("two", "Second item", 100),
        flag("three", "Third item", 50),
        flag("four", "Excluded fourth item", 1),
      ],
    );
    expect(vars.case_context).toContain("Amount under review: $1,756.85");
    expect(vars.case_context).toContain("not the original billed charge");
    expect(vars.case_context).toContain("Billed charge: $6,900.00");
    expect(vars.case_context).toContain("2026-09-14");
    expect(vars.case_context).toContain("CPT 72148");
    expect(vars.case_context).toContain("MRI lumbar spine");
    expect(vars.case_context).toContain("Units: 1");
    expect(vars.case_context).toContain("Evidence tier: published");
    expect(vars.case_context).toContain("$5,143.15");
    expect(vars.case_context).toContain("https://example.org/prices.csv");
    expect(vars.case_context).not.toContain("Excluded fourth item");
  });

  it("adds fictional identity only with trusted synthetic sample provenance", () => {
    const real = buildCallVars(bill, []);
    expect(real.patient_name).toBe("");
    expect(real.patient_dob).toBe("");
    expect(real.case_context).not.toContain("Alex Morgan");
    const sample = buildCallVars(bill, [], true);
    expect(sample.patient_name).toBe("Alex Morgan");
    expect(sample.patient_dob).toBe("1990-04-12");
    expect(sample.case_context).toContain("Fictional role-play patient");
    expect(sample.case_context).toContain("1990-04-12");
  });

  it("names at most 3 items, largest first, with formatted amounts", () => {
    const vars = buildCallVars(bill, [
      flag("a", "Small", 100),
      flag("b", "Big", 175685),
      flag("c", "Mid", 8400),
      flag("d", "Tiny", 50),
    ]);
    expect(vars.disputed_items).toBe(
      "Big, $1,756.85; Mid, $84.00; Small, $1.00",
    );
    expect(vars.account_last4).toBe("4321");
    expect(vars.hospital_name).toBe("Example Hospital");
  });

  it("says 'not available' without a 4-digit account suffix", () => {
    expect(
      buildCallVars({ ...bill, accountRefMasked: null }, []).account_last4,
    ).toBe("not available");
    expect(
      buildCallVars({ ...bill, accountRefMasked: "**12" }, []).account_last4,
    ).toBe("not available");
  });
});

describe("renderCallScript", () => {
  it("binds all additional case facts into the reviewed script", () => {
    const vars = buildCallVars(bill, []);
    const before = renderCallScript(vars);
    expect(before).toContain(vars.case_context);
    expect(
      renderCallScript({ ...vars, case_context: "A changed fact" }),
    ).not.toBe(before);
  });
  it("opens with the disclosure and says only the call variables", () => {
    const vars = buildCallVars(bill, [flag("b", "Big", 175685)]);
    const script = renderCallScript(vars);
    expect(script.startsWith(DISCLOSURE)).toBe(true);
    expect(script).toContain("account ending in 4321 at Example Hospital");
    expect(script).toContain("Big, $1,756.85");
    expect(script).toContain("It will not agree to payments.");
  });
});

describe("CallOutcomeSchema", () => {
  it("accepts a complete outcome and rejects a bad source", () => {
    const outcome = {
      status: "done",
      summary: "Call finished.",
      referenceNumber: "R-1",
      billingResponse: null,
      nextStep: null,
      followUpDate: null,
      durationSecs: 42,
      transcript: [{ role: "agent", message: DISCLOSURE, t: 0 }],
      recorded: true,
      source: "live",
    };
    expect(CallOutcomeSchema.safeParse(outcome).success).toBe(true);
    expect(
      CallOutcomeSchema.safeParse({ ...outcome, source: "made_up" }).success,
    ).toBe(false);
  });
});

describe("checkDisclosure", () => {
  const agent = (message: string): CallTurn => ({
    role: "agent",
    message,
    t: 0,
  });
  const user = (message: string): CallTurn => ({ role: "user", message, t: 1 });

  it("passes when the first agent turn starts with the disclosure", () => {
    expect(
      checkDisclosure([user("Hello?"), agent(`${DISCLOSURE} Okay?`)]),
    ).toBe(true);
  });

  it("fails when the assistant opens with anything else or never speaks", () => {
    expect(checkDisclosure([agent("Hi, I'm calling about a bill.")])).toBe(
      false,
    );
    expect(checkDisclosure([user("Hello?")])).toBe(false);
  });
});

describe("isAllowedNumber", () => {
  it("matches exact numbers in the comma-separated list", () => {
    expect(isAllowedNumber("+13105550100", "+13105550100, +13105550199")).toBe(
      true,
    );
    expect(isAllowedNumber("+13105550101", "+13105550100")).toBe(false);
    expect(isAllowedNumber("+13105550100", "")).toBe(false);
  });
});

describe("transcriptText", () => {
  it("writes agent and billing lines for the transcript card", () => {
    expect(
      transcriptText([
        { role: "agent", message: "Hi", t: 0 },
        { role: "user", message: "Hello", t: 2 },
      ]),
    ).toBe("agent: Hi\nbilling: Hello");
  });
});

describe("mapConversationStatus", () => {
  it("maps ElevenLabs conversation statuses", () => {
    expect(mapConversationStatus("initiated")).toBe("ringing");
    expect(mapConversationStatus("in-progress")).toBe("in_progress");
    expect(mapConversationStatus("processing")).toBe("in_progress");
    expect(mapConversationStatus("done")).toBe("done");
    expect(mapConversationStatus("failed")).toBe("failed");
    expect(mapConversationStatus("something-new")).toBe("failed");
  });
});
