import { describe, expect, it } from "vitest";

import { type HomeCase, homeGroup, homeNeeds, homeSummary } from "./home";
import type { Action, CaseEvent, Savings } from "./schemas";

const savings = (over: Partial<Savings> = {}): Savings => ({
  confirmedCents: 0,
  potentialLowCents: 0,
  potentialHighCents: 0,
  assistance: { status: "unknown" },
  method: [],
  ...over,
});

const action = (over: Partial<Action> = {}): Action => ({
  id: "a1",
  caseId: "c1",
  kind: "letter",
  draft: "Dear billing",
  recipient: "billing@example.test",
  approvedAt: null,
  sentAt: null,
  outcome: null,
  ...over,
});

const event = (type: string): CaseEvent => ({
  id: `e-${type}`,
  caseId: "c1",
  at: "2026-10-18T10:00:00.000Z",
  actor: "system",
  type,
  summary: type,
});

const base = (over: Partial<HomeCase>): HomeCase => ({
  id: "c1",
  status: "new",
  createdAt: "2026-10-18T10:00:00.000Z",
  billedCents: null,
  savings: null,
  flagCount: 0,
  actions: [],
  events: [],
  ...over,
});

// The three bills of the Home V4 mockup.
const needsYou = base({
  id: "cedars",
  status: "action_pending",
  createdAt: "2026-10-14T10:00:00.000Z",
  billedCents: 1_200_000,
  savings: savings({
    confirmedCents: 8_400,
    potentialLowCents: 183_285,
    potentialHighCents: 183_285,
  }),
  flagCount: 3,
  actions: [action()],
  events: [event("action.drafted")],
});
const waiting = base({
  id: "keck",
  status: "called",
  createdAt: "2026-10-12T10:00:00.000Z",
  billedCents: 303_400,
  savings: savings({ potentialLowCents: 25_000, potentialHighCents: 40_000 }),
  flagCount: 2,
  actions: [
    action({
      id: "a2",
      approvedAt: "2026-10-12T11:00:00.000Z",
      sentAt: "2026-10-12T11:01:00.000Z",
    }),
    action({ id: "a3", kind: "call", approvedAt: "2026-10-12T12:00:00.000Z" }),
  ],
  events: [
    event("action.sent"),
    event("call.started"),
    event("call.completed"),
  ],
});
const reading = base({
  id: "valley",
  status: "new",
  createdAt: "2026-10-03T10:00:00.000Z",
});

describe("homeSummary", () => {
  it("adds savings, counts and groups across bills", () => {
    const s = homeSummary([reading, waiting, needsYou]);
    expect(s.bills).toBe(3);
    expect(s.savingsCents).toBe(216_685);
    expect(s.confirmedCents).toBe(8_400);
    expect(s.estimateCents).toBe(208_285);
    expect(s.isEstimate).toBe(true);
    expect(s.needsYou).toBe(1);
    expect(s.waiting).toBe(1);
    expect(s.reading).toBe(1);
    expect(s.flags).toBe(5);
    expect(s.callsMade).toBe(1);
    expect(s.emailsSent).toBe(1);
  });

  it("orders needs you, then waiting, then reading, then done", () => {
    const closed = base({ id: "old", status: "closed" });
    const s = homeSummary([closed, reading, waiting, needsYou]);
    expect(s.order.map((b) => b.id)).toEqual([
      "cedars",
      "keck",
      "valley",
      "old",
    ]);
    expect(s.order[0]).toEqual({
      id: "cedars",
      group: "needs_you",
      needs: "approve the letter",
      savingsCents: 191_685,
    });
    expect(s.order[2]?.savingsCents).toBeNull();
  });

  it("puts the newest bill first inside a group", () => {
    const older = base({
      id: "older",
      status: "sent",
      createdAt: "2026-10-01T10:00:00.000Z",
    });
    const newer = base({
      id: "newer",
      status: "sent",
      createdAt: "2026-10-09T10:00:00.000Z",
    });
    expect(homeSummary([older, newer]).order.map((b) => b.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("never counts more than the bill", () => {
    const small = base({
      id: "small",
      status: "audited",
      billedCents: 5_000,
      savings: savings({ confirmedCents: 4_000, potentialLowCents: 3_000 }),
    });
    const s = homeSummary([small]);
    expect(s.savingsCents).toBe(5_000);
    expect(s.confirmedCents).toBe(4_000);
    expect(s.estimateCents).toBe(1_000);
  });

  it("uses the raw savings when the bill total is unknown", () => {
    const s = homeSummary([
      base({
        id: "x",
        status: "audited",
        savings: savings({ confirmedCents: 100, potentialLowCents: 50 }),
      }),
    ]);
    expect(s.savingsCents).toBe(150);
    expect(s.isEstimate).toBe(true);
    const confirmedOnly = homeSummary([
      base({
        id: "y",
        status: "audited",
        savings: savings({ confirmedCents: 100 }),
      }),
    ]);
    expect(confirmedOnly.isEstimate).toBe(false);
    expect(
      homeSummary([
        base({
          id: "z",
          status: "audited",
          savings: savings({ assistance: { status: "likely" } }),
        }),
      ]).isEstimate,
    ).toBe(true);
  });

  it("is empty with no bills", () => {
    expect(homeSummary([])).toEqual({
      bills: 0,
      savingsCents: 0,
      confirmedCents: 0,
      estimateCents: 0,
      isEstimate: false,
      needsYou: 0,
      waiting: 0,
      reading: 0,
      flags: 0,
      callsMade: 0,
      emailsSent: 0,
      order: [],
    });
  });
});

describe("homeGroup and homeNeeds", () => {
  it("maps every status to a group", () => {
    expect(homeGroup("new")).toBe("reading");
    expect(homeGroup("lines_confirmed")).toBe("reading");
    expect(homeGroup("audited")).toBe("needs_you");
    expect(homeGroup("action_pending")).toBe("needs_you");
    expect(homeGroup("sent")).toBe("waiting");
    expect(homeGroup("called")).toBe("waiting");
    expect(homeGroup("closed")).toBe("done");
  });

  it("names the pending action", () => {
    expect(homeNeeds({ status: "sent", actions: [] })).toBeNull();
    expect(homeNeeds({ status: "audited", actions: [] })).toBe("see the plan");
    expect(
      homeNeeds({
        status: "action_pending",
        actions: [action({ kind: "itemized_request" })],
      }),
    ).toBe("approve the request");
    expect(
      homeNeeds({
        status: "action_pending",
        actions: [action({ kind: "call" })],
      }),
    ).toBe("approve the call");
    // An approved call still in progress: nothing to approve, see the plan.
    expect(
      homeNeeds({
        status: "action_pending",
        actions: [
          action({ kind: "call", approvedAt: "2026-10-18T10:00:00.000Z" }),
        ],
      }),
    ).toBe("see the plan");
  });
});
