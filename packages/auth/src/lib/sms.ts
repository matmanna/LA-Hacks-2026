// Server-only. Text messages through Photon (https://api.photon.codes/openapi.json).
// The platform is PHOTON_TEXT_PLATFORM: "imessage" (default; reaches iPhones
// through the project's iMessage line) or "sms" (sent from PHOTON_PHONE_NUMBER).
// Used for sign-in codes and for "your lookup is ready" notices.
import { z } from "zod";

const PhotonResponse = z.object({
  id: z.string().min(1),
  kind: z.string().optional(),
});

const UserList = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      kind: z.string().optional(),
      platform: z.string().optional(),
    }),
  ),
});

// Texts go only to numbers on CALL_ALLOWLIST, unless the operator turned on
// CALL_ALLOW_USER_NUMBERS=1. Stops the sign-in form from texting strangers.
export function canText(e164: string): boolean {
  const allowed = (process.env.CALL_ALLOWLIST ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return (
    allowed.includes(e164) ||
    (process.env.CALL_ALLOW_USER_NUMBERS === "1" &&
      /^\+[1-9]\d{7,14}$/.test(e164))
  );
}

export type SentText = { provider: string; messageId: string };

export async function sendText(
  msg: { to: string; text: string; idempotencyKey: string },
  opts: { fetch?: typeof fetch } = {},
): Promise<SentText> {
  if (process.env.BB_FAKE_PROVIDERS === "1") {
    return { provider: "fake", messageId: `fake_${crypto.randomUUID()}` };
  }
  if (!canText(msg.to)) {
    throw new Error("This demo only texts numbers on the test list.");
  }
  const key = process.env.PHOTON_API_KEY;
  const project = process.env.PHOTON_PROJECT_ID;
  if (!key || !project) {
    throw new Error("PHOTON_API_KEY or PHOTON_PROJECT_ID is not set");
  }
  const platform =
    process.env.PHOTON_TEXT_PLATFORM === "sms" ? "sms" : "imessage";
  const doFetch = opts.fetch ?? fetch;
  const base = `https://api.photon.codes/v1/projects/${encodeURIComponent(project)}`;
  const signal = AbortSignal.timeout(15_000);

  async function post(path: string, body: object, step: string) {
    const res = await doFetch(`${base}/${path}`, {
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

  // The project's own line on this platform: an "agent" user.
  async function findSender() {
    const from = process.env.PHOTON_PHONE_NUMBER?.trim();
    if (platform === "sms" && from) {
      const sender = await post("users", { platform, handle: from }, "from");
      if (sender.kind !== "agent") {
        throw new Error(
          "PHOTON_PHONE_NUMBER is not an SMS number owned by this project",
        );
      }
      return sender;
    }
    const res = await doFetch(`${base}/users?limit=100`, {
      headers: { authorization: `Bearer ${key}` },
      signal,
    });
    if (!res.ok) throw new Error(`Photon users request failed: ${res.status}`);
    const list = UserList.safeParse(await res.json());
    const agent = list.success
      ? list.data.items.find(
          (u) => u.kind === "agent" && u.platform === platform,
        )
      : undefined;
    if (!agent) throw new Error(`This Photon project has no ${platform} line`);
    return agent;
  }

  const sender = await findSender();
  const recipient = await post("users", { platform, handle: msg.to }, "to");
  const space = await post(
    "spaces",
    { platform, participantIds: [sender.id, recipient.id] },
    "space",
  );
  const message = await post(
    "messages",
    {
      spaceId: space.id,
      senderId: sender.id,
      content: { type: "text", format: "plain", text: msg.text },
    },
    "message",
  );
  return { provider: "photon", messageId: message.id };
}
