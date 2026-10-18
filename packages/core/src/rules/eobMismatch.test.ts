import { describe, expect, it } from "vitest";

import { bill, eob, line } from "../__fixtures__/golden";
import { detectEobMismatch } from "./eobMismatch";

describe("detectEobMismatch", () => {
  it("flags due $1,200.00 vs EOB patient responsibility $450.00", () => {
    const f = detectEobMismatch(
      bill([], { dueCents: 120000 }),
      eob({ patientResponsibilityCents: 45000 }),
    );
    expect(f[0]).toMatchObject({
      id: "eob_mismatch:bill",
      lineIds: [],
      tier: "confirmed",
      amountCents: 75000,
    });
    expect(f[0]?.explanation).toContain("$450.00");
  });

  it("subtracts amounts already explained and lists the bill's lines", () => {
    const f = detectEobMismatch(
      bill([line({ id: "x", chargeCents: 120000 })]),
      eob({ patientResponsibilityCents: 45000 }),
      8400,
    );
    expect(f[0]).toMatchObject({
      id: "eob_mismatch:x",
      lineIds: ["x"],
      amountCents: 66600,
    });
    expect(f[0]?.evidence.detail).toContain("duplicates");
    expect(
      detectEobMismatch(
        bill([], { dueCents: 100 }),
        eob({ patientResponsibilityCents: 0 }),
        100,
      ),
    ).toEqual([]);
  });

  it("does nothing without an EOB or when the bill is not higher", () => {
    expect(detectEobMismatch(bill([], { dueCents: 100 }), null)).toEqual([]);
    expect(
      detectEobMismatch(
        bill([], { dueCents: 100 }),
        eob({ patientResponsibilityCents: 100 }),
      ),
    ).toEqual([]);
  });
});
