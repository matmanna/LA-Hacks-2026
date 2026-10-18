// Inputs to the assistance screener. The API builds these from data/ (see
// scripts/gen-api-data.ts); core never reads files.

export type FplTable = {
  year: number;
  source: string;
  contiguous48AndDC: Record<string, number>;
  alaska: Record<string, number>;
  hawaii: Record<string, number>;
};

// What the hospital's own financial assistance policy says, with quotes.
export type HospitalPolicy = {
  hospitalName: string;
  policyTitle: string;
  policyUrl: string;
  capturedAt: string;
  freeCareMaxFplPct: number | null;
  freeCareQuote: string | null;
  discountMaxFplPct: number | null;
  discountQuote: string | null;
  // Quote showing the policy follows IRS 501(r) (nonprofit hospitals).
  references501r: string | null;
};

export type Limit = { pct: number; inclusive: boolean };

// Income limits for a state charity-care law, normalized in data/regulations.
export type ScreenLimits = {
  free?: Limit;
  freeLarge?: Limit; // larger limit at big hospital systems (WA)
  help?: Limit; // free or discounted care
  helpLarge?: Limit;
  hardship?: Limit; // only with high medical debt (MD)
  insured: "any" | "high_costs" | "underinsured";
};

export type RegulationRule = {
  id: string;
  jurisdiction: string; // "US" or a state code
  title: string;
  lawName?: string; // e.g. "California Hospital Fair Pricing Act"
  effectKind: string;
  plain: string;
  short?: string;
  citation: string;
  sourceUrl: string;
  quote: string | null;
  capturedAt: string;
  verified: boolean;
  screen?: ScreenLimits;
};

export type Insurance = "none" | "medicare" | "medicaid" | "private";

export type AssistanceAnswers = {
  householdSize?: number;
  annualIncomeCents?: number;
  insurance?: Insurance | null;
  emergency?: boolean | null;
  // Insured CA patients: were costs at this hospital over 10% of income?
  highCosts?: boolean | null;
};

export type ScreenInput = {
  state: string | null;
  hospitalName: string;
  policy: HospitalPolicy | null;
  rules: RegulationRule[];
  fpl: FplTable;
  answers?: AssistanceAnswers;
  // The bill's totals, for the "was insurance applied?" check.
  totals?: { paidCents: number; adjustmentsCents: number };
};
