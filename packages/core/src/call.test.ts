import { describe, expect, it } from "vitest";

import {
  buildCallVars,
  CallOutcomeSchema,
  type CallTurn,
  checkDisclosure,
  DISCLOSURE,
  isAllowedNumber,
  mapConversationStatus,
  renderCallScript,
  transcriptText,
} from "./call";
import type { Bill, Flag } from "./schemas";

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
