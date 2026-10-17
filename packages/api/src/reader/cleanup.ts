// Model fallback for pasted text the deterministic parser cannot read. The
// model only transcribes; charges stay printed strings and core converts them.
import { ReaderOutput } from "@betterbill/core";

import { stepfunChat } from "./stepfun";

export const READER_INSTRUCTIONS = `You read hospital bills. Return only JSON with this shape:
{"hospital":{"name":string|null,"city":string|null,"state":string|null},
 "statementDate":"YYYY-MM-DD"|null, "kind":"itemized"|"summary"|null,
 "lines":[{"serviceDate":"YYYY-MM-DD"|null,"description":string,"code":string|null,
   "codeType":"CPT"|"HCPCS"|"REV"|"OTHER"|null,"units":number|null,"charge":string,
   "bbox":[x0,y0,x1,y1]|null,"confidence":number,"page":number|null}],
 "totals":{"charges":string|null,"adjustments":string|null,"paid":string|null,"due":string|null}}
Rules: one entry per charge line, in printed order. Copy every amount exactly as printed, as a string. Never add, total, or compute anything. Use null when a value is not printed. confidence is 0 to 1 for how sure you are of that line. Ignore names, addresses, and account numbers.`;

export async function cleanupText(
  text: string,
  chat: typeof stepfunChat = stepfunChat,
): Promise<ReaderOutput | null> {
  try {
    const content = await chat([
      { role: "system", content: READER_INSTRUCTIONS },
      { role: "user", content: text },
    ]);
    const parsed = ReaderOutput.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
