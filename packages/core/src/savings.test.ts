import { describe, expect, it } from "vitest";

import { bill, eob, line, price } from "./__fixtures__/golden";
import { runAudit } from "./rules";
import { computeSavings } from "./savings";
import type { Flag } from "./schemas";

const flag = (p: Partial<Flag> & Pick<Flag, "lever" | "tier">): Flag => ({
  id: `${p.lever}:x`,
  lineIds: [],
  title: "t",
  explanation: "e",
  amountCents: 0,
  evidence: { kind: "arithmetic", detail: "d" },
  confidence: 1,
  ...p,
});
const dupFlag = (c: number) =>
  flag({
    lever: "duplicate",
    tier: "confirmed",
    amountCents: c,
    lineIds: ["d"],
  });
const eobFlag = (c: number) =>
  flag({ lever: "eob_mismatch", tier: "confirmed", amountCents: c });
const empty = bill([]);

describe("computeSavings", () => {
  it("adds duplicates and the unexplained EOB gap", () => {
    const s = computeSavings([dupFlag(8400), eobFlag(66600)], empty, []);
    expect(s.confirmedCents).toBe(75000);
    expect(s.method[0]).toContain("plus the rest of the gap");
  });

  it("never double counts: confirmed equals max(duplicates, gap) via runAudit", () => {
    const cbc = (id: string) => line({ id, code: "85025", chargeCents: 8400 });
    const big = bill([
      cbc("a"),
      cbc("b"),
      line({ id: "c", code: "1", chargeCents: 100000 }),
    ]);
    const run = (owed: number) =>
      runAudit({
        bill: big,
        eob: eob({ patientResponsibilityCents: owed }),
        unitBounds: [],
        prices: [],
      }).savings.confirmedCents;
    expect(run(big.totals.dueCents - 75000)).toBe(75000); // gap > duplicate
    expect(run(big.totals.dueCents - 5000)).toBe(8400); // gap < duplicate
  });

  it("describes duplicate-only and EOB-only confirmed savings", () => {
    expect(computeSavings([dupFlag(8400)], empty, []).method[0]).toContain(
      "$84.00",
    );
    expect(computeSavings([eobFlag(500)], empty, []).method[0]).toContain(
      "EOB",
    );
  });

  it("adds units to both ends and ignores estimates and zero amounts", () => {
    const s = computeSavings(
      [
        flag({
          lever: "units",
          tier: "rule",
          amountCents: 7600,
          lineIds: ["u"],
        }),
        flag({ lever: "units", tier: "estimate", amountCents: 999 }),
        flag({ lever: "missing_itemization", tier: "rule", amountCents: 0 }),
      ],
      empty,
      [],
    );
    expect(s).toMatchObject({
      confirmedCents: 0,
      potentialLowCents: 7600,
      potentialHighCents: 7600,
      assistance: { status: "unknown" },
    });
  });

  it("never counts a confirmed line again", () => {
    const s = computeSavings(
      [
        dupFlag(8400),
        flag({
          lever: "units",
          tier: "rule",
          amountCents: 7600,
          lineIds: ["d"],
        }),
      ],
      empty,
      [],
    );
    expect(s.potentialHighCents).toBe(0);
  });

  it("ranges published prices from the highest to the lowest reference", () => {
    const m = line({ id: "m", code: "72148", chargeCents: 690000 });
    const p = price({
      code: "72148",
      cashCents: 480000,
      minNegotiatedCents: 300000,
      maxNegotiatedCents: 700000, // above the charge: ignored
    });
    const { flags, savings } = runAudit({
      bill: bill([m]),
      eob: null,
      unitBounds: [],
      prices: [p],
    });
    expect(flags).toHaveLength(1);
    expect(savings.potentialLowCents).toBe(210000);
    expect(savings.potentialHighCents).toBe(390000);
    expect(savings.method.at(-1)).toContain("$2,100.00 to $3,900.00");
  });

  it("skips published flags whose line or price is gone", () => {
    const f = flag({
      lever: "published_price",
      tier: "published",
      amountCents: 100,
      lineIds: ["missing"],
    });
    expect(computeSavings([f], empty, []).potentialHighCents).toBe(0);
    const l = line({ id: "z", code: "9", chargeCents: 100 });
    const g = { ...f, lineIds: ["z"] };
    expect(
      computeSavings([g], bill([l]), [price({ code: "9", cashCents: 500 })])
        .potentialHighCents,
    ).toBe(0);
  });

  it("passes assistance through", () => {
    expect(
      computeSavings([], empty, [], { status: "likely" }).assistance.status,
    ).toBe("likely");
  });

  it("returns zeros for a clean bill via runAudit", () => {
    const { flags, savings } = runAudit({
      bill: bill([line({ id: "a", code: "99284" })]),
      eob: eob({ patientResponsibilityCents: 1_000_000 }),
      unitBounds: [],
      prices: [],
    });
    expect(flags).toEqual([]);
    expect(savings.confirmedCents).toBe(0);
    expect(savings.method).toEqual([]);
  });
});
