import { copy } from "../copy";
import type { Bill, Flag } from "../schemas";
import { flagId } from "./util";

// A summary bill, or no line carries a code: ask for the itemized bill.
export function detectMissingItemization(bill: Bill): Flag[] {
  const hasCodes = bill.lines.some((l) => l.code);
  if (bill.kind !== "summary" && hasCodes) return [];
  const lineIds = bill.lines.map((l) => l.id);
  return [
    {
      id: flagId("missing_itemization", lineIds),
      lineIds,
      lever: "missing_itemization",
      tier: "rule",
      title: copy.missingItemization.title(),
      explanation: copy.missingItemization.explanation(),
      amountCents: 0,
      evidence: {
        kind: "rule",
        detail:
          bill.kind === "summary"
            ? "The bill is a summary, not an itemized bill."
            : "No line on the bill has a billing code.",
      },
      confidence: 1,
    },
  ];
}
