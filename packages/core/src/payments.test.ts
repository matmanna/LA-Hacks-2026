import { describe, expect, it } from "vitest";
import {
  applyDevOverride,
  DEV_FEE_CENTS,
  FEE_BPS,
  MAX_FEE_CENTS,
  MIN_FEE_CENTS,
  percentLabel,
  savingsFee,
} from "./payments";

describe("savingsFee", () => {
  it("owes nothing with zero, negative, or non-finite savings", () => {
    for (const v of [0, -500, Number.NaN, Number.POSITIVE_INFINITY]) {
      const f = savingsFee(v);
      expect(f.owed).toBe(false);
      expect(f.feeCents).toBe(0);
    }
  });
  it("owes nothing below the minimum fee", () => {
    expect(savingsFee(MIN_FEE_CENTS - 1).owed).toBe(false);
  });
  it("applies the minimum fee but never more than the savings", () => {
    expect(savingsFee(MIN_FEE_CENTS).feeCents).toBe(MIN_FEE_CENTS);
    expect(savingsFee(100).feeCents).toBe(MIN_FEE_CENTS);
  });
  it("takes FEE_BPS of confirmed savings, rounding half up", () => {
    expect(FEE_BPS).toBe(1000);
    expect(savingsFee(8400).feeCents).toBe(840);
    expect(savingsFee(1235).feeCents).toBe(124); // 123.5 rounds up
    expect(savingsFee(1234).feeCents).toBe(123);
  });
  it("caps the fee", () => {
    const f = savingsFee(10_000_000);
    expect(f.feeCents).toBe(MAX_FEE_CENTS);
    expect(f.capped).toBe(true);
    expect(savingsFee(1_000_000).capped).toBe(false);
  });
  it("truncates fractional cents in the input and returns integers", () => {
    const f = savingsFee(8400.9);
    expect(f.confirmedCents).toBe(8400);
    expect(Number.isInteger(f.feeCents)).toBe(true);
  });
  it("formats the percent", () => {
    expect(percentLabel(1000)).toBe("10%");
    expect(percentLabel(1250)).toBe("12.5%");
  });
});

describe("applyDevOverride", () => {
  const fee = savingsFee(8400);
  const opts = { promoCode: "BBDEV50", devPromoCode: "BBDEV50" };
  it("charges exactly 50 cents in the sandbox with the matching code", () => {
    for (const server of [undefined, "sandbox", "anything"]) {
      const f = applyDevOverride(fee, { ...opts, server });
      expect(f.feeCents).toBe(DEV_FEE_CENTS);
      expect(f.devOverride).toBe(true);
    }
  });
  it("is impossible in production server mode", () => {
    const f = applyDevOverride(fee, { ...opts, server: "production" });
    expect(f).toEqual(fee);
  });
  it("ignores wrong, missing, or unconfigured codes", () => {
    expect(applyDevOverride(fee, { ...opts, promoCode: "x" })).toEqual(fee);
    expect(applyDevOverride(fee, { ...opts, promoCode: null })).toEqual(fee);
    expect(applyDevOverride(fee, { ...opts, devPromoCode: "" })).toEqual(fee);
    expect(applyDevOverride(fee, { promoCode: "", devPromoCode: "" })).toEqual(
      fee,
    );
  });
  it("does not create a charge when nothing is owed", () => {
    const none = savingsFee(0);
    expect(applyDevOverride(none, opts).feeCents).toBe(0);
  });
});
