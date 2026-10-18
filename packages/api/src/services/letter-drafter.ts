// Drafts the dispute letter (ticket A-04). Gemini writes the words; core checks
// every claim against the flags. One retry with the problems, then the
// deterministic fallback, so a letter is always produced and always checked.
import {
  type Action,
  checkLetterClaims,
  type Flag,
  fallbackModelOutput,
  type LetterClaim,
  type LetterKind,
  type LetterModelOutput,
  LetterModelOutputSchema,
  type Line,
  renderLetter,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { checkTransition, loadAuditedCase, saveDraft } from "./actions";
import { geminiJson } from "./gemini";

export const LETTER_SYSTEM_PROMPT =
  "You write short, polite letters from a patient to a hospital billing office. Write at a grade 6 to 8 level. Sentences under 20 words. Use only the facts in FLAGS and LINES. Write exactly one paragraph per flag and put that flag's id in flagId. Mention only dollar amounts and codes that appear in that flag or its lines. Never say illegal, fraud, overcharge, scam, or lawsuit. Never threaten. If a flag's tier is estimate, say it is an estimate. If the tier is published, say the hospital's own published price. Do not put dollar amounts in the subject, opening, or closingRequest. Return JSON only.";

// No name exists in the bill contract or synthetic data, so none is invented.
const SIGN_OFF = "The account holder";

export type Generate = (req: {
  system: string;
  input: string;
  schema: object;
  timeoutMs: number;
}) => Promise<unknown>;

export function flagsForKind(kind: LetterKind, flags: Flag[]): Flag[] {
  return kind === "itemized_request"
    ? flags.filter((f) => f.lever === "missing_itemization")
    : flags;
}

export async function chooseLetterOutput(args: {
  kind: LetterKind;
  hospital: string;
  flags: Flag[];
  lines: Line[];
  generate: Generate;
}): Promise<{
  out: LetterModelOutput;
  claims: LetterClaim[];
  usedFallback: boolean;
}> {
  const { kind, hospital, flags, lines, generate } = args;
  const lineIds = new Set(flags.flatMap((f) => f.lineIds));
  const input = JSON.stringify({
    kind,
    hospital,
    flags: flags.map(
      ({ id, lever, tier, title, explanation, amountCents, lineIds }) => ({
        id,
        lever,
        tier,
        title,
        explanation,
        amountCents,
        lineIds,
      }),
    ),
    lines: lines
      .filter((l) => lineIds.has(l.id))
      .map(({ id, serviceDate, description, code, units, chargeCents }) => ({
        id,
        serviceDate,
        description,
        code,
        units,
        chargeCents,
      })),
  });
  const schema = z.toJSONSchema(LetterModelOutputSchema);

  // Measured live on the sample bills: Gemini errors (503s, timeouts), not bad
  // letters, caused most fallbacks, so an error also gets the one retry. Both
  // attempts share one deadline to stay under the 15 s letter target.
  const deadline = Date.now() + 14_000;
  let prompt = input;
  for (let attempt = 0; attempt < 2; attempt++) {
    const timeoutMs = attempt === 0 ? 11_000 : deadline - Date.now();
    if (timeoutMs < 1_000) break;
    let raw: unknown;
    try {
      raw = await generate({
        system: LETTER_SYSTEM_PROMPT,
        input: prompt,
        schema,
        timeoutMs,
      });
    } catch {
      continue;
    }
    const parsed = LetterModelOutputSchema.safeParse(raw);
    if (parsed.success) {
      const check = checkLetterClaims(parsed.data, flags, lines);
      if (check.ok) {
        return { out: parsed.data, claims: check.claims, usedFallback: false };
      }
      prompt = `${input}\n\nFix these problems: ${check.problems.join(" ")}`;
    } else {
      prompt = `${input}\n\nFix these problems: return JSON that matches the schema.`;
    }
  }

  const out = fallbackModelOutput(kind, flags, lines);
  return {
    out,
    claims: checkLetterClaims(out, flags, lines).claims,
    usedFallback: true,
  };
}

export async function draftLetter(
  db: Database,
  input: { caseId: string; kind: LetterKind },
  generate: Generate = geminiJson,
): Promise<{
  action: Action;
  draftHash: string;
  claims: LetterClaim[];
  usedFallback: boolean;
}> {
  const { caseId, kind } = input;
  const audited = await loadAuditedCase(db, caseId);
  const flags = flagsForKind(kind, audited.flags);
  if (kind === "letter" && flags.length === 0) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Nothing on this bill needs a dispute letter.",
    });
  }
  // Checked before calling Gemini so a wrong-state case costs nothing.
  const status = checkTransition(
    audited.status,
    "action.drafted",
    "This case is not ready for a letter yet.",
  );

  const { bill } = audited;
  const { out, claims, usedFallback } = await chooseLetterOutput({
    kind,
    hospital: bill.hospital.name,
    flags,
    lines: bill.lines,
    generate,
  });
  const draft = renderLetter({
    kind,
    bill,
    flags,
    out,
    patientName: SIGN_OFF,
    today: new Date().toISOString().slice(0, 10),
  });
  const { action, draftHash } = await saveDraft(db, {
    caseId,
    kind,
    draft,
    recipient:
      process.env.EMAIL_TEST_INBOX || `Billing Office, ${bill.hospital.name}`,
    status,
    summary: "Draft ready for you",
  });
  return { action, draftHash, claims, usedFallback };
}
