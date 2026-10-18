import {
  type ParseResult,
  ReaderOutput,
  readerOutputToBill,
  reconcile,
} from "@betterbill/core";

import { READER_INSTRUCTIONS } from "./cleanup";
import { STEPFUN_MODEL, stepfunChat } from "./stepfun";

const LOW_CONFIDENCE = 0.8;
const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_IMAGE_CHARS = 8_000_000; // about 6 MB of image per page

export class PhotoReadError extends Error {}

export function checkImage(dataUrl: string): void {
  if (dataUrl.length > MAX_IMAGE_CHARS) {
    throw new PhotoReadError("This photo is too large. Try a smaller one.");
  }
  if (!IMAGE.test(dataUrl)) {
    throw new PhotoReadError("Send a JPEG, PNG, or WebP photo.");
  }
}

// Reads bill photos with StepFun step-5-preview. The model only transcribes;
// core converts printed amounts to cents and reconciles the total.
export async function readPhoto(
  caseId: string,
  pages: { imageDataUrl: string; page: number }[],
  chat: typeof stepfunChat = stepfunChat,
): Promise<ParseResult> {
  for (const p of pages) checkImage(p.imageDataUrl);
  const t0 = performance.now();
  let content: string;
  try {
    content = await chat(
      [
        { role: "system", content: READER_INSTRUCTIONS },
        {
          role: "user",
          content: [
            ...pages.map((p) => ({
              type: "image_url" as const,
              image_url: { url: p.imageDataUrl, detail: "high" as const },
            })),
            {
              type: "text" as const,
              text: `Read every charge line on this bill (${pages.length} page${pages.length === 1 ? "" : "s"}, in order). Set "page" on each line.`,
            },
          ],
        },
      ],
      { timeoutMs: 85_000, agent: "bill-reader" },
    );
  } catch (e) {
    // Status only; never log the image or bill content.
    console.error("parsePhoto: StepFun call failed:", (e as Error).message);
    throw new PhotoReadError(
      "We could not read this photo right now. Try again, or paste the bill text.",
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    json = null;
  }
  const parsed = ReaderOutput.safeParse(json);
  if (!parsed.success || parsed.data.lines.length === 0) {
    throw new PhotoReadError(
      "We could not find charge lines in this photo. Try a flatter, brighter photo.",
    );
  }
  const r = readerOutputToBill(parsed.data, {
    idPrefix: caseId,
    sourceKind: "photo",
  });
  return {
    caseId,
    bill: r.bill,
    reconciliation: reconcile(r.bill, r.statedChargesCents),
    lowConfidenceLineIds: r.bill.lines
      .filter((l) => l.confidence < LOW_CONFIDENCE)
      .map((l) => l.id),
    reader: {
      mode: "step-5-preview",
      model: STEPFUN_MODEL,
      latencyMs: Math.round(performance.now() - t0),
      cachedAt: null,
    },
    warnings: r.warnings,
  };
}
