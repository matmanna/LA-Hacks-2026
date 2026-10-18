import type { Bill } from "@betterbill/core";
import { describe, expect, it, vi } from "vitest";

import { PhotoReadError } from "./parsePhoto";
import { type CachedRead, photoHash, readPhotoWithCache } from "./photoCache";

const img = "data:image/jpeg;base64,AAAA";
const bill: Bill = {
  id: "cache-bill",
  hospital: { name: "Westside General (synthetic)", city: null, state: null },
  statementDate: null,
  accountRefMasked: null,
  kind: "itemized",
  sourceKind: "photo",
  lines: [
    {
      id: "cache-l01",
      serviceDate: "2026-09-12",
      description: "CBC",
      code: "85025",
      codeType: "CPT",
      units: 1,
      chargeCents: 8400,
      source: { page: 1, bbox: null },
      confidence: 0.5,
      userEdited: false,
    },
  ],
  totals: {
    chargesCents: 8400,
    adjustmentsCents: 0,
    paidCents: 0,
    dueCents: 8400,
  },
};
const hit: CachedRead = {
  sha256: photoHash(img),
  model: "step-5-preview",
  readAt: "2026-10-17T20:00:00.000Z",
  bill,
  reconciliation: {
    linesSumCents: 8400,
    statedChargesCents: 8400,
    diffCents: 0,
    ok: true,
  },
  warnings: [],
};
const cache = new Map([[hit.sha256, hit]]);
const pages = [{ imageDataUrl: img, page: 1 }];
const liveOk = vi.fn(
  async (caseId: string) => ({ caseId, live: true }) as never,
);
const liveDown = vi.fn(async () => {
  throw new PhotoReadError("down");
});

describe("readPhotoWithCache", () => {
  it("uses the live read in live mode", async () => {
    expect(
      await readPhotoWithCache("c1", pages, cache, "live", liveOk),
    ).toMatchObject({ live: true });
  });

  it("falls back to a labelled cached read when live fails", async () => {
    const r = await readPhotoWithCache("c2", pages, cache, "live", liveDown);
    expect(r.reader).toEqual({
      mode: "cache",
      model: "step-5-preview",
      latencyMs: 0,
      cachedAt: "2026-10-17T20:00:00.000Z",
    });
    expect(r.bill.id).toBe("c2-bill");
    expect(r.bill.lines[0]?.id).toBe("c2-l01");
    expect(r.lowConfidenceLineIds).toEqual(["c2-l01"]);
    expect(r.warnings.at(-1)).toContain("saved reading");
  });

  it("serves the cache first in cache_first and cache_only modes", async () => {
    const live = vi.fn();
    expect(
      (await readPhotoWithCache("c3", pages, cache, "cache_first", live)).reader
        .mode,
    ).toBe("cache");
    expect(
      (await readPhotoWithCache("c4", pages, cache, "cache_only", live)).reader
        .mode,
    ).toBe("cache");
    expect(live).not.toHaveBeenCalled();
  });

  it("explains when nothing can read the photo", async () => {
    const other = [{ imageDataUrl: "data:image/jpeg;base64,BBBB", page: 1 }];
    await expect(
      readPhotoWithCache("c5", other, cache, "cache_only"),
    ).rejects.toThrow("offline");
    await expect(
      readPhotoWithCache("c6", other, cache, "live", liveDown),
    ).rejects.toThrow("down");
    const boom = vi.fn(async () => {
      throw new Error("bug");
    });
    await expect(
      readPhotoWithCache("c7", pages, cache, "live", boom),
    ).rejects.toThrow("bug");
  });
});
