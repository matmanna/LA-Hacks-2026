import { describe, expect, it } from "vitest";

import { formatMoney, moneyParts, parseMoneyToCents } from "./money";

describe("money", () => {
  it("formats", () => {
    expect(formatMoney(8400)).toBe("$84.00");
    expect(formatMoney(-102247)).toBe("−$1,022.47");
    expect(formatMoney(0)).toBe("$0.00");
    expect(formatMoney(5)).toBe("$0.05");
    expect(moneyParts(260937)).toEqual({
      sign: "",
      dollars: "2,609",
      cents: "37",
    });
    expect(formatMoney(1_200_000)).toBe("$12,000.00");
  });

  it("parses", () => {
    expect(parseMoneyToCents("1,234.50")).toBe(123450);
    expect(parseMoneyToCents("$84")).toBe(8400);
    expect(parseMoneyToCents(" 84.5 ")).toBe(8450);
    expect(parseMoneyToCents("-$5.05")).toBe(-505);
    expect(parseMoneyToCents("−12.00")).toBe(-1200);
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("1.234")).toBeNull();
    expect(parseMoneyToCents("")).toBeNull();
  });
});
