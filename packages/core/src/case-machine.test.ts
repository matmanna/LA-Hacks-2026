import { describe, expect, it } from "vitest";
import {
  approvalCoverage,
  approvalRef,
  assertApproved,
  deriveStatus,
  makeEvent,
  TransitionError,
} from "./case-machine";
import { sha256Hex } from "./hash";
import type { CaseEvent } from "./schemas";

function ev(
  partial: Partial<CaseEvent> & Pick<CaseEvent, "type" | "at">,
): CaseEvent {
  return {
    id: globalThis.crypto.randomUUID(),
    caseId: "case-1",
    actor: "user",
    summary: "",
    ...partial,
  };
}

describe("deriveStatus", () => {
  it("walks the happy path from new to called", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "2026-10-17T00:00:00Z" }),
      ev({ type: "lines.confirmed", at: "2026-10-17T00:01:00Z" }),
      ev({ type: "audit.completed", at: "2026-10-17T00:02:00Z" }),
      ev({
        type: "action.drafted",
        at: "2026-10-17T00:03:00Z",
        artifactRef: "action:a1",
      }),
      ev({
        type: "action.approved",
        at: "2026-10-17T00:04:00Z",
        artifactRef: approvalRef("a1", "abc"),
      }),
      ev({
        type: "call.started",
        at: "2026-10-17T00:05:00Z",
        artifactRef: approvalRef("a1", "abc"),
      }),
      ev({ type: "call.completed", at: "2026-10-17T00:06:00Z" }),
    ];
    expect(deriveStatus(events)).toBe("called");
  });

  it("allows re-confirming lines after an audit", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "lines.confirmed", at: "t1" }),
      ev({ type: "audit.completed", at: "t2" }),
      ev({ type: "lines.confirmed", at: "t3" }),
    ];
    expect(deriveStatus(events)).toBe("lines_confirmed");
  });

  it("closes from any status", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "case.closed", at: "t1" }),
    ];
    expect(deriveStatus(events)).toBe("closed");
  });

  it("requires case.created as the first event", () => {
    const events: CaseEvent[] = [ev({ type: "lines.confirmed", at: "t0" })];
    expect(() => deriveStatus(events)).toThrow(TransitionError);
  });

  it("rejects a second case.created", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "case.created", at: "t1" }),
    ];
    expect(() => deriveStatus(events)).toThrow(TransitionError);
  });

  it("ignores input order and sorts by `at`", () => {
    const events: CaseEvent[] = [
      ev({ type: "audit.completed", at: "t2" }),
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "lines.confirmed", at: "t1" }),
    ];
    expect(deriveStatus(events)).toBe("audited");
  });

  it("rejects sending before a draft exists", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "action.sent", at: "t1" }),
    ];
    expect(() => deriveStatus(events)).toThrow(TransitionError);
  });
});

describe("approval guard", () => {
  it("throws NOT_APPROVED when sending without an approval", () => {
    const events: CaseEvent[] = [ev({ type: "case.created", at: "t0" })];
    expect(() => assertApproved(events, "a1", "hash-1")).toThrow(
      "NOT_APPROVED",
    );
  });

  it("throws NOT_APPROVED when a redraft follows the approval", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "action.drafted", at: "t1", artifactRef: "action:a1" }),
      ev({
        type: "action.approved",
        at: "t2",
        artifactRef: approvalRef("a1", "hash-old"),
      }),
      ev({ type: "action.drafted", at: "t3", artifactRef: "action:a1" }),
    ];
    expect(() => assertApproved(events, "a1", "hash-new")).toThrow(
      "NOT_APPROVED",
    );
  });

  it("passes when the current hash matches the approval", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({
        type: "action.approved",
        at: "t1",
        artifactRef: approvalRef("a1", "hash-1"),
      }),
    ];
    expect(() => assertApproved(events, "a1", "hash-1")).not.toThrow();
  });

  it("throws DRAFT_CHANGED when the hash no longer matches", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({
        type: "action.approved",
        at: "t1",
        artifactRef: approvalRef("a1", "hash-1"),
      }),
    ];
    expect(() => assertApproved(events, "a1", "hash-2")).toThrow(
      "DRAFT_CHANGED",
    );
  });

  it("invalidates an approval on cancel", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({
        type: "action.approved",
        at: "t1",
        artifactRef: approvalRef("a1", "hash-1"),
      }),
      ev({ type: "action.cancelled", at: "t2", artifactRef: "action:a1" }),
    ];
    expect(() => assertApproved(events, "a1", "hash-1")).toThrow(
      "NOT_APPROVED",
    );
  });

  it("keeps approvals for other actions separate", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({
        type: "action.approved",
        at: "t1",
        artifactRef: approvalRef("a1", "hash-1"),
      }),
    ];
    expect(() => assertApproved(events, "a2", "hash-1")).toThrow(
      "NOT_APPROVED",
    );
  });
});

