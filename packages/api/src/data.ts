// Runtime data bundled from data/ (see scripts/gen-api-data.ts).
import {
  Bill,
  Eob,
  type PublishedPrice,
  pricesFromCapture,
  Reconciliation,
  type UnitBound,
  unitBoundsFromMue,
} from "@betterbill/core";

import { DATA } from "./data.gen";
import type { CachedRead } from "./reader/photoCache";

export type Sample = { id: string; title: string; bill: Bill; eob: Eob | null };

export const SAMPLES: Sample[] = DATA.samples.map((s) => ({
  id: s.id,
  title: s.title,
  bill: Bill.parse(s.bill),
  eob: s.eob === null ? null : Eob.parse(s.eob),
}));

export const UNIT_BOUNDS: UnitBound[] = DATA.mue
  ? unitBoundsFromMue(DATA.mue)
  : [];

export const PRICES: PublishedPrice[] = DATA.captures.flatMap((c) =>
  pricesFromCapture(c),
);

export const EVAL_RESULTS: unknown = DATA.evalResults;

export const PHOTO_CACHE: Map<string, CachedRead> = new Map(
  DATA.photoCache.map((c) => [
    c.sha256,
    {
      sha256: c.sha256,
      model: c.model,
      readAt: c.readAt,
      bill: Bill.parse(c.bill),
      reconciliation: Reconciliation.parse(c.reconciliation),
      warnings: [...c.warnings],
    },
  ]),
);
