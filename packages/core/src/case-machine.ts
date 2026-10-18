import { type EventTypeName, OUTBOUND_EVENTS } from "./events";
import type { CaseEvent, CaseStatus } from "./schemas";

type TransitionRule = { from: CaseStatus[] | "any"; to: CaseStatus | "same" };

const TRANSITIONS: Record<EventTypeName, TransitionRule> = {
  "case.created": { from: [], to: "new" },
  "lines.confirmed": {
    from: ["new", "lines_confirmed", "audited"],
    to: "lines_confirmed",
  },
  "audit.completed": { from: ["lines_confirmed", "audited"], to: "audited" },
  "action.drafted": {
    from: ["audited", "action_pending", "sent", "called"],
    to: "action_pending",
  },
  "action.approved": { from: ["action_pending"], to: "same" },
  "action.cancelled": { from: ["action_pending"], to: "same" },
  "action.send_failed": { from: ["action_pending"], to: "same" },
  "action.sent": { from: ["action_pending"], to: "sent" },
  "call.started": { from: ["action_pending"], to: "same" },
  "call.completed": { from: ["action_pending"], to: "called" },
  "call.failed": { from: ["action_pending"], to: "same" },
  "call.dispatching": { from: "any", to: "same" },
  "call.worker_started": { from: "any", to: "same" },
  "call.ringing": { from: "any", to: "same" },
  "call.ready": { from: "any", to: "same" },
  "call.patient_inviting": { from: "any", to: "same" },
  "call.patient_joined": { from: "any", to: "same" },
  "call.patient_briefed": { from: "any", to: "same" },
  "call.billing_connected": { from: "any", to: "same" },
  "call.ai_unavailable": { from: "any", to: "same" },
  "call.patient_left": { from: "any", to: "same" },
  "call.patient_failed": { from: "any", to: "same" },
  "call.conference_completed": { from: "any", to: "same" },
  "call.conference_failed": { from: "any", to: "same" },
  "case.closed": { from: "any", to: "closed" },
};

export class TransitionError extends Error {
  constructor(
    public from: CaseStatus | null,
    public type: string,
  ) {
    super(`Cannot apply ${type} from ${from ?? "no status"}`);
    this.name = "TransitionError";
  }
}

function isAllowed(
  from: TransitionRule["from"],
  current: CaseStatus | null,
): boolean {
  if (from === "any") return current !== null;
  // An empty `from` list means "only as the very first event".
  if (current === null) return from.length === 0;
  return from.includes(current);
}

export function nextStatus(
  current: CaseStatus | null,
  type: EventTypeName,
): CaseStatus {
  // CaseEvent.type is a free string, so an unknown type can reach here at runtime.
  const rule = TRANSITIONS[type];
  if (!rule || !isAllowed(rule.from, current)) {
    throw new TransitionError(current, type);
  }
  // "same" rules all require a non-null current status, checked above.
  return rule.to === "same" ? (current as CaseStatus) : rule.to;
}

export function deriveStatus(events: CaseEvent[]): CaseStatus {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let status: CaseStatus | null = null;
  for (const event of sorted) {
    status = nextStatus(status, event.type as EventTypeName);
  }
  if (status === null) throw new Error("NO_EVENTS");
  return status;
}

export function approvalRef(actionId: string, hash: string): string {
  return `action:${actionId}#sha256:${hash}`;
}

function parseRef(
  artifactRef: string | undefined,
): { actionId: string; hash: string | null } | null {
  const match = /^action:([^#]+)(?:#sha256:(.+))?$/.exec(artifactRef ?? "");
  if (!match) return null;
  return { actionId: match[1] as string, hash: match[2] ?? null };
}

export function findApproval(
  events: CaseEvent[],
  actionId: string,
): { hash: string; at: string } | null {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let approval: { hash: string; at: string } | null = null;
  for (const event of sorted) {
    const ref = parseRef(event.artifactRef);
    if (!ref || ref.actionId !== actionId) continue;
    if (event.type === "action.approved") {
      if (ref.hash) approval = { hash: ref.hash, at: event.at };
    } else if (
      event.type === "action.cancelled" ||
      event.type === "action.drafted"
    ) {
      // A redraft or a cancel invalidates any earlier approval for this action.
      approval = null;
    }
  }
  return approval;
}

export function assertApproved(
  events: CaseEvent[],
  actionId: string,
  currentHash: string,
): void {
  const approval = findApproval(events, actionId);
  if (!approval) throw new Error("NOT_APPROVED");
  if (approval.hash !== currentHash) throw new Error("DRAFT_CHANGED");
}

export function approvalCoverage(events: CaseEvent[]): {
  outbound: number;
  approved: number;
  ratio: number;
} {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let outbound = 0;
  let approved = 0;
  sorted.forEach((event, i) => {
    if (!OUTBOUND_EVENTS.includes(event.type as EventTypeName)) return;
    outbound += 1;
    const hasEarlierApproval = sorted
      .slice(0, i)
      .some(
        (candidate) =>
          candidate.type === "action.approved" &&
          candidate.artifactRef === event.artifactRef,
      );
    if (hasEarlierApproval) approved += 1;
  });
  return {
    outbound,
    approved,
    ratio: outbound === 0 ? 1 : approved / outbound,
  };
}

export function makeEvent(
  input: Omit<CaseEvent, "id" | "at"> & { at?: string },
): CaseEvent {
  return {
    id: globalThis.crypto.randomUUID(),
    at: input.at ?? new Date().toISOString(),
    caseId: input.caseId,
    actor: input.actor,
    type: input.type,
    summary: input.summary,
    artifactRef: input.artifactRef,
  };
}
