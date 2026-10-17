import { describe, expect, it } from "vitest";

import { bill, line } from "../__fixtures__/golden";
import { detectDuplicates } from "./duplicate";

const cbc = (id: string, date: string | null = "2026-09-12") =>
  line({
    id,
    serviceDate: date,
    code: "85025",
    codeType: "CPT",
    description: "CBC W/ DIFFERENTIAL",
    units: 1,
    chargeCents: 8400,
  });

describe("detectDuplicates", () => {
  it("flags CBC 85025 $84 twice same date", () => {
    const flags = detectDuplicates(bill([cbc("l1"), cbc("l2")]));
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      id: "duplicate:l2",
      lever: "duplicate",
      tier: "confirmed",
      lineIds: ["l2"],
      amountCents: 8400,
      title: "Listed twice on the same date",
    });
    expect(flags[0]?.explanation).toContain("Ask billing whether you had two");
  });

  it("flags 3 copies as two extra lines", () => {
    const [f] = detectDuplicates(bill([cbc("l1"), cbc("l2"), cbc("l3")]));
    expect(f).toMatchObject({ lineIds: ["l2", "l3"], amountCents: 16800 });
    expect(f?.title).toBe("Listed 3 times on the same date");
  });

  it("does not flag same code on different dates", () => {
    expect(
      detectDuplicates(
        bill([cbc("l1", "2026-09-12"), cbc("l2", "2026-09-13")]),
      ),
    ).toEqual([]);
  });

  it("does not flag same code same date different amount", () => {
    expect(
      detectDuplicates(bill([cbc("l1"), { ...cbc("l2"), chargeCents: 9100 }])),
    ).toEqual([]);
  });

  it("skips lines without a service date", () => {
    expect(detectDuplicates(bill([cbc("l1", null), cbc("l2", null)]))).toEqual(
      [],
    );
  });

  it("groups uncoded lines by normalized description", () => {
    const a = line({ id: "a", description: "Room  Charge", chargeCents: 500 });
    const b = line({ id: "b", description: "room charge ", chargeCents: 500 });
    expect(detectDuplicates(bill([a, b]))[0]?.lineIds).toEqual(["b"]);
  });

  it("uses the lowest line confidence", () => {
    const [f] = detectDuplicates(
      bill([cbc("l1"), { ...cbc("l2"), confidence: 0.6 }]),
    );
    expect(f?.confidence).toBe(0.6);
  });
});
