import { formatMoney } from "./money";
import { findPrice } from "./rules/publishedPrice";
import type { PublishedPrice } from "./rules/types";
import type { Assistance, Bill, Flag, Savings } from "./schemas";

const sum = (flags: Flag[]) => flags.reduce((s, f) => s + f.amountCents, 0);

// Plan B ticket B-08 savings math. Confirmed = duplicates plus the EOB gap
// that duplicates do not explain (runAudit subtracts them, so the two never
// overlap; same total as max(duplicates, gap)). Estimates and zero-amount
// flags never add. A line confirmed as a duplicate is never counted again.
export function computeSavings(
  flags: Flag[],
  bill: Bill,
  prices: PublishedPrice[],
  assistance: Assistance = { status: "unknown" },
): Savings {
  const counted = flags.filter(
    (f) => f.tier !== "estimate" && f.amountCents > 0,
  );
  const of = (lever: Flag["lever"]) => counted.filter((f) => f.lever === lever);
  const method: string[] = [];

  const dupCents = sum(of("duplicate"));
  const eobCents = sum(of("eob_mismatch"));
  const confirmedCents = dupCents + eobCents;
  if (dupCents > 0 && eobCents > 0) {
    method.push(
      `Confirmed: lines listed more than once (${formatMoney(dupCents)}) plus the rest of the gap between the bill and your EOB (${formatMoney(eobCents)}).`,
    );
  } else if (dupCents > 0) {
    method.push(
      `Confirmed: lines listed more than once on the same date (${formatMoney(dupCents)}).`,
    );
  } else if (eobCents > 0) {
    method.push(
      `Confirmed: the bill minus your EOB's patient responsibility (${formatMoney(eobCents)}).`,
    );
  }

  const confirmedLines = new Set(of("duplicate").flatMap((f) => f.lineIds));
  const fresh = (f: Flag) => !f.lineIds.some((id) => confirmedLines.has(id));

  const unitCents = sum(of("units").filter(fresh));
  if (unitCents > 0) {
    method.push(
      `Potential: units above the billing rule (${formatMoney(unitCents)}).`,
    );
  }

  let priceLow = 0;
  let priceHigh = 0;
  const lines = new Map(bill.lines.map((l) => [l.id, l]));
  for (const f of of("published_price").filter(fresh)) {
    const l = lines.get(f.lineIds[0] ?? "");
    const p = l?.code ? findPrice(prices, bill.hospital.name, l.code) : null;
    if (!l || !p) continue;
    const refs = [p.cashCents, p.minNegotiatedCents, p.maxNegotiatedCents]
      .filter((c): c is number => c !== null)
      .map((c) => c * l.units)
      .filter((c) => c < l.chargeCents);
    if (refs.length === 0) continue;
    priceLow += l.chargeCents - Math.max(...refs);
    priceHigh += l.chargeCents - Math.min(...refs);
  }
  if (priceHigh > 0) {
    method.push(
      `Potential: billed price above the hospital's published prices (${formatMoney(priceLow)} to ${formatMoney(priceHigh)}).`,
    );
  }

  // Patient-reported: billing may or may not agree, so it widens the
  // potential range (from nothing up to the full charge) and is never confirmed.
  const notReceivedCents = sum(of("not_received"));
  if (notReceivedCents > 0) {
    method.push(
      `Potential: services you told us you did not receive (up to ${formatMoney(notReceivedCents)}).`,
    );
  }

  return {
    confirmedCents,
    potentialLowCents: unitCents + priceLow,
    potentialHighCents: unitCents + priceHigh + notReceivedCents,
    assistance,
    method,
  };
}
