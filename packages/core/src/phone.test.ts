import { describe, expect, it } from "vitest";

import { isDialableNumber } from "./call";
import { validConferenceDestinations } from "./conference";
import { formatPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("accepts US numbers in common shapes", () => {
    expect(normalizePhone("(415) 555-0123")).toBe("+14155550123");
    expect(normalizePhone("415.555.0123")).toBe("+14155550123");
    expect(normalizePhone("1 415 555 0123")).toBe("+14155550123");
    expect(normalizePhone("+1 415-555-0123")).toBe("+14155550123");
  });
  it("accepts other countries only with a plus", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("44 20 7946 0958")).toBeNull();
  });
  it("rejects things that are not numbers", () => {
    for (const bad of [
      "",
      "abc",
      "555-0123",
      "015 555 0123",
      "+1",
      "4155550123x",
    ])
      expect(normalizePhone(bad)).toBeNull();
  });
  it("formats US numbers", () => {
    expect(formatPhone("+14155550123")).toBe("(415) 555-0123");
    expect(formatPhone("+442079460958")).toBe("+442079460958");
  });
});

describe("isDialableNumber", () => {
  it("uses the allowlist unless user numbers are on", () => {
    expect(isDialableNumber("+14155550123", "+14155550123", false)).toBe(true);
    expect(isDialableNumber("+14155550124", "+14155550123", false)).toBe(false);
    expect(isDialableNumber("+14155550124", "+14155550123", true)).toBe(true);
    expect(isDialableNumber("415", "", true)).toBe(false);
  });
  it("applies to both sides of a conference", () => {
    expect(
      validConferenceDestinations("+14155550124", "+14155550125", "", true),
    ).toBe(true);
    expect(
      validConferenceDestinations("+14155550124", "+14155550125", "", false),
    ).toBe(false);
    expect(
      validConferenceDestinations("+14155550124", "+14155550124", "", true),
    ).toBe(false);
  });
});
