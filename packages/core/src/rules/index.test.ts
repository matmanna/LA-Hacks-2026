import { describe, expect, it } from "vitest";

import { bill, eob, line, price } from "../__fixtures__/golden";
import { runAudit } from "./index";

const cbc = (id: string) =>
  line({ id, code: "85025", codeType: "CPT", chargeCents: 8400 });
const draw = (id: string, units: number, charge: number) =>
  line({ id, code: "36415", units, chargeCents: charge });
const bound = { code: "36415", maxUnitsPerDay: 2, source: "test fixture" };

describe("runAudit", () => {
  it("runs every lever, sorts by amount then id", () => {
    const b = bill([cbc("l1"), cbc("l2"), draw("v", 4, 15200)]);
    const { flags, savings } = runAudit({
      bill: b,
      eob: eob({ patientResponsibilityCents: b.totals.dueCents - 20000 }),
      unitBounds: [bound],
      prices: [],
    });
    expect(flags.map((f) => f.id)).toEqual([
      "eob_mismatch:l1,v",
      "duplicate:l2",
      "units:v",
    ]);
    expect(flags[0]?.amountCents).toBe(11600);
    expect(savings.confirmedCents).toBe(20000);
    expect(savings.potentialLowCents).toBe(7600);
  });

  it("excludes duplicate lines from units and published price", () => {
    const b = bill([draw("v1", 2, 7600), draw("v2", 2, 7600)]);
    const { flags } = runAudit({
      bill: b,
      eob: null,
      unitBounds: [bound],
      prices: [price({ code: "36415", cashCents: 1 })],
    });
    expect(flags.map((f) => f.lever).sort()).toEqual([
      "duplicate",
      "published_price",
    ]);
    expect(flags.find((f) => f.lever === "published_price")?.lineIds).toEqual([
      "v1",
    ]);
  });

  it("honors enabledLevers", () => {
    const { flags } = runAudit({
      bill: bill([cbc("l1"), cbc("l2")]),
      eob: null,
      unitBounds: [],
      prices: [],
      enabledLevers: ["units"],
    });
    expect(flags).toEqual([]);
  });

  it("keeps explanations to at most two sentences", () => {
    const { flags } = runAudit({
      bill: bill(
        [cbc("l1"), cbc("l2"), draw("v", 4, 15200)],
        {},
        { kind: "summary" },
      ),
      eob: eob({ patientResponsibilityCents: 0 }),
      unitBounds: [bound],
      prices: [price({ code: "85025", cashCents: 100 })],
    });
    expect(flags.length).toBeGreaterThanOrEqual(5);
    for (const f of flags) {
      const sentences = f.explanation.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length).toBeLessThanOrEqual(2);
    }
  });
});
