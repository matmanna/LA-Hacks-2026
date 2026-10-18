import { copy } from "../copy";
import { formatMoney } from "../money";
import type { Bill, Eob, Flag } from "../schemas";
import { flagId } from "./util";

// The bill asks for more than the EOB's patient responsibility. The amount is
// the part of the gap not already explained by confirmed duplicates, so the
// two never overlap. lineIds are the bill's lines the gap applies to.
export function detectEobMismatch(
  bill: Bill,
  eob: Eob | null,
  explainedCents = 0,
): Flag[] {
  if (!eob) return [];
  const due = bill.totals.dueCents;
  const owed = eob.patientResponsibilityCents;
  const amountCents = due - owed - explainedCents;
  if (amountCents <= 0) return [];
  const lineIds = bill.lines.map((l) => l.id);
  return [
    {
      id: flagId("eob_mismatch", lineIds),
      lineIds,
      lever: "eob_mismatch",
      tier: "confirmed",
      title: copy.eobMismatch.title(),
      explanation: copy.eobMismatch.explanation(due, owed),
      amountCents,
      evidence: {
        kind: "arithmetic",
        detail:
          explainedCents > 0
            ? `Bill asks ${formatMoney(due)}; ${eob.payer}'s EOB says you owe ${formatMoney(owed)}. ${formatMoney(explainedCents)} of the gap is already flagged as duplicates.`
            : `Bill asks ${formatMoney(due)}; ${eob.payer}'s EOB says you owe ${formatMoney(owed)}.`,
      },
      confidence: 1,
    },
  ];
}
