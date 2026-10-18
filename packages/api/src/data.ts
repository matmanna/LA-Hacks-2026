// Runtime data bundled from data/ (see scripts/gen-api-data.ts).
import {
  Bill,
  Eob,
  type PublishedPrice,
  pricesFromCapture,
  type UnitBound,
  unitBoundsFromMue,
} from "@betterbill/core";

import { DATA } from "./data.gen";

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
