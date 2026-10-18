import { formatMoney } from "./money";

// Demo values for the team to set. BetterBill's fee is a share of CONFIRMED
// savings only (estimates never count). Change FEE_BPS here and nowhere else;
// the UI renders whatever payment.quote returns.
export const FEE_BPS = 1000; // 10.00%, in basis points (1 bps = 0.01%)
export const MIN_FEE_CENTS = 50; // Polar's custom-price minimum
export const MAX_FEE_CENTS = 100_000; // $1,000 cap
// Sandbox-only development charge when the dev promo code is used.
export const DEV_FEE_CENTS = 50;

export type SavingsFee = {
  owed: boolean;
  confirmedCents: number;
  feeBps: number;
  // Display text such as "10%" (trailing zeros dropped).
  percentLabel: string;
  // What the patient pays. 0 when nothing is owed.
  feeCents: number;
  minCents: number;
  capCents: number;
  capped: boolean;
  // true only when the sandbox dev override set the amount
  devOverride: boolean;
  // One plain line explaining the amount.
  note: string;
};

export function percentLabel(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}

// Fee = round-half-up(confirmed * FEE_BPS / 10000), at least MIN_FEE_CENTS,
// at most MAX_FEE_CENTS, and never more than the confirmed savings. Confirmed
// savings below MIN_FEE_CENTS (or zero/negative/non-integer input) owe nothing.
// Potential (estimate) savings are deliberately not an input.
export function savingsFee(confirmedCents: number): SavingsFee {
  const confirmed = Number.isFinite(confirmedCents)
    ? Math.max(0, Math.trunc(confirmedCents))
    : 0;
  const base = {
    confirmedCents: confirmed,
    feeBps: FEE_BPS,
    percentLabel: percentLabel(FEE_BPS),
    minCents: MIN_FEE_CENTS,
    capCents: MAX_FEE_CENTS,
    devOverride: false,
  };
  if (confirmed < MIN_FEE_CENTS) {
    return {
      ...base,
      owed: false,
      feeCents: 0,
      capped: false,
      note: "Nothing is owed unless savings are confirmed from your bill.",
    };
  }
  const raw = Math.floor((confirmed * FEE_BPS + 5000) / 10_000);
  const feeCents = Math.min(
    Math.max(raw, MIN_FEE_CENTS),
    MAX_FEE_CENTS,
    confirmed,
  );
  const capped = raw > MAX_FEE_CENTS;
  return {
    ...base,
    owed: true,
    feeCents,
    capped,
    note: capped
      ? `${base.percentLabel} of your confirmed savings, capped at ${formatMoney(MAX_FEE_CENTS)}.`
      : `${base.percentLabel} of your confirmed savings (${formatMoney(confirmed)}).`,
  };
}

// Development override. Applies only when ALL hold: the server is the Polar
// sandbox (anything but an explicit "production" is sandbox, matching
// createPolarClient), a dev promo code is configured, the caller sent exactly
// that code, and something is owed. In production server mode the original
// fee is always returned.
export function applyDevOverride(
  fee: SavingsFee,
  opts: {
    promoCode?: string | null;
    devPromoCode?: string | null;
    server?: string | null;
  },
): SavingsFee {
  const sandbox = opts.server !== "production";
  const code = opts.promoCode?.trim();
  const dev = opts.devPromoCode?.trim();
  if (!sandbox || !fee.owed || !dev || !code || code !== dev) return fee;
  return {
    ...fee,
    feeCents: DEV_FEE_CENTS,
    capped: false,
    devOverride: true,
    note: `Development code applied: ${formatMoney(DEV_FEE_CENTS)} in the Polar sandbox.`,
  };
}
