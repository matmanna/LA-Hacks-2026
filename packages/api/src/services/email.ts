// Outbound email for approved letters (ticket A-06). Resend over REST (no SDK,
// so no lockfile change). Server-only: keys never reach the client bundle.
// Docs: https://resend.com/docs/api-reference/emails/send-email
const RESEND_URL = "https://api.resend.com/emails";

export type SentEmail = { provider: string; messageId: string };

export async function sendEmail(
  msg: { to: string; subject: string; text: string },
  opts: { fetch?: typeof fetch } = {},
): Promise<SentEmail> {
  // ponytail: test-only provider; the event summary says "fake" so it can't
  // pass for a real send.
  if (process.env.BB_FAKE_PROVIDERS === "1") {
    return { provider: "fake", messageId: `fake_${crypto.randomUUID()}` };
  }
  const provider = process.env.EMAIL_PROVIDER || "resend";
  if (provider !== "resend") {
    // Photon email only documents replies, not a first message; not wired.
    throw new Error(`Email provider ${provider} is not set up`);
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY or EMAIL_FROM is not set");
  const res = await (opts.fetch ?? fetch)(RESEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend request failed: ${res.status}`);
  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new Error("Resend returned no message id");
  return { provider: "resend", messageId: body.id };
}

export function isAllowlisted(address: string): boolean {
  const allowed = (process.env.EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(address.trim().toLowerCase());
}
