import { z } from "zod";

import type { PublishedPrice } from "./types";

// C's hospital price capture (data/hospitals/<key>/capture.json). Only the
// discounted cash price is used; negotiated min/max are not (per C's notes).
export const PriceCapture = z.looseObject({
  hospitalName: z.string(),
  capturedAt: z.string(),
  sources: z.array(z.looseObject({ kind: z.string(), url: z.string() })),
  prices: z.array(
    z.looseObject({
      code: z.string(),
      setting: z.string(),
      discountedCashCents: z.number().int().nullable(),
    }),
  ),
});
export type PriceCapture = z.infer<typeof PriceCapture>;

export function pricesFromCapture(
  raw: unknown,
  setting = "outpatient",
): PublishedPrice[] {
  const c = PriceCapture.parse(raw);
  const file = c.sources.find((s) => s.kind === "mrf") ?? c.sources[0];
  return c.prices
    .filter((p) => p.setting === setting)
    .map((p) => ({
      hospitalName: c.hospitalName,
      code: p.code,
      cashCents: p.discountedCashCents,
      minNegotiatedCents: null,
      maxNegotiatedCents: null,
      sourceUrl: file?.url ?? "",
      capturedAt: c.capturedAt,
    }));
}
