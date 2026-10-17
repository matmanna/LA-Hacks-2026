import { z } from "zod";

import type { UnitBound } from "./types";

// C's sourced CMS MUE subset (data/rules/mue-subset.json).
export const MueTable = z.looseObject({
  table: z.string(),
  sourcePage: z.string(),
  effectiveDate: z.string(),
  entries: z.array(
    z.looseObject({
      code: z.string(),
      maxUnitsPerDay: z.number().int().positive(),
    }),
  ),
});
export type MueTable = z.infer<typeof MueTable>;

export function unitBoundsFromMue(raw: unknown): UnitBound[] {
  const t = MueTable.parse(raw);
  return t.entries.map((e) => ({
    code: e.code,
    maxUnitsPerDay: e.maxUnitsPerDay,
    source: `${t.table}, effective ${t.effectiveDate}`,
    sourceUrl: t.sourcePage,
  }));
}
