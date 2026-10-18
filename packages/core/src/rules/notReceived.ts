import { copy } from "../copy";
import type { Bill, Flag } from "../schemas";
import { flagId } from "./util";

// Lines the patient marked as not received. The charge is real (it is on the
// bill); the patient's report is the evidence, so the tier is "reported".
export function detectNotReceived(bill: Bill): Flag[] {
  return bill.lines
    .filter((l) => l.notReceived)
    .map((l) => ({
      id: flagId("not_received", [l.id]),
      lineIds: [l.id],
      lever: "not_received" as const,
      tier: "reported" as const,
      title: copy.notReceived.title(),
      explanation: copy.notReceived.explanation(),
      amountCents: l.chargeCents,
      evidence: {
        kind: "patient" as const,
        detail: `You marked ${l.code ? `${l.code} ` : ""}"${l.description}" on ${l.serviceDate ?? "the bill"} as a service you did not receive.`,
      },
      confidence: 1,
    }));
}
