import { describe, expect, it, vi } from "vitest";

import {
  checkImage,
  MAX_IMAGE_CHARS,
  PhotoReadError,
  readPhoto,
} from "./parsePhoto";

const img = "data:image/jpeg;base64,AAAA";
const out = {
  hospital: { name: "Westside General (synthetic)" },
  lines: [
    {
      serviceDate: "2026-09-12",
      description: "CBC",
      code: "85025",
      codeType: "CPT",
      units: 1,
      charge: "84.00",
      confidence: 0.95,
      page: 1,
    },
    {
      serviceDate: "2026-09-12",
      description: "CBC",
      code: "85025",
      codeType: "CPT",
      units: 1,
      charge: "84.00",
      confidence: 0.6,
      page: 1,
    },
  ],
  totals: { charges: "168.00" },
};

describe("readPhoto", () => {
  it("returns a step-5-preview ParseResult and flags low confidence", async () => {
    const chat = vi.fn(async (_m: unknown) => JSON.stringify(out));
    const r = await readPhoto("c1", [{ imageDataUrl: img, page: 1 }], chat);
    expect(r.reader).toMatchObject({
      mode: "step-5-preview",
      model: "step-5-preview",
    });
    expect(r.bill.sourceKind).toBe("photo");
    expect(r.bill.lines.map((l) => l.chargeCents)).toEqual([8400, 8400]);
    expect(r.reconciliation.ok).toBe(true);
    expect(r.lowConfidenceLineIds).toEqual(["c1-l02"]);
    const sent = JSON.stringify(chat.mock.calls[0]?.[0]);
    expect(sent).toContain("image_url");
  });

  it("explains failures in plain words", async () => {
    const pages = [{ imageDataUrl: img, page: 1 }];
    await expect(
      readPhoto("c", pages, async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("Try again");
    await expect(
      readPhoto("c", pages, async () => "not json"),
    ).rejects.toBeInstanceOf(PhotoReadError);
    await expect(
      readPhoto("c", pages, async () => '{"lines":[]}'),
    ).rejects.toThrow("flatter");
  });
});

describe("checkImage", () => {
  it("accepts images and rejects other data or huge files", () => {
    expect(() => checkImage(img)).not.toThrow();
    expect(() => checkImage("data:text/plain;base64,AAAA")).toThrow("JPEG");
    expect(() =>
      checkImage(`data:image/png;base64,${"A".repeat(MAX_IMAGE_CHARS)}`),
    ).toThrow("too large");
  });
});
