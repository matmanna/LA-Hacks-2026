import { z } from "zod";
import type { Tier } from "../schemas.js";

export const LetterModelOutputSchema = z.object({
  subject: z.string().max(90),
  opening: z.string().max(400),
  paragraphs: z
    .array(
      z.object({
        flagId: z.string(),
        text: z.string().max(500),
      }),
    )
    .max(8),
  closingRequest: z.string().max(400),
});

export type LetterModelOutput = z.infer<typeof LetterModelOutputSchema>;
export type LetterKind = "letter" | "itemized_request";
export type LetterClaim = {
  flagId: string;
  paragraphIndex: number;
  amountCents: number;
  tier: Tier;
};
