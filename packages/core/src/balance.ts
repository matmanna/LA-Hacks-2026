import type { BalanceSummary, Savings } from "./schemas";

// Shared context section 6. Fair balances never go below zero, so
// lessThanBilledCents never exceeds what the patient was billed.
export function balanceSummary(
  billedCents: number,
  savings: Savings,
): BalanceSummary {
  const fairBalanceCents = Math.max(
    0,
    billedCents - savings.confirmedCents - savings.potentialLowCents,
  );
  const fairBalanceLowCents = Math.max(
    0,
    billedCents - savings.confirmedCents - savings.potentialHighCents,
  );
  const assistanceIncluded =
    savings.assistance.status === "likely" ||
    savings.assistance.status === "possible";
  return {
    billedCents,
    fairBalanceCents,
    fairBalanceLowCents,
    lessThanBilledCents: billedCents - fairBalanceCents,
    isEstimate:
      savings.potentialLowCents > 0 ||
      savings.potentialHighCents > 0 ||
      assistanceIncluded,
  };
}
