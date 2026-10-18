import type { Flag, Line } from "../schemas";
import type { LetterKind, LetterModelOutput } from "./model-schema";

function findLine(lines: Line[], id: string): Line | undefined {
  return lines.find((line) => line.id === id);
}

// ponytail: local copy; swap for core's formatMoney once B-08 lands it.
function formatMoney(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const remainder = (abs % 100).toString().padStart(2, "0");
  return `$${dollars}.${remainder}`;
}

function sentenceFor(flag: Flag, lines: Line[]): string {
  const flagLines = flag.lineIds
    .map((id) => findLine(lines, id))
    .filter((line): line is Line => Boolean(line));
  const primary = flagLines[0];
  const description = primary?.description ?? "this charge";
  const code = primary?.code ?? "no code listed";
  const amount = formatMoney(flag.amountCents);

  switch (flag.lever) {
    case "duplicate":
      return `The line ${description} (${code}) for ${amount} is listed more than once on ${primary?.serviceDate ?? "the same date"}. Did I have more than one? If not, please remove the repeat.`;
    case "units":
      return `The line ${description} (${code}) lists ${primary?.units ?? "more"} units. That is more than the billing rule allows. Please check the units.`;
    case "eob_mismatch":
      return `My insurer's explanation of benefits says I owe a different amount. The bill asks for ${amount} more than that. Please correct the balance.`;
    case "published_price":
      return `The charge for ${description} (${code}) is ${formatMoney(primary?.chargeCents ?? flag.amountCents)}. That is ${amount} higher than your own published price for this service. Please review it.`;
    case "assistance":
      return "Based on your published financial assistance policy, I may qualify. This is an estimate. Please send me the application.";
    case "missing_itemization":
      return "My statement does not list each charge. Please send a complete itemized bill.";
    case "not_received":
      return `I do not recall receiving ${description} (${code}) for ${amount}. Please show where it is in my medical record, or remove it.`;
  }
}

export function fallbackModelOutput(
  kind: LetterKind,
  flags: Flag[],
  lines: Line[],
): LetterModelOutput {
  if (kind === "itemized_request") {
    const relevant = flags.filter(
      (flag) => flag.lever === "missing_itemization",
    );
    return {
      subject: "Request for an itemized bill",
      opening: "Please send me a complete itemized bill for my account.",
      paragraphs: relevant.map((flag) => ({
        flagId: flag.id,
        text: sentenceFor(flag, lines),
      })),
      closingRequest:
        "Please include each service date, code, units, and charge. Please reply in writing.",
    };
  }

  return {
    subject: "Request to review charges on my bill",
    opening:
      "I am writing about my bill. I reviewed the itemized charges and some lines do not look right. Please review them.",
    paragraphs: flags.map((flag) => ({
      flagId: flag.id,
      text: sentenceFor(flag, lines),
    })),
    closingRequest:
      "Please send a corrected itemized statement and hold collection on the amounts above while you review. Please reply in writing.",
  };
}
