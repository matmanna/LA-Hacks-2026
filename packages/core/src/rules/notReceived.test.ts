import { describe, expect, it } from "vitest";

import { bill, line, price } from "../__fixtures__/golden";
import { runAudit } from "./index";
import { detectNotReceived } from "./notReceived";

describe("detectNotReceived", () => {
  it("flags each line the patient did not receive, full charge, reported tier", () => {
    const f = detectNotReceived(
      bill([
        line({ id: "a", code: "36415", chargeCents: 3800, notReceived: true }),
        line({ id: "b", code: "85025" }),
      ]),
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({
      id: "not_received:a",
      lineIds: ["a"],
      lever: "not_received",
      tier: "reported",
      amountCents: 3800,
      title: "You said you didn't get this",
      evidence: { kind: "patient" },
    });
  });

  it("ignores lines without the mark (field is optional)", () => {
    expect(detectNotReceived(bill([line({ id: "a" })]))).toEqual([]);
  });
});

describe("runAudit with lines not received", () => {
  const audit = (lines: ReturnType<typeof line>[], cashCents = 1000) =>
    runAudit({
      bill: bill(lines),
      eob: null,
      unitBounds: [],
      prices: [price({ code: "72148", cashCents })],
    });

  it("does not run other levers on a line the patient did not receive", () => {
    const { flags } = audit([
      line({
        id: "mri",
        code: "72148",
        chargeCents: 5000,
        notReceived: true,
      }),
    ]);
    expect(flags.map((f) => f.lever)).toEqual(["not_received"]);
  });

  it("does not count a not-received line as a duplicate", () => {
    const { flags } = audit([
      line({ id: "a", code: "85025", chargeCents: 8400 }),
      line({ id: "b", code: "85025", chargeCents: 8400, notReceived: true }),
    ]);
    expect(flags.map((f) => f.lever)).toEqual(["not_received"]);
  });

  it("adds to the potential range only, never confirmed", () => {
    const { savings } = audit([
      line({ id: "a", code: "36415", chargeCents: 3800, notReceived: true }),
    ]);
    expect(savings.confirmedCents).toBe(0);
    expect(savings.potentialLowCents).toBe(0);
    expect(savings.potentialHighCents).toBe(3800);
    expect(savings.method.join(" ")).toContain("did not receive");
  });

  it("can be switched off with enabledLevers", () => {
    const { flags } = runAudit({
      bill: bill([line({ id: "a", code: "1", notReceived: true })]),
      eob: null,
      unitBounds: [],
      prices: [],
      enabledLevers: ["duplicate"],
    });
    expect(flags).toEqual([]);
  });
});
