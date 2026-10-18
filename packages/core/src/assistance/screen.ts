import type {
  Assistance,
  AssistanceCheck,
  AssistanceRight,
  IncomeBand,
} from "../schemas";
import { fplPercent, povertyLineCents, within } from "./fpl";
import type {
  FplTable,
  HospitalPolicy,
  Insurance,
  RegulationRule,
  ScreenInput,
  ScreenLimits,
} from "./types";

// The assistance screener. It checks the hospital's own policy, the state's
// charity-care and collection laws, and federal rules, and returns every
// check (including the ones that don't apply) so the app can show its work.
// It only estimates: the hospital decides. Never says "you qualify".

type Level = "free" | "discount" | null;

const STATE_NAMES: Record<string, string> = {
  CA: "California",
  NY: "New York",
  WA: "Washington",
  MD: "Maryland",
  IL: "Illinois",
  CO: "Colorado",
  OR: "Oregon",
  MA: "Massachusetts",
};
const stateName = (s: string) => STATE_NAMES[s] ?? s;

const isInsured = (i: Insurance | null | undefined) =>
  i === "medicare" || i === "medicaid" || i === "private";

export function shortHospitalName(name: string): string {
  return name
    .replace(/\s*\(synthetic\)\s*$/i, "")
    .replace(/\s+(Medical Center|Hospital|Health System|Health)$/i, "");
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// A captured policy matches when one name contains the other.
export function findPolicy(
  policies: HospitalPolicy[],
  hospitalName: string,
): HospitalPolicy | null {
  const n = norm(hospitalName);
  if (!n) return null;
  return (
    policies.find((p) => {
      const m = norm(p.hospitalName);
      return m.includes(n) || n.includes(m);
    }) ?? null
  );
}

// The law's name (from its data file) reads better than the rule's title.
const lawName = (r: RegulationRule) => r.lawName ?? r.title;

const verifiedFor = (rules: RegulationRule[], jurisdiction: string | null) =>
  rules.filter((r) => r.verified && r.jurisdiction === jurisdiction);

function charityRule(input: ScreenInput) {
  return verifiedFor(input.rules, input.state).find((r) => r.screen);
}

// Every income limit (percent of the poverty line) that can change the
// answer for this bill. Empty means income doesn't matter: don't ask.
export function incomeLimits(input: ScreenInput): number[] {
  const s = charityRule(input)?.screen;
  const p = input.policy;
  const all = [
    p?.freeCareMaxFplPct,
    p?.discountMaxFplPct,
    s?.free?.pct,
    s?.freeLarge?.pct,
    s?.help?.pct,
    s?.helpLarge?.pct,
    s?.hardship?.pct,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  return [...new Set(all)].sort((a, b) => a - b);
}

// Income ranges split at those limits. Each range carries the income the app
// sends for it: just under the top of the range, or just over the last limit.
export function incomeBands(
  limits: number[],
  householdSize: number,
  state: string | null,
  fpl: FplTable,
): IncomeBand[] {
  if (limits.length === 0) return [];
  const line = povertyLineCents(fpl, householdSize, state);
  const edges = limits.map((p) => Math.round((line * p) / 100));
  const bands: IncomeBand[] = edges.map((max, i) => ({
    minCents: i === 0 ? 0 : (edges[i - 1] as number),
    maxCents: max,
    incomeCents: max - 1,
  }));
  const last = edges[edges.length - 1] as number;
  bands.push({ minCents: last, maxCents: null, incomeCents: last + 100 });
  return bands;
}

const policySource = (p: HospitalPolicy, quote: string | null) => ({
  label: p.policyTitle,
  url: p.policyUrl,
  capturedAt: p.capturedAt,
  ...(quote ? { quote } : {}),
});

function policyCheck(
  input: ScreenInput,
  pct: number | null,
): { check: AssistanceCheck; level: Level } {
  const p = input.policy;
  if (!p) {
    return {
      level: null,
      check: {
        id: "policy",
        kind: "policy",
        title: `${shortHospitalName(input.hospitalName)}'s assistance policy`,
        outcome: "needs_info",
        finding: "Not on file yet. We can look it up online.",
      },
    };
  }
  const base = {
    id: "policy",
    kind: "policy" as const,
    title: `${shortHospitalName(p.hospitalName)}'s assistance policy`,
  };
  const free = p.freeCareMaxFplPct;
  const disc = p.discountMaxFplPct;
  if (pct === null) {
    const parts = [
      free ? `Free care at or under ${free}% of the poverty line` : null,
      disc ? `discounts up to ${disc}%` : null,
    ].filter(Boolean);
    return {
      level: null,
      check: {
        ...base,
        outcome: "needs_info",
        finding: parts.length
          ? parts.join(", ")
          : "Has a policy, but no income limit we could read",
        source: policySource(p, p.freeCareQuote ?? p.discountQuote),
      },
    };
  }
  if (free !== null && pct <= free) {
    return {
      level: "free",
      check: {
        ...base,
        outcome: "may_help",
        finding: "Free care may apply at your income",
        source: policySource(p, p.freeCareQuote),
      },
    };
  }
  if (disc !== null && pct <= disc) {
    return {
      level: "discount",
      check: {
        ...base,
        outcome: "may_help",
        finding: "A discount may apply at your income",
        source: policySource(p, p.discountQuote),
      },
    };
  }
  return {
    level: null,
    check: {
      ...base,
      outcome: "not_applicable",
      finding: "Your income is above this policy's limits",
      source: policySource(p, null),
    },
  };
}

function describeLimits(s: ScreenLimits): string {
  const help = s.helpLarge ?? s.help;
  if (s.free && s.freeLarge) {
    return `Free care up to ${s.free.pct}% to ${s.freeLarge.pct}% of the poverty line, discounts up to ${help?.pct}%`;
  }
  if (s.free && help) {
    return `Free care up to ${s.free.pct}% of the poverty line, discounts up to ${help.pct}%`;
  }
  if (help)
    return `Free or discounted care up to ${help.pct}% of the poverty line`;
  return "Has income limits for free or discounted care";
}

function stateCheck(
  input: ScreenInput,
  pct: number | null,
): { check: AssistanceCheck; level: Level } {
  const state = input.state;
  if (!state) {
    return {
      level: null,
      check: {
        id: "state",
        kind: "state",
        title: "State charity-care law",
        outcome: "not_applicable",
        finding: "We couldn't tell which state the hospital is in",
      },
    };
  }
  const rule = charityRule(input);
  if (!rule?.screen) {
    return {
      level: null,
      check: {
        id: "state",
        kind: "state",
        title: `${stateName(state)} charity-care law`,
        outcome: "not_applicable",
        finding: `We haven't added ${stateName(state)}'s rules yet`,
      },
    };
  }
  const s = rule.screen;
  const base = {
    id: `state:${rule.id}`,
    kind: "state" as const,
    title: lawName(rule),
    source: {
      label: rule.citation,
      url: rule.sourceUrl,
      capturedAt: rule.capturedAt,
      ...(rule.quote ? { quote: rule.quote } : {}),
    },
  };
  const out = (
    outcome: AssistanceCheck["outcome"],
    finding: string,
    level: Level = null,
  ) => ({ level, check: { ...base, outcome, finding } });

  if (pct === null) return out("needs_info", describeLimits(s));
  const insurance = input.answers?.insurance;
  if (isInsured(insurance) && s.insured === "high_costs") {
    const high = input.answers?.highCosts;
    if (high === false) {
      return out(
        "not_applicable",
        "With insurance, this applies only if your costs here are over 10% of your income",
      );
    }
    if (high !== true) {
      return out(
        "needs_info",
        "With insurance, this applies if your costs here are over 10% of your income",
      );
    }
  }
  if (isInsured(insurance) && s.insured === "underinsured") {
    return out(
      "needs_info",
      "With insurance, this applies if your plan didn't cover this care",
    );
  }
  if (within(pct, s.free)) {
    return out("may_help", "Free care may apply at your income", "free");
  }
  if (within(pct, s.freeLarge)) {
    return out(
      "may_help",
      "Free care at large hospital systems, discounts at others",
      "discount",
    );
  }
  if (within(pct, s.help)) {
    return out(
      "may_help",
      s.free
        ? "A discount may apply at your income"
        : "Free or discounted care may apply at your income",
      "discount",
    );
  }
  if (within(pct, s.helpLarge)) {
    return out(
      "may_help",
      "A discount may apply at large hospital systems",
      "discount",
    );
  }
  if (within(pct, s.hardship)) {
    return out(
      "needs_info",
      "A discount may apply if your medical debt is high compared to your income",
    );
  }
  return out("not_applicable", "Your income is above the state's limits");
}

const ruleSource = (r: RegulationRule) => ({
  label: r.citation,
  url: r.sourceUrl,
  capturedAt: r.capturedAt,
  ...(r.quote ? { quote: r.quote } : {}),
});

function collectionsCheck(input: ScreenInput): AssistanceCheck | null {
  const r = verifiedFor(input.rules, input.state).find(
    (x) => x.effectKind === "collections_limit",
  );
  if (!r || !input.state) return null;
  return {
    id: `collections:${r.id}`,
    kind: "state",
    title: `${stateName(input.state)} collection limits`,
    outcome: "may_help",
    finding: r.short ?? r.plain,
    source: ruleSource(r),
  };
}

const federal = (input: ScreenInput, id: string) =>
  verifiedFor(input.rules, "US").find((r) => r.id === id);

function nonprofitCheck(
  input: ScreenInput,
  pct: number | null,
  helped: boolean,
): AssistanceCheck | null {
  const r = federal(input, "us-501r-agb");
  if (!r) return null;
  const base = {
    id: "federal:us-501r-agb",
    kind: "federal" as const,
    title: "Federal rules for nonprofit hospitals",
    source: ruleSource(r),
  };
  if (!input.policy?.references501r) {
    return {
      ...base,
      outcome: "needs_info",
      finding: "Applies if the hospital is a nonprofit",
    };
  }
  if (pct === null) {
    return {
      ...base,
      outcome: "needs_info",
      finding: "Applies if you qualify for the hospital's assistance",
    };
  }
  return helped
    ? { ...base, outcome: "may_help", finding: r.short ?? r.plain }
    : {
        ...base,
        outcome: "not_applicable",
        finding: "Applies only if you qualify for assistance",
      };
}

function surpriseCheck(input: ScreenInput): AssistanceCheck | null {
  const er = federal(input, "us-nsa-emergency");
  const gfe = federal(input, "us-nsa-gfe");
  if (!er && !gfe) return null;
  const base = {
    id: "federal:nsa",
    kind: "federal" as const,
    title: "Surprise billing protections",
  };
  const insurance = input.answers?.insurance;
  const emergency = input.answers?.emergency;
  if (insurance === "none" && gfe) {
    return {
      ...base,
      outcome: "needs_info",
      finding: gfe.short ?? gfe.plain,
      source: ruleSource(gfe),
    };
  }
  if (isInsured(insurance) && er) {
    if (emergency === true) {
      return {
        ...base,
        outcome: "may_help",
        finding: er.short ?? er.plain,
        source: ruleSource(er),
      };
    }
    if (emergency === false) {
      return {
        ...base,
        outcome: "not_applicable",
        finding: "Doesn't apply: this rule covers emergency care",
        source: ruleSource(er),
      };
    }
  }
  return {
    ...base,
    outcome: "needs_info",
    finding: "Depends on your insurance and whether this was an emergency",
    ...(er ? { source: ruleSource(er) } : {}),
  };
}

function medicareCheck(input: ScreenInput): AssistanceCheck | null {
  const r = federal(input, "us-medicare-itemized");
  if (!r) return null;
  const base = {
    id: "federal:us-medicare-itemized",
    kind: "federal" as const,
    title: "Medicare itemized bill rule",
    source: ruleSource(r),
  };
  const insurance = input.answers?.insurance;
  if (insurance === "medicare") {
    return { ...base, outcome: "may_help", finding: r.short ?? r.plain };
  }
  if (insurance) {
    return {
      ...base,
      outcome: "not_applicable",
      finding: "Doesn't apply: you're not on Medicare",
    };
  }
  return {
    ...base,
    outcome: "needs_info",
    finding: "Applies if Medicare paid for your care",
  };
}

// Insured, but the bill shows no insurance payment and no adjustment: the
// claim may never have been sent, so the patient sees the full charge.
function insuranceCheck(input: ScreenInput): AssistanceCheck {
  const base = {
    id: "insurance",
    kind: "insurance" as const,
    title: "Insurance on this bill",
  };
  const insurance = input.answers?.insurance;
  if (!insurance) {
    return {
      ...base,
      outcome: "needs_info",
      finding: "Depends on whether you have insurance",
    };
  }
  if (insurance === "none") {
    return {
      ...base,
      outcome: "not_applicable",
      finding: "Doesn't apply: no insurance",
    };
  }
  const t = input.totals;
  if (!t) {
    return {
      ...base,
      outcome: "needs_info",
      finding: "We couldn't read the bill's totals",
    };
  }
  const source = { label: "Your bill's totals" };
  return t.paidCents === 0 && t.adjustmentsCents === 0
    ? {
        ...base,
        outcome: "may_help",
        finding:
          "Insurance may not have been applied. Ask billing to send the claim to your insurer before you pay.",
        source,
      }
    : {
        ...base,
        outcome: "not_applicable",
        finding: "Insurance was applied to this bill",
        source,
      };
}

function incomeCheck(
  input: ScreenInput,
  pct: number,
  householdSize: number,
  helped: boolean,
): AssistanceCheck {
  const limits = incomeLimits(input);
  const above = limits.filter((l) => l < pct);
  const below = limits.filter((l) => l >= pct);
  const people = `${householdSize} ${householdSize === 1 ? "person" : "people"}`;
  const lo = above[above.length - 1];
  const hi = below[0];
  const range =
    hi !== undefined && lo === undefined
      ? `Under ${hi}% of the poverty line`
      : hi !== undefined && lo !== undefined
        ? `Between ${lo}% and ${hi}% of the poverty line`
        : lo !== undefined
          ? `Over ${lo}% of the poverty line`
          : "Compared to the poverty line";
  return {
    id: "income",
    kind: "income",
    title: "Your income",
    outcome: helped ? "may_help" : "not_applicable",
    finding: `${range} for ${people}`,
    source: {
      label: `${input.fpl.year} HHS poverty guidelines`,
      url: input.fpl.source,
    },
  };
}

function rightsFor(input: ScreenInput): AssistanceRight[] {
  const kinds = [
    "application_rules",
    "charge_cap",
    "payment_plan",
    "collections_limit",
  ];
  return verifiedFor(input.rules, input.state)
    .filter((r) => kinds.includes(r.effectKind) && r.short)
    .map((r) => ({
      text: r.short as string,
      citation: r.citation,
      sourceUrl: r.sourceUrl,
    }));
}

export function screenAssistance(input: ScreenInput): Assistance {
  const a = input.answers ?? {};
  const size = a.householdSize;
  const pct =
    size !== undefined && a.annualIncomeCents !== undefined
      ? fplPercent(a.annualIncomeCents, size, input.state, input.fpl)
      : null;

  const policy = policyCheck(input, pct);
  const state = stateCheck(input, pct);
  const levels = [policy.level, state.level];
  const free = levels.includes("free");
  const helped = free || levels.includes("discount");

  const checks = [
    policy.check,
    state.check,
    collectionsCheck(input),
    nonprofitCheck(input, pct, helped),
    surpriseCheck(input),
    medicareCheck(input),
    insuranceCheck(input),
    pct !== null && size !== undefined
      ? incomeCheck(input, pct, size, helped)
      : null,
  ].filter((c): c is AssistanceCheck => c !== null);

  const limits = incomeLimits(input);
  const best =
    policy.level === "free" || (policy.level && state.level !== "free")
      ? policy.check
      : state.level
        ? state.check
        : null;
  // A rule that still needs an answer (insured, or high medical debt) keeps
  // the status unknown rather than telling the patient it's unlikely.
  const open = [policy.check, state.check].some(
    (c) => c.outcome === "needs_info",
  );
  const status =
    pct === null
      ? "unknown"
      : free
        ? "likely"
        : helped
          ? "possible"
          : open
            ? "unknown"
            : "unlikely";

  return {
    status,
    ...(best?.source?.quote ? { quote: best.source.quote } : {}),
    ...(best?.source?.url ? { sourceUrl: best.source.url } : {}),
    ...(best?.source?.capturedAt ? { capturedAt: best.source.capturedAt } : {}),
    freeCare: free,
    asksIncome: limits.length > 0,
    checks,
    rights: rightsFor(input),
    ...(size !== undefined
      ? { incomeBands: incomeBands(limits, size, input.state, input.fpl) }
      : {}),
  };
}
