import { describe, expect, it } from "bun:test";
import { matchFlags, matchLines } from "./match";

const line = (
  code: string | null,
  chargeCents: number,
  serviceDate: string | null = "2026-09-14",
  units = 1,
) => ({ code, chargeCents, serviceDate, units });

describe("matchFlags", () => {
  it("catches a flag with the same lever and a shared line", () => {
    const r = matchFlags(
      [{ lever: "duplicate", lineIds: ["l4", "l5"] }],
      [{ lever: "duplicate", lineIds: ["l5"] }],
    );
    expect(r.caught).toHaveLength(1);
    expect(r.missed).toHaveLength(0);
    expect(r.extra).toHaveLength(0);
  });

  it("does not match across levers", () => {
    const r = matchFlags(
      [{ lever: "units", lineIds: ["l7"] }],
      [{ lever: "duplicate", lineIds: ["l7"] }],
    );
    expect(r.caught).toHaveLength(0);
    expect(r.missed).toHaveLength(1);
    expect(r.extra).toHaveLength(1);
  });

  it("does not match without a shared line", () => {
    const r = matchFlags(
      [{ lever: "units", lineIds: ["l7"] }],
      [{ lever: "units", lineIds: ["l8"] }],
    );
    expect(r.missed).toHaveLength(1);
    expect(r.extra).toHaveLength(1);
  });

  it("lets one produced flag catch at most one expected flag", () => {
    const r = matchFlags(
      [
        { lever: "eob_mismatch", lineIds: ["l1"] },
        { lever: "eob_mismatch", lineIds: ["l1", "l2"] },
      ],
      [{ lever: "eob_mismatch", lineIds: ["l1", "l2"] }],
    );
    expect(r.caught).toHaveLength(1);
    expect(r.missed).toHaveLength(1);
    expect(r.extra).toHaveLength(0);
  });
});

describe("matchLines", () => {
  it("matches a line whose description was misread", () => {
    const truth = [{ ...line("85025", 8400), description: "CBC W/ AUTO DIFF" }];
    const extracted = [
      { ...line("85025", 8400), description: "CBC W/AUT0 D1FF" },
    ];
    expect(matchLines(truth, extracted).pairs).toHaveLength(1);
  });

  it("does not match a line with the wrong amount", () => {
    const r = matchLines([line("85025", 8400)], [line("85025", 8100)]);
    expect(r.pairs).toHaveLength(0);
  });

  it("matches on amount, date and units when the code is unreadable", () => {
    const r = matchLines([line("85025", 8400)], [line(null, 8400)]);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0]?.score).toBe(4);
  });

  it("pairs identical lines one to one", () => {
    const r = matchLines(
      [line("85025", 8400), line("85025", 8400)],
      [line("85025", 8400)],
    );
    expect(r.pairs).toHaveLength(1);
  });
});
