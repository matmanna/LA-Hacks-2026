import { copy } from "../copy";
import type { Bill, Flag, Line } from "../schemas";
import type { UnitBound } from "./types";
import { flagId, minConfidence } from "./util";

// Units per (date, code) above the bound. Amount = per-unit price x excess.
export function detectUnitAnomalies(bill: Bill, bounds: UnitBound[]): Flag[] {
  const byCode = new Map(bounds.map((b) => [b.code, b]));
  const groups = new Map<string, Line[]>();
  for (const l of bill.lines) {
    if (!l.code || !byCode.has(l.code)) continue;
    const key = `${l.serviceDate ?? "?"}|${l.code}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const flags: Flag[] = [];
  for (const group of groups.values()) {
    const code = group[0]?.code as string;
    const bound = byCode.get(code) as UnitBound;
    const units = group.reduce((s, l) => s + l.units, 0);
    const excess = units - bound.maxUnitsPerDay;
    if (excess <= 0) continue;
    const charge = group.reduce((s, l) => s + l.chargeCents, 0);
    const lineIds = group.map((l) => l.id);
    flags.push({
      id: flagId("units", lineIds),
      lineIds,
      lever: "units",
      tier: "rule",
      title: copy.units.title(),
      explanation: copy.units.explanation(units, bound.maxUnitsPerDay),
      amountCents: Math.round(charge / units) * excess,
      evidence: {
        kind: "rule",
        detail: `${code}: ${units} units billed, limit ${bound.maxUnitsPerDay} per day (${bound.source}).`,
        ...(bound.sourceUrl ? { sourceUrl: bound.sourceUrl } : {}),
      },
      confidence: minConfidence(group),
    });
  }
  return flags;
}
