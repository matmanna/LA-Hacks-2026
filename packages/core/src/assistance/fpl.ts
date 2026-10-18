import type { FplTable, Limit } from "./types";

// Annual poverty guideline in cents for a household, from the HHS table.
// Alaska and Hawaii have their own columns; everything else uses the 48 + DC.
export function povertyLineCents(
  table: FplTable,
  householdSize: number,
  state: string | null,
): number {
  const col =
    state === "AK"
      ? table.alaska
      : state === "HI"
        ? table.hawaii
        : table.contiguous48AndDC;
  const n = Math.max(1, Math.floor(householdSize));
  const base = n <= 8 ? col[String(n)] : col["8"];
  const extra = n > 8 ? (n - 8) * (col.additionalPerson ?? 0) : 0;
  if (base === undefined) throw new Error(`No poverty line for ${n} people`);
  return (base + extra) * 100;
}

export function fplPercent(
  incomeCents: number,
  householdSize: number,
  state: string | null,
  table: FplTable,
): number {
  return (incomeCents / povertyLineCents(table, householdSize, state)) * 100;
}

export function within(pct: number, limit: Limit | undefined): boolean {
  if (!limit) return false;
  return limit.inclusive ? pct <= limit.pct : pct < limit.pct;
}
