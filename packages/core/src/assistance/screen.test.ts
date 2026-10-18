import { describe, expect, it } from "vitest";

import { bill, line } from "../__fixtures__/golden";
import { balanceSummary } from "../balance";
import { fallbackModelOutput } from "../letters/fallback";
import { computeSavings } from "../savings";
import { fplPercent, povertyLineCents } from "./fpl";
import { assistanceFlag } from "./letter";
import {
  findPolicy,
  incomeBands,
  incomeLimits,
  screenAssistance,
  shortHospitalName,
} from "./screen";
import type {
  FplTable,
  HospitalPolicy,
  RegulationRule,
  ScreenInput,
} from "./types";

// 2026 HHS guidelines (public), the columns the screener reads.
const FPL: FplTable = {
  year: 2026,
  source:
    "https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines",
  contiguous48AndDC: {
    "1": 15960,
    "2": 21640,
    "3": 27320,
    "4": 33000,
    "5": 38680,
    "6": 44360,
    "7": 50040,
    "8": 55720,
    additionalPerson: 5680,
  },
  alaska: { "1": 19950, "3": 34150, "8": 69650, additionalPerson: 7100 },
  hawaii: { "1": 18360, "3": 31420, "8": 64070, additionalPerson: 6530 },
};

// Synthetic policy and rules: shapes match data/, values are made up here.
const POLICY: HospitalPolicy = {
  hospitalName: "Westside General Hospital (synthetic)",
  policyTitle: "Financial Assistance Policy",
  policyUrl: "https://example.test/fap",
  capturedAt: "2026-10-17T23:10:40Z",
  freeCareMaxFplPct: 400,
  freeCareQuote: "Free care at or below 400% of FPL.",
  discountMaxFplPct: 600,
  discountQuote: "Discounts from 401% to 600% of FPL.",
  references501r: "Internal Revenue Code Section 501(r)(3).",
};

const rule = (p: Partial<RegulationRule> & { id: string }): RegulationRule => ({
  jurisdiction: "CA",
  title: p.id,
  effectKind: "eligibility",
  plain: `${p.id} plain`,
  citation: `${p.id} citation`,
  sourceUrl: `https://example.test/${p.id}`,
  quote: `${p.id} quote`,
  capturedAt: "2026-10-18",
  verified: true,
  ...p,
});

const RULES: RegulationRule[] = [
  rule({
    id: "ca-fpq",
    lawName: "California Hospital Fair Pricing Act",
    screen: { help: { pct: 400, inclusive: true }, insured: "high_costs" },
  }),
  rule({
    id: "ca-collections",
    effectKind: "collections_limit",
    short: "No credit reporting",
  }),
  rule({ id: "ca-plan", effectKind: "payment_plan", short: "Interest-free" }),
  rule({
    id: "ny-free",
    jurisdiction: "NY",
    screen: {
      free: { pct: 200, inclusive: false },
      help: { pct: 400, inclusive: true },
      insured: "underinsured",
    },
  }),
  rule({
    id: "wa-charity",
    jurisdiction: "WA",
    screen: {
      free: { pct: 200, inclusive: true },
      freeLarge: { pct: 300, inclusive: true },
      help: { pct: 300, inclusive: true },
      helpLarge: { pct: 400, inclusive: true },
      insured: "any",
    },
  }),
  rule({
    id: "md-free",
    jurisdiction: "MD",
    screen: {
      free: { pct: 200, inclusive: true },
      help: { pct: 300, inclusive: true },
      hardship: { pct: 500, inclusive: true },
      insured: "any",
    },
  }),
  rule({
    id: "il-uninsured",
    jurisdiction: "IL",
    verified: false,
    screen: { help: { pct: 600, inclusive: true }, insured: "any" },
  }),
  rule({ id: "us-501r-agb", jurisdiction: "US", short: "AGB cap" }),
  rule({ id: "us-nsa-emergency", jurisdiction: "US", short: "ER cap" }),
  rule({ id: "us-nsa-gfe", jurisdiction: "US", short: "Estimate dispute" }),
  rule({ id: "us-medicare-itemized", jurisdiction: "US", short: "30 days" }),
];

const input = (p: Partial<ScreenInput> = {}): ScreenInput => ({
  state: "CA",
  hospitalName: POLICY.hospitalName,
  policy: POLICY,
  rules: RULES,
  fpl: FPL,
  ...p,
});