describe("approvalCoverage", () => {
  it("is 1 on an empty log", () => {
    expect(approvalCoverage([]).ratio).toBe(1);
  });

  it("is 1.0 when every outbound event has a matching approval", () => {
    const events: CaseEvent[] = [
      ev({
        type: "action.approved",
        at: "t0",
        artifactRef: approvalRef("a1", "h1"),
      }),
      ev({
        type: "action.sent",
        at: "t1",
        artifactRef: approvalRef("a1", "h1"),
      }),
    ];
    expect(approvalCoverage(events).ratio).toBe(1);
  });

  it("is 0.5 when one of two outbound events is unapproved", () => {
    const events: CaseEvent[] = [
      ev({
        type: "action.approved",
        at: "t0",
        artifactRef: approvalRef("a1", "h1"),
      }),
      ev({
        type: "action.sent",
        at: "t1",
        artifactRef: approvalRef("a1", "h1"),
      }),
      ev({
        type: "call.started",
        at: "t2",
        artifactRef: approvalRef("a2", "h2"),
      }),
    ];
    expect(approvalCoverage(events).ratio).toBe(0.5);
  });
});

describe("makeEvent", () => {
  it("fills id and at automatically", () => {
    const event = makeEvent({
      caseId: "case-1",
      actor: "system",
      type: "case.created",
      summary: "Case started",
    });
    expect(event.id).toBeTruthy();
    expect(event.at).toBeTruthy();
  });
});

describe("sha256Hex", () => {
  it("is stable across CRLF vs LF line endings", async () => {
    const a = await sha256Hex("line one\nline two");
    const b = await sha256Hex("line one\r\nline two");
    expect(a).toBe(b);
  });

  it("is stable across trailing spaces on a line", async () => {
    const a = await sha256Hex("line one \nline two");
    const b = await sha256Hex("line one\nline two");
    expect(a).toBe(b);
  });

  it("produces a 64-char hex string", async () => {
    const hash = await sha256Hex("hello");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("edge cases", () => {
  it("throws NO_EVENTS on an empty log", () => {
    expect(() => deriveStatus([])).toThrow("NO_EVENTS");
  });

  it("rejects an unknown event type", () => {
    const events: CaseEvent[] = [
      ev({ type: "case.created", at: "t0" }),
      ev({ type: "made.up", at: "t1" }),
    ];
    expect(() => deriveStatus(events)).toThrow(TransitionError);
  });

  it("rejects case.closed as the first event", () => {
    const events: CaseEvent[] = [ev({ type: "case.closed", at: "t0" })];
    expect(() => deriveStatus(events)).toThrow(TransitionError);
  });

  it("ignores an approval with no hash", () => {
    const events: CaseEvent[] = [
      ev({ type: "action.approved", at: "t0", artifactRef: "action:a1" }),
    ];
    expect(() => assertApproved(events, "a1", "h1")).toThrow("NOT_APPROVED");
  });

  it("ignores artifact refs that are not action refs", () => {
    const events: CaseEvent[] = [
      ev({
        type: "action.approved",
        at: "t0",
        artifactRef: approvalRef("a1", "h1"),
      }),
      ev({ type: "action.cancelled", at: "t1", artifactRef: "bill:a1" }),
    ];
    expect(() => assertApproved(events, "a1", "h1")).not.toThrow();
  });

  it("keeps the approval after a send", () => {
    const events: CaseEvent[] = [
      ev({
        type: "action.approved",
        at: "t0",
        artifactRef: approvalRef("a1", "h1"),
      }),
      ev({
        type: "action.sent",
        at: "t1",
        artifactRef: approvalRef("a1", "h1"),
      }),
    ];
    expect(() => assertApproved(events, "a1", "h1")).not.toThrow();
  });

  it("keeps an explicit `at` in makeEvent", () => {
    const event = makeEvent({
      caseId: "case-1",
      actor: "user",
      type: "case.created",
      summary: "",
      at: "2026-10-17T00:00:00Z",
    });
    expect(event.at).toBe("2026-10-17T00:00:00Z");
  });
});
