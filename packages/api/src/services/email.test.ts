import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAllowlisted, sendEmail } from "./email";
import { emailFromDraft } from "./send";

const msg = {
  to: "inbox@example.com",
  subject: "Hi",
  text: "Body",
  idempotencyKey: "letter_action1_hash1",
};

function reply(status: number, body: object) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(body, { status }));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  beforeEach(() => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("EMAIL_PROVIDER", "photon");
    vi.stubEnv("PHOTON_API_KEY", "photon_test");
    vi.stubEnv("PHOTON_PROJECT_ID", "project_test");
    vi.stubEnv("EMAIL_FROM", "betterbill@example.com");
  });

  function photonReply() {
    return vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: "sender", kind: "agent" }))
      .mockResolvedValueOnce(Response.json({ id: "recipient", kind: "human" }))
      .mockResolvedValueOnce(Response.json({ id: "space" }))
      .mockResolvedValueOnce(Response.json({ id: "message" }, { status: 202 }));
  }

  it("uses the fake provider only when BB_FAKE_PROVIDERS=1", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    const fetch = reply(200, { id: "x" });
    expect((await sendEmail(msg, { fetch })).provider).toBe("fake");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["PHOTON_API_KEY", "PHOTON_PROJECT_ID", "EMAIL_FROM"])(
    "requires %s before making requests",
    async (name) => {
      vi.stubEnv(name, "");
      const fetch = photonReply();
      await expect(sendEmail(msg, { fetch })).rejects.toThrow("is not set");
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("sends a new email with the exact recipient, subject and plain text", async () => {
    const fetch = photonReply();
    expect(await sendEmail(msg, { fetch })).toEqual({
      provider: "photon",
      messageId: "message",
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://api.photon.codes/v1/projects/project_test/users",
      "https://api.photon.codes/v1/projects/project_test/users",
      "https://api.photon.codes/v1/projects/project_test/spaces",
      "https://api.photon.codes/v1/projects/project_test/messages",
    ]);
    expect(
      fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body))),
    ).toEqual([
      { platform: "email", handle: "betterbill@example.com" },
      { platform: "email", handle: msg.to },
      { platform: "email", participantIds: ["sender", "recipient"] },
      {
        spaceId: "space",
        senderId: "sender",
        content: { type: "text", format: "plain", text: msg.text },
        email: { subject: msg.subject, to: [{ address: msg.to }] },
      },
    ]);
    for (const [, init] of fetch.mock.calls) {
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer photon_test",
      );
    }
  });

  it("reuses the same thread and message keys after an uncertain send", async () => {
    const first = photonReply();
    first
      .mockReset()
      .mockResolvedValueOnce(Response.json({ id: "sender", kind: "agent" }))
      .mockResolvedValueOnce(Response.json({ id: "recipient" }))
      .mockResolvedValueOnce(Response.json({ id: "space" }))
      .mockRejectedValueOnce(new Error("timeout"));
    await expect(sendEmail(msg, { fetch: first })).rejects.toThrow("timeout");
    const retry = photonReply();
    await sendEmail(msg, { fetch: retry });
    const keys = (f: typeof first) =>
      f.mock.calls.map(([, init]) =>
        new Headers(init?.headers).get("idempotency-key"),
      );
    expect(keys(first)).toEqual(keys(retry));
    expect(keys(retry)[2]).toBe(`${msg.idempotencyKey}:space`);
    expect(keys(retry)[3]).toBe(`${msg.idempotencyKey}:message`);
  });

  it("rejects a sender whose domain is not owned by the project", async () => {
    const fetch = reply(200, { id: "sender", kind: "human" });
    await expect(sendEmail(msg, { fetch })).rejects.toThrow(
      "verified Photon email domain",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { id: 7 }])(
    "rejects malformed Photon responses without sending",
    async (body) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(Response.json(body));
      await expect(sendEmail(msg, { fetch })).rejects.toThrow(
        "invalid response",
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("reports provider errors without exposing their response body", async () => {
    await expect(
      sendEmail(msg, { fetch: reply(403, { secret: "private" }) }),
    ).rejects.toThrow("Photon users request failed: 403");
  });

  it("does not guess at an unsupported provider", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "unknown");
    await expect(sendEmail(msg, { fetch: reply(200, {}) })).rejects.toThrow(
      "unknown is not set up",
    );
  });
});

describe("isAllowlisted", () => {
  it("matches the comma-separated list, ignoring case and spaces", () => {
    vi.stubEnv("EMAIL_ALLOWLIST", " Inbox@Example.com , other@example.com");
    expect(isAllowlisted("inbox@example.com")).toBe(true);
    expect(isAllowlisted("someone@example.com")).toBe(false);
  });

  it("allows nothing when the list is empty", () => {
    vi.stubEnv("EMAIL_ALLOWLIST", "");
    expect(isAllowlisted("inbox@example.com")).toBe(false);
  });
});

describe("emailFromDraft", () => {
  it("takes the subject from the draft and labels it as a demo", () => {
    const email = emailFromDraft(
      "2026-10-17\n\nSubject: Request to review charges\n\nHello",
    );
    expect(email.subject).toBe("[BetterBill demo] Request to review charges");
    expect(
      email.text.startsWith("This is a demo message from BetterBill"),
    ).toBe(true);
    expect(email.text).toContain("Subject: Request to review charges");
  });

  it("falls back to a plain subject when the draft has none", () => {
    expect(emailFromDraft("Hello").subject).toBe("[BetterBill demo] Your bill");
  });
});