// Income at a given percent of the poverty line for a household.
const at = (pct: number, size = 3, state = "CA") =>
  Math.round((povertyLineCents(FPL, size, state) * pct) / 100);

const byId = (a: ReturnType<typeof screenAssistance>, id: string) =>
  a.checks?.find((c) => c.id === id);

describe("poverty line", () => {
  it("reads the household column in cents, with Alaska, Hawaii and 9+", () => {
    expect(povertyLineCents(FPL, 3, "CA")).toBe(2_732_000);
    expect(povertyLineCents(FPL, 3, "AK")).toBe(3_415_000);
    expect(povertyLineCents(FPL, 3, "HI")).toBe(3_142_000);
    expect(povertyLineCents(FPL, 10, "CA")).toBe((55720 + 2 * 5680) * 100);
  });

  it("gives the demo patient about 190% (household 3, $52,000)", () => {
    expect(fplPercent(5_200_000, 3, "CA", FPL)).toBeCloseTo(190.3, 1);
  });
});

describe("screenAssistance, demo-like case (CA, policy free to 400%)", () => {
  const a = screenAssistance(
    input({
      answers: {
        householdSize: 3,
        annualIncomeCents: 5_200_000,
        insurance: "none",
      },
    }),
  );

  it("is likely free care, quoting the hospital policy", () => {
    expect(a.status).toBe("likely");
    expect(a.freeCare).toBe(true);
    expect(a.quote).toBe(POLICY.freeCareQuote);
    expect(a.sourceUrl).toBe(POLICY.policyUrl);
  });

  it("shows every check, including the ones that don't apply", () => {
    expect(a.checks?.map((c) => [c.id, c.outcome])).toEqual([
      ["policy", "may_help"],
      ["state:ca-fpq", "may_help"],
      ["collections:ca-collections", "may_help"],
      ["federal:us-501r-agb", "may_help"],
      ["federal:nsa", "needs_info"],
      ["federal:us-medicare-itemized", "not_applicable"],
      ["insurance", "not_applicable"],
      ["income", "may_help"],
    ]);
    expect(byId(a, "policy")?.title).toBe(
      "Westside General's assistance policy",
    );
    expect(byId(a, "state:ca-fpq")?.title).toBe(
      "California Hospital Fair Pricing Act",
    );
    expect(byId(a, "income")?.finding).toBe(
      "Under 400% of the poverty line for 3 people",
    );
    expect(byId(a, "federal:nsa")?.finding).toBe("Estimate dispute");
  });

  it("lists the state's rights and asks about income", () => {
    expect(a.rights?.map((r) => r.text)).toEqual([
      "No credit reporting",
      "Interest-free",
    ]);
    expect(a.asksIncome).toBe(true);
  });
});

