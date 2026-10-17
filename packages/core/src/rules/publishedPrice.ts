import { copy } from "../copy";
import type { Bill, Flag } from "../schemas";
import type { PublishedPrice } from "./types";
import { flagId, normalize } from "./util";

export const findPrice = (
  prices: PublishedPrice[],
  hospitalName: string,
  code: string,
) =>
  prices.find(
    (p) =>
      p.code === code && normalize(p.hospitalName) === normalize(hospitalName),
  );

// Charge above the hospital's own published cash price for the same code.
export function detectPublishedPrice(
  bill: Bill,
  prices: PublishedPrice[],
): Flag[] {
  const flags: Flag[] = [];
  for (const l of bill.lines) {
    if (!l.code) continue;
    const p = findPrice(prices, bill.hospital.name, l.code);
    if (!p || p.cashCents === null) continue;
    const cash = p.cashCents * l.units;
    if (l.chargeCents <= cash) continue;
    flags.push({
      id: flagId("published_price", [l.id]),
      lineIds: [l.id],
      lever: "published_price",
      tier: "published",
      title: copy.publishedPrice.title(),
      explanation: copy.publishedPrice.explanation(l.chargeCents, cash),
      amountCents: l.chargeCents - cash,
      evidence: {
        kind: "price_file",
        detail: `${l.code}: billed ${l.chargeCents} cents, published cash price ${cash} cents.`,
        sourceUrl: p.sourceUrl,
        capturedAt: p.capturedAt,
      },
      confidence: l.confidence,
    });
  }
  return flags;
}
