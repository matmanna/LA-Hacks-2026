// Server-only. Photon REST contract: https://api.photon.codes/openapi.json
import { z } from "zod";

const PhotonResponse = z.object({
  id: z.string().min(1),
  kind: z.string().optional(),
});

export type SentEmail = { provider: string; messageId: string };

export async function sendEmail(
  msg: { to: string; subject: string; text: string; idempotencyKey: string },
  opts: { fetch?: typeof fetch } = {},
): Promise<SentEmail> {
  // ponytail: test-only provider; the event summary says "fake" so it can't
  // pass for a real send.
  if (process.env.BB_FAKE_PROVIDERS === "1") {
    return { provider: "fake", messageId: `fake_${crypto.randomUUID()}` };
  }
  const provider = process.env.EMAIL_PROVIDER || "photon";
  if (provider !== "photon") {
    throw new Error(`Email provider ${provider} is not set up`);
  }
  const key = process.env.PHOTON_API_KEY;
  const project = process.env.PHOTON_PROJECT_ID;
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !project || !from) {
    throw new Error(
      "PHOTON_API_KEY, PHOTON_PROJECT_ID or EMAIL_FROM is not set",
    );
  }
  const base = `https://api.photon.codes/v1/projects/${encodeURIComponent(project)}`;
  const signal = AbortSignal.timeout(15_000);
  async function post(path: string, body: object, step: string) {
    const res = await (opts.fetch ?? fetch)(`${base}/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "idempotency-key": `${msg.idempotencyKey}:${step}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok)
      throw new Error(`Photon ${path} request failed: ${res.status}`);
    const parsed = PhotonResponse.safeParse(await res.json());
    if (!parsed.success)
      throw new Error(`Photon ${path} returned an invalid response`);
    return parsed.data;
  }

  const sender = await post(
    "users",
    { platform: "email", handle: from },
    "sender",
  );
  if (sender.kind !== "agent") {
    throw new Error(
      "EMAIL_FROM must use a verified Photon email domain owned by this project",
    );
  }
  const recipient = await post(
    "users",
    { platform: "email", handle: msg.to },
    "recipient",
  );
  // shortcut: Photon retains thread keys for 24h; persist space IDs before supporting later retries.
  const space = await post(
    "spaces",
    {
      platform: "email",
      participantIds: [sender.id, recipient.id],
    },
    "space",
  );
  const message = await post(
    "messages",
    {
      spaceId: space.id,
      senderId: sender.id,
      content: { type: "text", format: "plain", text: msg.text },
      email: { subject: msg.subject, to: [{ address: msg.to }] },
    },
    "message",
  );
  // Photon accepts asynchronous delivery; this is not an inbox receipt.
  return { provider: "photon", messageId: message.id };
}

export function isAllowlisted(address: string): boolean {
  const allowed = (process.env.EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(address.trim().toLowerCase());
}
