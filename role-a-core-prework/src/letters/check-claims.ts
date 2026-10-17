import type { Flag, Line } from "../schemas.js";
import type { LetterClaim, LetterModelOutput } from "./model-schema.js";
import { checkWording } from "./wording.js";

const MONEY_RE = /\$\s?[\d,]+(?:\.\d{2})?/g;
const CODE_RE = /\b[A-Z0-9]\d{3}[A-Z0-9]\b/g;
const LONG_DIGITS_RE = /\d{5,}/; // longer than 4 digits; "last 4" of an account is safe

function moneyToCents(token: string): number {
  const digits = token.replace(/[^\d.]/g, "");
  return Math.round(Number.parseFloat(digits) * 100);
}

export function checkLetterClaims(
  out: LetterModelOutput,
  flags: Flag[],
  lines: Line[],
): { ok: boolean; problems: string[]; claims: LetterClaim[] } {
  const problems: string[] = [];
  const claims: LetterClaim[] = [];
  const flagById = new Map(flags.map((flag) => [flag.id, flag]));
  const lineById = new Map(lines.map((line) => [line.id, line]));
  const seenFlagIds = new Set<string>();

  out.paragraphs.forEach((paragraph, index) => {
    const flag = flagById.get(paragraph.flagId);
    if (!flag) {
      problems.push(`Paragraph ${index} refers to an unknown flag ${paragraph.flagId}.`);
      return;
    }
    if (seenFlagIds.has(flag.id)) {
      problems.push(`Flag ${flag.id} appears in more than one paragraph.`);
    }
    seenFlagIds.add(flag.id);
    claims.push({ flagId: flag.id, paragraphIndex: index, amountCents: flag.amountCents, tier: flag.tier });

    const flagLines = flag.lineIds.map((id) => lineById.get(id)).filter((line): line is Line => Boolean(line));
    const allowedCents = new Set<number>([flag.amountCents, ...flagLines.map((line) => line.chargeCents)]);
    const allowedCodes = new Set<string>(
      flagLines.map((line) => line.code).filter((code): code is string => Boolean(code)),
    );

    for (const match of paragraph.text.matchAll(MONEY_RE)) {
      if (!allowedCents.has(moneyToCents(match[0]))) {
        problems.push(`Paragraph ${index} states ${match[0]}, which does not match flag ${flag.id}.`);
      }
    }
    for (const match of paragraph.text.matchAll(CODE_RE)) {
      if (!allowedCodes.has(match[0])) {
        problems.push(`Paragraph ${index} mentions code ${match[0]}, which is not on this flag's lines.`);
      }
    }
    if (flag.tier === "estimate" && !/estimate/i.test(paragraph.text)) {
      problems.push(`Paragraph ${index} is tier estimate but does not say "estimate".`);
    }
    if (flag.tier === "published" && !/published/i.test(paragraph.text)) {
      problems.push(`Paragraph ${index} is tier published but does not say "published".`);
    }
  });

  for (const flag of flags) {
    if (!seenFlagIds.has(flag.id)) {
      problems.push(`Flag ${flag.id} has no paragraph.`);
    }
  }

  for (const field of [out.subject, out.opening, out.closingRequest]) {
    if (field.includes("$")) problems.push("Subject, opening, or closing request contains a dollar amount.");
    if (LONG_DIGITS_RE.test(field)) {
      problems.push("Subject, opening, or closing request contains a long digit sequence.");
    }
  }

  const allText = [out.subject, out.opening, out.closingRequest, ...out.paragraphs.map((p) => p.text)].join("\n");
  for (const word of checkWording(allText)) {
    problems.push(`Wording problem: ${word}.`);
  }

  return { ok: problems.length === 0, problems, claims };
}
