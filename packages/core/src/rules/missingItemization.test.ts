import { describe, expect, it } from "vitest";

import { bill, line } from "../__fixtures__/golden";
import { detectMissingItemization } from "./missingItemization";

describe("detectMissingItemization", () => {
  it("flags a summary bill with amount 0", () => {
    const f = detectMissingItemization(
      bill([line({ id: "a", code: "1" })], {}, { kind: "summary" }),
    );
    expect(f[0]).toMatchObject({
      id: "missing_itemization:a",
      lineIds: ["a"],
      tier: "rule",
      amountCents: 0,
      title: "Ask for an itemized bill",
    });
  });

  it("flags an itemized bill with no codes", () => {
    expect(detectMissingItemization(bill([line({ id: "a" })]))).toHaveLength(1);
  });

  it("passes an itemized bill with codes", () => {
    expect(
      detectMissingItemization(bill([line({ id: "a", code: "1" })])),
    ).toEqual([]);
  });
});
