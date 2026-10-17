import { describe, expect, it } from "vitest";

import { copy } from "./copy";

const all = [
  copy.duplicate.title(2),
  copy.duplicate.title(3),
  copy.duplicate.explanation(2),
  copy.duplicate.explanation(4),
  copy.units.title(),
  copy.units.explanation(4, 2),
  copy.eobMismatch.title(),
  copy.eobMismatch.explanation(120000, 45000),
  copy.publishedPrice.title(),
  copy.publishedPrice.explanation(690000, 480000),
  copy.missingItemization.title(),
  copy.missingItemization.explanation(),
];

describe("copy", () => {
  it("never uses banned words", () => {
    for (const s of all) expect(s).not.toMatch(/illegal|fraud|overcharge/i);
  });

  it("keeps titles at most 60 chars", () => {
    const titles = [
      copy.duplicate.title(2),
      copy.duplicate.title(10),
      copy.units.title(),
      copy.eobMismatch.title(),
      copy.publishedPrice.title(),
      copy.missingItemization.title(),
    ];
    for (const t of titles) expect(t.length).toBeLessThanOrEqual(60);
  });
});
