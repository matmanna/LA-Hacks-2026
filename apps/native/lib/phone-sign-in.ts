import { normalizePhone } from "@betterbill/core/phone";

import { client, queryClient } from "@/utils/orpc";
import { authClient } from "./auth-client";
import { loadCases } from "./cases";

// Sign in with a phone number and a texted code. Both return an error message
// to show, or null on success.
export async function sendCode(input: string): Promise<string | null> {
  const phoneNumber = normalizePhone(input);
  if (!phoneNumber) {
    return "That phone number doesn't look right. Use a full number, like (415) 555-0123.";
  }
  const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber });
  return error ? (error.message ?? "We couldn't text that number.") : null;
}

export async function verifyCode(
  input: string,
  code: string,
): Promise<string | null> {
  const phoneNumber = normalizePhone(input);
  if (!phoneNumber) return "That phone number doesn't look right.";
  const { error } = await authClient.phoneNumber.verify({ phoneNumber, code });
  if (error) return error.message ?? "That code didn't work. Try again.";
  await claimLocalCases();
  await queryClient.invalidateQueries();
  return null;
}

// Bills checked on this phone before signing in move to the account, so the
// web shows them too. Cases that already belong to someone are skipped.
export async function claimLocalCases() {
  const cases = await loadCases();
  await Promise.all(
    cases.map((c) =>
      client.case.claim({ caseId: c.id }).catch(() => undefined),
    ),
  );
}
