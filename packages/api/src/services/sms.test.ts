import { canText, sendText } from "@betterbill/auth/lib/sms";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (b: unknown) =>
  new Response(JSON.stringify(b), {
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.stubEnv("PHOTON_API_KEY", "k");
  vi.stubEnv("PHOTON_PROJECT_ID", "p");
  vi.stubEnv("CALL_ALLOWLIST", "+13105550100");
  vi.stubEnv("CALL_ALLOW_USER_NUMBERS", "");
  vi.stubEnv("PHOTON_TEXT_PLATFORM", "");
  vi.stubEnv("BB_FAKE_PROVIDERS", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("texts", () => {
  it("only texts allowlisted numbers unless the operator allows any", () => {
    expect(canText("+13105550100")).toBe(true);
    expect(canText("+13105550199")).toBe(false);
    vi.stubEnv("CALL_ALLOW_USER_NUMBERS", "1");
    expect(canText("+13105550199")).toBe(true);
    expect(canText("310")).toBe(false);
  });

  it("refuses an unlisted number before calling Photon", async () => {
    const f = vi.fn();
    await expect(
      sendText(
        { to: "+13105550199", text: "hi", idempotencyKey: "a" },
        { fetch: f },
      ),
    ).rejects.toThrow("test list");
    expect(f).not.toHaveBeenCalled();
  });

  it("sends from the project's iMessage agent line", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const f = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        calls.push({
          url,
          body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        if (url.includes("/users?"))
          return json({
            items: [
              { id: "u-human", kind: "human", platform: "imessage" },
              { id: "u-agent", kind: "agent", platform: "imessage" },
            ],
          });
        return json({ id: url.split("/").pop() ?? "x" });
      },
    ) as unknown as typeof fetch;
    const sent = await sendText(
      { to: "+13105550100", text: "code 123456", idempotencyKey: "a" },
      { fetch: f },
    );
    expect(sent.provider).toBe("photon");
    const message = calls.at(-1);
    expect(message?.url).toMatch(/\/messages$/);
    expect(message?.body).toMatchObject({
      senderId: "u-agent",
      content: { type: "text", text: "code 123456" },
    });
    expect(calls.find((c) => c.url.endsWith("/spaces"))?.body).toMatchObject({
      platform: "imessage",
    });
  });

  it("fails clearly when the project has no line", async () => {
    const f = vi.fn(async () => json({ items: [] })) as unknown as typeof fetch;
    await expect(
      sendText(
        { to: "+13105550100", text: "x", idempotencyKey: "a" },
        { fetch: f },
      ),
    ).rejects.toThrow("no imessage line");
  });
});
