import { copy } from "../copy";
import type { Bill, Flag, Line } from "../schemas";
import { flagId, minConfidence, normalize } from "./util";

// Same date, same code (or description), same units, same charge. The first
// line stays; the 2nd to nth lines are flagged.
export function detectDuplicates(bill: Bill): Flag[] {
  const groups = new Map<string, Line[]>();
  for (const l of bill.lines) {
    if (l.serviceDate === null) continue;
    const key = [
      l.serviceDate,
      l.code ?? normalize(l.description),
      l.units,
      l.chargeCents,
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const flags: Flag[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [first, ...extra] = group as [Line, ...Line[]];
    const lineIds = extra.map((l) => l.id);
    const n = group.length;
    flags.push({
      id: flagId("duplicate", lineIds),
      lineIds,
      lever: "duplicate",
      tier: "confirmed",
      title: copy.duplicate.title(n),
      explanation: copy.duplicate.explanation(n),
      amountCents: extra.reduce((s, l) => s + l.chargeCents, 0),
      evidence: {
        kind: "arithmetic",
        detail: `${first.code ?? first.description} on ${first.serviceDate} appears ${n} times at the same charge.`,
      },
      confidence: minConfidence(group),
    });
  }
  return flags;
}
