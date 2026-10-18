import type { Bill, Flag, Tier } from "../schemas";
import type { LetterKind, LetterModelOutput } from "./model-schema";

const TIER_LABEL: Record<Tier, string> = {
  confirmed: "Confirmed from your bill",
  rule: "Billing rule",
  published: "Hospital's published price",
  estimate: "Estimate",
  reported: "Reported by the patient",
};

export function renderLetter(input: {
  kind: LetterKind;
  bill: Bill;
  flags: Flag[];
  out: LetterModelOutput;
  patientName: string;
  today: string;
}): string {
  const { bill, flags, out, patientName, today } = input;
  const last4 = bill.accountRefMasked ?? "not shown";
  const lines: string[] = [today, ""];

  lines.push(`To: Billing Office, ${bill.hospital.name}`);
  lines.push(`Account ending in ${last4}`);
  lines.push(`Subject: ${out.subject}`, "");
  lines.push(out.opening, "");
  for (const paragraph of out.paragraphs) {
    lines.push(paragraph.text, "");
  }
  lines.push("Evidence");
  for (const flag of flags) {
    const tierLabel = TIER_LABEL[flag.tier];
    let bullet = `- ${flag.title}: ${tierLabel}. ${flag.evidence.detail}`;
    if (flag.evidence.sourceUrl) {
      bullet += ` Source: ${flag.evidence.sourceUrl}, captured ${flag.evidence.capturedAt ?? "date unknown"}`;
    }
    lines.push(bullet);
  }
  lines.push("", out.closingRequest, "");
  lines.push("Thank you,", patientName, "");
  lines.push(
    "Prepared with BetterBill. BetterBill is informational, not legal or medical advice.",
  );

  return lines.join("\n");
}
