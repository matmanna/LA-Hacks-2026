export const EventType = {
  caseCreated: "case.created",
  linesConfirmed: "lines.confirmed",
  auditCompleted: "audit.completed",
  actionDrafted: "action.drafted",
  actionApproved: "action.approved",
  actionCancelled: "action.cancelled",
  actionSent: "action.sent",
  actionSendFailed: "action.send_failed",
  callStarted: "call.started",
  callCompleted: "call.completed",
  callFailed: "call.failed",
  caseClosed: "case.closed",
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

export const OUTBOUND_EVENTS: EventTypeName[] = ["action.sent", "call.started"];

export const EVENT_TITLES: Record<EventTypeName, string> = {
  "case.created": "Case started",
  "lines.confirmed": "You confirmed the lines",
  "audit.completed": "Bill checked",
  "action.drafted": "Draft ready for you",
  "action.approved": "You approved it",
  "action.cancelled": "You cancelled it",
  "action.sent": "Letter sent",
  "action.send_failed": "Letter not sent",
  "call.started": "Call started",
  "call.completed": "Call finished",
  "call.failed": "Call did not connect",
  "case.closed": "Case closed",
};
