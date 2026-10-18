import { z } from "zod";

import { balanceSummary } from "./balance";
import { Action, CaseEvent, CaseStatus, Savings } from "./schemas";

// Home V4: the Bills tab adds nothing up itself. case.summary feeds every
// case on the phone through homeSummary() and the app only displays it.

export const HomeGroup = z.enum(["needs_you", "waiting", "reading", "done"]);
export type HomeGroup = z.infer<typeof HomeGroup>;

// One case as the API loads it: status, savings, audit flags, actions, events.
export const HomeCase = z.object({
  id: z.string(),
  status: CaseStatus,
  createdAt: z.iso.datetime(),
  billedCents: z.number().int().nullable(),
  savings: Savings.nullable(),
  flagCount: z.number().int(),
  actions: z.array(Action),
  events: z.array(CaseEvent),
});
export type HomeCase = z.infer<typeof HomeCase>;

export const HomeBill = z.object({
  id: z.string(),
  group: HomeGroup,
  // What the patient must do next, e.g. "approve the letter". Only for needs_you.
  needs: z.string().nullable(),
  // Confirmed plus potential low, never more than the bill (balanceSummary).
  savingsCents: z.number().int().nullable(),
});
export type HomeBill = z.infer<typeof HomeBill>;

export const HomeSummary = z.object({
  bills: z.number().int(),
  savingsCents: z.number().int(),
  confirmedCents: z.number().int(),
  estimateCents: z.number().int(),
  isEstimate: z.boolean(),
  needsYou: z.number().int(),
  waiting: z.number().int(),
  reading: z.number().int(),
  flags: z.number().int(),
  callsMade: z.number().int(),
  emailsSent: z.number().int(),
  // Every case in display order: needs you, waiting, reading, done; newest first.
  order: z.array(HomeBill),
});
export type HomeSummary = z.infer<typeof HomeSummary>;

const GROUP_OF: Record<CaseStatus, HomeGroup> = {
  new: "reading",
  lines_confirmed: "reading",
  audited: "needs_you",
  action_pending: "needs_you",
  sent: "waiting",
  called: "waiting",
  closed: "done",
};

const RANK: Record<HomeGroup, number> = {
  needs_you: 0,
  waiting: 1,
  reading: 2,
  done: 3,
};

const APPROVE: Record<Action["kind"], string> = {
  letter: "approve the letter",
  itemized_request: "approve the request",
  call: "approve the call",
};

export function homeGroup(status: CaseStatus): HomeGroup {
  return GROUP_OF[status];
}

// The step waiting on the patient, in the words of the case screen's button.
export function homeNeeds(c: Pick<HomeCase, "status" | "actions">) {
  if (homeGroup(c.status) !== "needs_you") return null;
  if (c.status === "action_pending") {
    const pending = c.actions.find((a) => !a.approvedAt && !a.sentAt);
    if (pending) return APPROVE[pending.kind];
  }
  return "see the plan";
}

function splitSavings(c: Pick<HomeCase, "billedCents" | "savings">) {
  if (!c.savings) return null;
  const billed = c.billedCents;
  if (billed === null) {
    const confirmed = c.savings.confirmedCents;
    return {
      confirmed,
      estimate: c.savings.potentialLowCents,
      total: confirmed + c.savings.potentialLowCents,
      isEstimate:
        c.savings.potentialLowCents > 0 ||
        c.savings.potentialHighCents > 0 ||
        c.savings.assistance.status === "likely" ||
        c.savings.assistance.status === "possible",
    };
  }
  const b = balanceSummary(billed, c.savings);
  const confirmed = Math.min(c.savings.confirmedCents, b.lessThanBilledCents);
  return {
    confirmed,
    estimate: b.lessThanBilledCents - confirmed,
    total: b.lessThanBilledCents,
    isEstimate: b.isEstimate,
  };
}

export function homeSummary(cases: HomeCase[]): HomeSummary {
  const out: HomeSummary = {
    bills: cases.length,
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
  };
  const rows: { bill: HomeBill; createdAt: string }[] = [];
  for (const c of cases) {
    const group = homeGroup(c.status);
    if (group === "needs_you") out.needsYou += 1;
    else if (group === "waiting") out.waiting += 1;
    else if (group === "reading") out.reading += 1;
    const s = splitSavings(c);
    if (s) {
      out.savingsCents += s.total;
      out.confirmedCents += s.confirmed;
      out.estimateCents += s.estimate;
      out.isEstimate = out.isEstimate || s.isEstimate;
    }
    out.flags += c.flagCount;
    out.callsMade += c.events.filter((e) => e.type === "call.completed").length;
    out.emailsSent += c.actions.filter(
      (a) => a.kind !== "call" && a.sentAt !== null,
    ).length;
    rows.push({
      createdAt: c.createdAt,
      bill: {
        id: c.id,
        group,
        needs: homeNeeds(c),
        savingsCents: s?.total ?? null,
      },
    });
  }
  rows.sort(
    (a, b) =>
      RANK[a.bill.group] - RANK[b.bill.group] ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.bill.id.localeCompare(b.bill.id),
  );
  out.order = rows.map((r) => r.bill);
  return out;
}