describe("screenAssistance outcomes", () => {
  it("is unknown without answers, but still shows what each rule needs", () => {
    const a = screenAssistance(input());
    expect(a.status).toBe("unknown");
    expect(a.freeCare).toBe(false);
    expect(byId(a, "policy")).toMatchObject({
      outcome: "needs_info",
      finding:
        "Free care at or under 400% of the poverty line, discounts up to 600%",
    });
    expect(byId(a, "state:ca-fpq")?.finding).toBe(
      "Free or discounted care up to 400% of the poverty line",
    );
    expect(byId(a, "income")).toBeUndefined();
    expect(a.incomeBands).toBeUndefined();
  });

  it("is possible in the policy's discount range, and the state law is above", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: at(450) } }),
    );
    expect(a.status).toBe("possible");
    expect(a.freeCare).toBe(false);
    expect(a.quote).toBe(POLICY.discountQuote);
    expect(byId(a, "state:ca-fpq")?.outcome).toBe("not_applicable");
    expect(byId(a, "income")?.finding).toBe(
      "Between 400% and 600% of the poverty line for 3 people",
    );
  });

  it("is unlikely above every limit", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 1, annualIncomeCents: at(700, 1) } }),
    );
    expect(a.status).toBe("unlikely");
    expect(byId(a, "policy")?.outcome).toBe("not_applicable");
    expect(byId(a, "federal:us-501r-agb")?.outcome).toBe("not_applicable");
    expect(byId(a, "income")?.finding).toBe(
      "Over 600% of the poverty line for 1 person",
    );
  });

  it("asks insured CA patients about high costs instead of deciding", () => {
    const a = screenAssistance(
      input({
        policy: null,
        answers: {
          householdSize: 3,
          annualIncomeCents: at(150),
          insurance: "private",
          emergency: true,
        },
      }),
    );
    expect(byId(a, "state:ca-fpq")?.outcome).toBe("needs_info");
    expect(a.status).toBe("unknown");
    expect(byId(a, "federal:nsa")).toMatchObject({
      outcome: "may_help",
      finding: "ER cap",
    });
  });

  it("NY: under 200% is free, exactly 200% is a discount", () => {
    const s = (pct: number) =>
      screenAssistance(
        input({
          state: "NY",
          policy: null,
          answers: { householdSize: 2, annualIncomeCents: at(pct, 2, "NY") },
        }),
      );
    expect(s(199).status).toBe("likely");
    expect(s(200).status).toBe("possible");
    // Above the state's limit, but the hospital's own policy isn't on file,
    // so it may still be more generous: unknown, not unlikely.
    expect(s(401).status).toBe("unknown");
  });

  it("WA: 250% is free at large systems only, so it counts as possible", () => {
    const a = screenAssistance(
      input({
        state: "WA",
        policy: null,
        answers: { householdSize: 3, annualIncomeCents: at(250, 3, "WA") },
      }),
    );
    expect(a.status).toBe("possible");
    expect(byId(a, "state:wa-charity")?.finding).toBe(
      "Free care at large hospital systems, discounts at others",
    );
  });

  it("MD: 450% needs the hardship test", () => {
    const a = screenAssistance(
      input({
        state: "MD",
        policy: null,
        answers: { householdSize: 3, annualIncomeCents: at(450, 3, "MD") },
      }),
    );
    expect(byId(a, "state:md-free")?.outcome).toBe("needs_info");
    expect(a.status).toBe("unknown");
  });

  it("ignores unverified rules and says when a state isn't covered", () => {
    const a = screenAssistance(input({ state: "IL", policy: null }));
    expect(byId(a, "state")).toMatchObject({
      outcome: "not_applicable",
      finding: "We haven't added Illinois's rules yet",
    });
    expect(a.asksIncome).toBe(false);
    expect(byId(a, "policy")?.finding).toBe(
      "Not on file yet. We can look it up online.",
    );
    expect(byId(a, "federal:us-501r-agb")?.finding).toBe(
      "Applies if the hospital is a nonprofit",
    );
  });

  it("handles an unknown state", () => {
    const a = screenAssistance(input({ state: null, policy: null }));
    expect(byId(a, "state")?.finding).toBe(
      "We couldn't tell which state the hospital is in",
    );
  });

  it("Medicare patients get the itemized-statement right", () => {
    const a = screenAssistance(
      input({ answers: { insurance: "medicare", emergency: false } }),
    );
    expect(byId(a, "federal:us-medicare-itemized")?.outcome).toBe("may_help");
    expect(byId(a, "federal:nsa")?.outcome).toBe("not_applicable");
  });
});

describe("income bands", () => {
  it("splits at the limits, and each band's income lands inside it", () => {
    const limits = incomeLimits(input());
    expect(limits).toEqual([400, 600]);
    const bands = incomeBands(limits, 3, "CA", FPL);
    expect(bands).toEqual([
      { minCents: 0, maxCents: 10_928_000, incomeCents: 10_927_999 },
      { minCents: 10_928_000, maxCents: 16_392_000, incomeCents: 16_391_999 },
      { minCents: 16_392_000, maxCents: null, incomeCents: 16_392_100 },
    ]);
    const statuses = bands.map(
      (b) =>
        screenAssistance(
          input({
            answers: { householdSize: 3, annualIncomeCents: b.incomeCents },
          }),
        ).status,
    );
    expect(statuses).toEqual(["likely", "possible", "unlikely"]);
  });

  it("returns bands with the household size, none without limits", () => {
    expect(
      screenAssistance(input({ answers: { householdSize: 3 } })).incomeBands,
    ).toHaveLength(3);
    expect(incomeBands([], 3, "CA", FPL)).toEqual([]);
  });
});

describe("findPolicy and names", () => {
  it("matches captured policies by name, either way round", () => {
    expect(findPolicy([POLICY], "Westside General Hospital")).toBe(POLICY);
    expect(findPolicy([POLICY], "Eastside Clinic")).toBeNull();
    expect(findPolicy([POLICY], "")).toBeNull();
  });

  it("shortens hospital names for titles", () => {
    expect(shortHospitalName("Cedars-Sinai Medical Center")).toBe(
      "Cedars-Sinai",
    );
  });
});

