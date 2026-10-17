import { describe, expect, it } from "vitest";

import { balanceSummary } from "./balance";
import type { Savings } from "./schemas";

const base: Savings = {
  confirmedCents: 0,
  potentialLowCents: 0,
  potentialHighCents: 0,
  assistance: { status: "unknown" },
  method: [],
};

describe("balanceSummary", () => {
  it("subtracts confirmed only and is not an estimate", () => {
    expect(
      balanceSummary(1_200_000, { ...base, confirmedCents: 8_400 }),
    ).toEqual({
      billedCents: 1_200_000,
      fairBalanceCents: 1_191_600,
      fairBalanceLowCents: 1_191_600,
      lessThanBilledCents: 8_400,
      isEstimate: false,
    });
  });

  it("uses potentialLow for the fair balance and potentialHigh for the low end", () => {
    const s = balanceSummary(1_200_000, {
      ...base,
      confirmedCents: 8_400,
      potentialLowCents: 100_000,
      potentialHighCents: 175_685,
    });
    expect(s.fairBalanceCents).toBe(1_091_600);
    expect(s.fairBalanceLowCents).toBe(1_015_915);
    expect(s.lessThanBilledCents).toBe(108_400);
    expect(s.isEstimate).toBe(true);
  });

  it("marks an estimate when assistance is likely or possible", () => {
    for (const status of ["likely", "possible"] as const) {
      expect(
        balanceSummary(5_000, { ...base, assistance: { status } }).isEstimate,
      ).toBe(true);
    }
    expect(
      balanceSummary(5_000, { ...base, assistance: { status: "unlikely" } })
        .isEstimate,
    ).toBe(false);
  });

  it("never goes below zero", () => {
    const s = balanceSummary(5_000, {
      ...base,
      confirmedCents: 4_000,
      potentialLowCents: 2_000,
      potentialHighCents: 3_000,
    });
    expect(s.fairBalanceCents).toBe(0);
    expect(s.fairBalanceLowCents).toBe(0);
    expect(s.lessThanBilledCents).toBe(5_000);
  });
});
