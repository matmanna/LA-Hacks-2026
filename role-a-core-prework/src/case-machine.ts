import { OUTBOUND_EVENTS, type EventTypeName } from "./events.js";
import type { CaseEvent, CaseStatus } from "./schemas.js";

type TransitionRule = { from: CaseStatus[] | "any"; to: CaseStatus | "same" };

const TRANSITIONS: Record<EventTypeName, TransitionRule> = {
  "case.created": { from: [], to: "new" },
  "lines.confirmed": { from: ["new", "lines_confirmed", "audited"], to: "lines_confirmed" },
  "audit.completed": { from: ["lines_confirmed", "audited"], to: "audited" },
  "action.drafted": { from: ["audited", "action_pending", "sent", "called"], to: "action_pending" },
  "action.approved": { from: ["action_pending"], to: "same" },
  "action.cancelled": { from: ["action_pending"], to: "same" },
  "action.send_failed": { from: ["action_pending"], to: "same" },
  "action.sent": { from: ["action_pending"], to: "sent" },
  "call.started": { from: ["action_pending"], to: "same" },
  "call.completed": { from: ["action_pending"], to: "called" },
  "call.failed": { from: ["action_pending"], to: "same" },
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

export function nextStatus(current: CaseStatus | null, type: EventTypeName): CaseStatus {
  const rule = TRANSITIONS[type];
  if (!rule) throw new TransitionError(current, type);

  if (rule.from === "any") {
    if (current === null) throw new TransitionError(current, type);
    return rule.to === "same" ? current : rule.to;
  }

  if (rule.from.length === 0) {
    // Only valid as the very first event in the log.
    if (current !== null) throw new TransitionError(current, type);
    return rule.to as CaseStatus;
  }

  if (current === null || !rule.from.includes(current)) {
    throw new TransitionError(current, type);
  }
  return rule.to === "same" ? current : rule.to;
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

function parseActionId(artifactRef: string | undefined): string | null {
  if (!artifactRef) return null;
  const match = /^action:([^#]+)/.exec(artifactRef);
  return match ? match[1] : null;
}

function parseHash(artifactRef: string | undefined): string | null {
  if (!artifactRef) return null;
  const match = /^action:[^#]+#sha256:(.+)$/.exec(artifactRef);
  return match ? match[1] : null;
}

export function findApproval(events: CaseEvent[], actionId: string): { hash: string; at: string } | null {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let approval: { hash: string; at: string } | null = null;
  for (const event of sorted) {
    if (parseActionId(event.artifactRef) !== actionId) continue;
    if (event.type === "action.approved") {
      const hash = parseHash(event.artifactRef);
      if (hash) approval = { hash, at: event.at };
    } else if (event.type === "action.cancelled" || event.type === "action.drafted") {
      // A redraft or a cancel invalidates any earlier approval for this action.
      approval = null;
    }
  }
  return approval;
}

export function assertApproved(events: CaseEvent[], actionId: string, currentHash: string): void {
  const approval = findApproval(events, actionId);
  if (!approval) throw new Error("NOT_APPROVED");
  if (approval.hash !== currentHash) throw new Error("DRAFT_CHANGED");
}

export function approvalCoverage(events: CaseEvent[]): { outbound: number; approved: number; ratio: number } {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let outbound = 0;
  let approved = 0;
  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i];
    if (!OUTBOUND_EVENTS.includes(event.type as EventTypeName)) continue;
    outbound += 1;
    const hasEarlierApproval = sorted
      .slice(0, i)
      .some((candidate) => candidate.type === "action.approved" && candidate.artifactRef === event.artifactRef);
    if (hasEarlierApproval) approved += 1;
  }
  return { outbound, approved, ratio: outbound === 0 ? 1 : approved / outbound };
}

export function makeEvent(input: Omit<CaseEvent, "id" | "at"> & { at?: string }): CaseEvent {
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
