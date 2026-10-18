import type { Packet } from "@betterbill/core";
import { describe, expect, it } from "vitest";

import { maskRecipient, redactPacket } from "./packet";

describe("maskRecipient", () => {
  it("masks emails and phone numbers, keeps names", () => {
    expect(maskRecipient("someone@gmail.com")).toBe("s***@gmail.com");
    expect(maskRecipient("+1 (310) 555-0142")).toBe("phone ending 42");
    expect(maskRecipient("Billing Office, Cedars-Sinai Medical Center")).toBe(
      "Billing Office, Cedars-Sinai Medical Center",
    );
  });
});

describe("redactPacket", () => {
  const caseId = "11111111-2222-3333-4444-555555555555";
  const action = (id: string, approvedAt: string | null) => ({
    id,
    caseId,
    kind: "letter" as const,
    draft: `draft ${id}`,
    recipient: "someone@gmail.com",
    approvedAt,
    sentAt: null,
    outcome: null,
  });
  const packet = {
    case: { id: caseId },
    bill: { id: `${caseId}-bill`, lines: [{ id: `${caseId}-l01` }] },
    actions: [
      action("act-approved", "2026-10-18T05:00:00Z"),
      action("act-draft", null),
    ],
    events: [{ id: "e1", caseId, artifactRef: "act-approved" }],
  } as unknown as Packet;

  it("drops ids that unlock other procedures and unapproved drafts", () => {
    const r = redactPacket(packet);
    const json = JSON.stringify(r);
    expect(json).not.toContain(caseId);
    expect(json).not.toContain("act-approved");
    expect(json).not.toContain("act-draft");
    expect(json).not.toContain("someone@gmail.com");
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0]?.recipient).toBe("s***@gmail.com");
    expect(r.bill.lines[0]?.id).toBe("shared-l01");
  });
});