describe("free care in savings and balance", () => {
  const b = bill([line({ id: "a", chargeCents: 1_000_000 })]);

  it("widens the potential range to the full balance, as an estimate", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: 5_200_000 } }),
    );
    const s = computeSavings([], b, [], a);
    expect(s.confirmedCents).toBe(0);
    expect(s.potentialLowCents).toBe(0);
    expect(s.potentialHighCents).toBe(1_000_000);
    expect(s.method.at(-1)).toMatch(/^Estimate: /);
    const bal = balanceSummary(1_000_000, s);
    expect(bal.fairBalanceLowCents).toBe(0);
    expect(bal.fairBalanceCents).toBe(1_000_000);
    expect(bal.isEstimate).toBe(true);
  });

  it("leaves savings alone for a discount (amount unknown)", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: at(450) } }),
    );
    expect(computeSavings([], b, [], a).potentialHighCents).toBe(0);
  });
});

describe("insurance check", () => {
  const ins = (
    insurance: "none" | "private" | undefined,
    totals?: { paidCents: number; adjustmentsCents: number },
  ) =>
    byId(
      screenAssistance(
        input({ answers: insurance ? { insurance } : {}, totals }),
      ),
      "insurance",
    );

  it("flags an insured bill with no insurance payment or adjustment", () => {
    expect(ins("private", { paidCents: 0, adjustmentsCents: 0 })).toMatchObject(
      {
        kind: "insurance",
        outcome: "may_help",
        finding:
          "Insurance may not have been applied. Ask billing to send the claim to your insurer before you pay.",
      },
    );
  });

  it("says insurance was applied when the bill shows it", () => {
    expect(
      ins("private", { paidCents: 50_000, adjustmentsCents: 0 })?.outcome,
    ).toBe("not_applicable");
    expect(ins("private", { paidCents: 0, adjustmentsCents: 1 })?.finding).toBe(
      "Insurance was applied to this bill",
    );
  });

  it("doesn't apply without insurance, and needs an answer when unknown", () => {
    expect(ins("none", { paidCents: 0, adjustmentsCents: 0 })?.outcome).toBe(
      "not_applicable",
    );
    expect(ins(undefined)?.outcome).toBe("needs_info");
    expect(ins("private")?.finding).toBe("We couldn't read the bill's totals");
  });
});

describe("high medical costs (insured, CA)", () => {
  const ca = (highCosts?: boolean) =>
    screenAssistance(
      input({
        policy: null,
        answers: {
          householdSize: 3,
          annualIncomeCents: at(150),
          insurance: "private",
          ...(highCosts === undefined ? {} : { highCosts }),
        },
      }),
    );

  it("asks, then follows the answer", () => {
    expect(byId(ca(), "state:ca-fpq")?.outcome).toBe("needs_info");
    expect(byId(ca(true), "state:ca-fpq")?.outcome).toBe("may_help");
    expect(ca(true).status).toBe("possible");
    expect(byId(ca(false), "state:ca-fpq")?.outcome).toBe("not_applicable");
  });
});

describe("assistanceFlag (the letter's request)", () => {
  it("is an estimate for $0 that names the policy and the law", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: 5_200_000 } }),
    );
    const f = assistanceFlag(a);
    expect(f).toMatchObject({
      lever: "assistance",
      tier: "estimate",
      amountCents: 0,
      lineIds: [],
      title: "May qualify for free care",
      evidence: {
        kind: "quote",
        detail: "Westside General's assistance policy and ca-fpq citation",
        quote: POLICY.freeCareQuote,
      },
    });
    expect(f?.explanation).toMatch(/estimate/);
    expect(f?.title.length).toBeLessThanOrEqual(60);
  });

  it("asks for a discount when that's what may apply, and is null otherwise", () => {
    const disc = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: at(450) } }),
    );
    expect(assistanceFlag(disc)?.title).toBe("May qualify for a discount");
    expect(assistanceFlag(screenAssistance(input()))).toBeNull();
  });

  it("feeds the fallback letter, which cites the sources and says estimate", () => {
    const a = screenAssistance(
      input({ answers: { householdSize: 3, annualIncomeCents: 5_200_000 } }),
    );
    const f = assistanceFlag(a);
    if (!f) throw new Error("expected a flag");
    const out = fallbackModelOutput("letter", [f], []);
    expect(out.paragraphs[0]?.text).toBe(
      "Based on Westside General's assistance policy and ca-fpq citation, I may qualify for help paying this bill. This is an estimate. Please send me the application.",
    );
  });
});
