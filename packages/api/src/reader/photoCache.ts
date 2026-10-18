// Saved photo reads (data/cache/photos, made by scripts/read-photos.ts) so a
// demo photo still reads when StepFun is slow or down. A cached result is
// always labelled: reader.mode "cache" and cachedAt set.
import { createHash } from "node:crypto";

import type { Bill, ParseResult, Reconciliation } from "@betterbill/core";

import { heroStep } from "../telemetry";
import { PhotoReadError, readPhoto } from "./parsePhoto";

export type CachedRead = {
  sha256: string;
  model: string | null;
  readAt: string;
  bill: Bill;
  reconciliation: Reconciliation;
  warnings: string[];
};
export type ReaderMode = "live" | "cache_first" | "cache_only";

export const photoHash = (dataUrl: string) =>
  createHash("sha256").update(dataUrl).digest("hex");

export function fromCache(caseId: string, hit: CachedRead): ParseResult {
  const lines = hit.bill.lines.map((l, i) => ({
    ...l,
    id: `${caseId}-l${String(i + 1).padStart(2, "0")}`,
  }));
  return {
    caseId,
    bill: { ...hit.bill, id: `${caseId}-bill`, lines },
    reconciliation: hit.reconciliation,
    lowConfidenceLineIds: lines
      .filter((l) => l.confidence < 0.8)
      .map((l) => l.id),
    reader: {
      mode: "cache",
      model: hit.model,
      latencyMs: 0,
      cachedAt: hit.readAt,
    },
    warnings: [...hit.warnings, "Showing a saved reading of this photo."],
  };
}

async function readPhotoWithCacheInner(
  caseId: string,
  pages: { imageDataUrl: string; page: number }[],
  cache: Map<string, CachedRead>,
  mode: ReaderMode = "live",
  live: typeof readPhoto = readPhoto,
): Promise<ParseResult> {
  const first = pages[0];
  const hit =
    pages.length === 1 && first
      ? cache.get(photoHash(first.imageDataUrl))
      : undefined;
  if (hit && mode !== "live") return fromCache(caseId, hit);
  if (mode === "cache_only") {
    throw new PhotoReadError(
      "Photo reading is offline right now. Try a sample bill, or paste the bill text.",
    );
  }
  try {
    return await live(caseId, pages);
  } catch (e) {
    if (hit && e instanceof PhotoReadError) return fromCache(caseId, hit);
    throw e;
  }
}

export const readPhotoWithCache = (
  caseId: string,
  pages: { imageDataUrl: string; page: number }[],
  cache: Map<string, CachedRead>,
  mode: ReaderMode = "live",
  live: typeof readPhoto = readPhoto,
): Promise<ParseResult> =>
  heroStep(
    "parse",
    { caseId, source: "photo", pages: pages.length, configuredMode: mode },
    () => readPhotoWithCacheInner(caseId, pages, cache, mode, live),
    (r) => ({
      lineCount: r.bill.lines.length,
      readerMode: r.reader.mode,
      readerMs: r.reader.latencyMs,
    }),
  );
