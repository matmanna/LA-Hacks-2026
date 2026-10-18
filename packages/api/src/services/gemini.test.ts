import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_GEMINI_MODEL, geminiJson } from "./gemini";

const req = {
  system: "sys",
  input: "in",
  schema: { type: "object" },
  timeoutMs: 1000,
};

function reply(status: number, text?: string) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      Response.json(
        text === undefined
          ? {}
          : { candidates: [{ content: { parts: [{ text }] } }] },
        { status },
      ),
    );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("geminiJson", () => {
  it("throws when GEMINI_API_KEY is not set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(geminiJson(req, { fetch: reply(200, "{}") })).rejects.toThrow(
      "GEMINI_API_KEY is not set",
    );
  });

  it("sends the key, model, and schema, and parses the JSON reply", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    const fetch = reply(200, '{"ok":true}');
    expect(await geminiJson(req, { fetch })).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toContain(
      `/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    );
    expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.generationConfig.responseJsonSchema).toEqual(req.schema);
    expect(body.systemInstruction.parts[0].text).toBe("sys");
  });

  it("uses GEMINI_MODEL when set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-test");
    const fetch = reply(200, "{}");
    await geminiJson(req, { fetch });
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/models/gemini-test:");
  });

  it("throws on an error status or an empty reply", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    await expect(geminiJson(req, { fetch: reply(503) })).rejects.toThrow("503");
    await expect(geminiJson(req, { fetch: reply(200) })).rejects.toThrow(
      "no content",
    );
  });
});
