import { computeSavings } from "../savings";
import { Flag, type Lever } from "../schemas";
import { detectDuplicates } from "./duplicate";
import { detectEobMismatch } from "./eobMismatch";
import { detectMissingItemization } from "./missingItemization";
import { detectNotReceived } from "./notReceived";
import { detectPublishedPrice } from "./publishedPrice";
import type { AuditInput, AuditOutput } from "./types";
import { detectUnitAnomalies } from "./units";

export { PriceCapture, pricesFromCapture } from "./capture";
export { detectDuplicates } from "./duplicate";
export { detectEobMismatch } from "./eobMismatch";
export { detectMissingItemization } from "./missingItemization";
export { MueTable, unitBoundsFromMue } from "./mue";
export { detectNotReceived } from "./notReceived";
export { detectPublishedPrice } from "./publishedPrice";
export type * from "./types";
export { detectUnitAnomalies } from "./units";

const byAmountThenId = (a: Flag, b: Flag) =>
  b.amountCents - a.amountCents || a.id.localeCompare(b.id);

// Core audit entry point. Pure: no IO. C's eval script calls this directly.
export function runAudit(input: AuditInput): AuditOutput {
  const { bill, eob, unitBounds, prices } = input;
  const on = (lever: Lever) =>
    !input.enabledLevers || input.enabledLevers.includes(lever);

  // A line the patient did not receive is disputed in full, so no other
  // lever looks at it (no double counting).
  const notReceived = on("not_received") ? detectNotReceived(bill) : [];
  const received = {
    ...bill,
    lines: bill.lines.filter((l) => !(on("not_received") && l.notReceived)),
  };

  const duplicates = on("duplicate") ? detectDuplicates(received) : [];
  const dupLineIds = new Set(duplicates.flatMap((f) => f.lineIds));
  const rest = {
    ...received,
    lines: received.lines.filter((l) => !dupLineIds.has(l.id)),
  };

  const flags = [
    ...notReceived,
    ...duplicates,
    ...(on("units") ? detectUnitAnomalies(rest, unitBounds) : []),
    ...(on("eob_mismatch")
      ? detectEobMismatch(
          rest,
          eob,
          duplicates.reduce((s, f) => s + f.amountCents, 0),
        )
      : []),
    ...(on("published_price") ? detectPublishedPrice(rest, prices) : []),
    ...(on("missing_itemization") ? detectMissingItemization(bill) : []),
  ]
    .map((f) => Flag.parse(f))
    .sort(byAmountThenId);

  return { flags, savings: computeSavings(flags, bill, prices) };
}
