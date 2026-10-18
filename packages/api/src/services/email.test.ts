import { afterEach, describe, expect, it, vi } from "vitest";

import { isAllowlisted, sendEmail } from "./email";
import { emailFromDraft } from "./send";

const msg = { to: "inbox@example.com", subject: "Hi", text: "Body" };

function reply(status: number, body: object) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(body, { status }));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("uses the fake provider only when BB_FAKE_PROVIDERS=1", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    const fetch = reply(200, { id: "x" });
    const sent = await sendEmail(msg, { fetch });
    expect(sent.provider).toBe("fake");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to send without Resend settings", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("RESEND_API_KEY", "");
    await expect(sendEmail(msg, { fetch: reply(200, {}) })).rejects.toThrow(
      "RESEND_API_KEY or EMAIL_FROM is not set",
    );
  });

  it("posts to Resend and returns its message id", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("EMAIL_PROVIDER", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "BetterBill <demo@example.com>");
    const fetch = reply(200, { id: "msg_1" });
    expect(await sendEmail(msg, { fetch })).toEqual({
      provider: "resend",
      messageId: "msg_1",
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer re_test",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      from: "BetterBill <demo@example.com>",
      to: ["inbox@example.com"],
      subject: "Hi",
      text: "Body",
    });
  });

  it("throws on a Resend error status", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "demo@example.com");
    await expect(sendEmail(msg, { fetch: reply(422, {}) })).rejects.toThrow(
      "422",
    );
  });

  it("does not guess at an unsupported provider", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("EMAIL_PROVIDER", "photon");
    await expect(sendEmail(msg, { fetch: reply(200, {}) })).rejects.toThrow(
      "photon is not set up",
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
