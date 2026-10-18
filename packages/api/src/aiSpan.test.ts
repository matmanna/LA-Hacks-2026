import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type SpanCall = {
  options: { op: string; name: string; attributes: Record<string, unknown> };
  set: Record<string, unknown>;
};
const spans: SpanCall[] = [];

vi.mock("@sentry/core", () => ({
  startSpan: (
    options: SpanCall["options"],
    fn: (span: {
      setAttributes: (a: Record<string, unknown>) => void;
    }) => unknown,
  ) => {
    const call: SpanCall = { options, set: {} };
    spans.push(call);
    return fn({ setAttributes: (a) => Object.assign(call.set, a) });
  },
}));

const { geminiResultAttrs, openAiResultAttrs } = await import("./aiSpan");
const { stepfunChat } = await import("./reader/stepfun");
const { geminiJson } = await import("./services/gemini");

const SECRET = "CBC W/ DIFFERENTIAL 85025 account 4821";

const reply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  spans.length = 0;
  vi.stubEnv("STEPFUN_API_KEY", "test");
  vi.stubEnv("GEMINI_API_KEY", "test");
  vi.stubEnv("GEMINI_MODEL", "gemini-test");
});
afterEach(() => vi.unstubAllEnvs());

describe("AI spans", () => {
  it("records a gen_ai.chat span for StepFun with usage, never content", async () => {
    const fetch = reply({
      id: "chatcmpl-1",
      model: "step-5-preview",
      usage: {
        prompt_tokens: 1200,
        completion_tokens: 300,
        total_tokens: 1500,
      },
      choices: [
        { finish_reason: "stop", message: { content: `{"x":"${SECRET}"}` } },
      ],
    });
    await stepfunChat(
      [
        { role: "system", content: "read bills" },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: "data:image/png;base64,AAAA" },
            },
            { type: "text", text: SECRET },
          ],
        },
      ],
      { fetch, agent: "bill-reader" },
    );
    expect(spans).toHaveLength(1);
    const [s] = spans;
    expect(s?.options.op).toBe("gen_ai.chat");
    expect(s?.options.name).toBe("chat step-5-preview");
    expect(s?.options.attributes).toMatchObject({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": "stepfun",
      "gen_ai.request.model": "step-5-preview",
      "gen_ai.agent.name": "bill-reader",
    });
    expect(s?.set).toMatchObject({
      "gen_ai.response.model": "step-5-preview",
      "gen_ai.usage.input_tokens": 1200,
      "gen_ai.usage.output_tokens": 300,
      "http.response.status_code": 200,
    });
    const recorded = JSON.stringify(spans);
    expect(recorded).not.toContain("85025");
    expect(recorded).not.toContain("base64");
    expect(recorded).not.toContain("read bills");
  });

  it("records the HTTP status when StepFun fails", async () => {
    await expect(
      stepfunChat([{ role: "user", content: "x" }], { fetch: reply({}, 429) }),
    ).rejects.toThrow("429");
    expect(spans[0]?.set["http.response.status_code"]).toBe(429);
  });

  it("records a gen_ai.chat span for Gemini, never content", async () => {
    const fetch = reply({
      modelVersion: "gemini-test-001",
      usageMetadata: {
        promptTokenCount: 50,
        candidatesTokenCount: 20,
        totalTokenCount: 70,
      },
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } },
      ],
    });
    await geminiJson(
      { system: "write letters", input: SECRET, schema: {}, timeoutMs: 1000 },
      { fetch },
    );
    expect(spans[0]?.options).toMatchObject({
      op: "gen_ai.chat",
      name: "chat gemini-test",
    });
    expect(spans[0]?.set).toMatchObject({
      "gen_ai.response.model": "gemini-test-001",
      "gen_ai.usage.input_tokens": 50,
      "gen_ai.usage.output_tokens": 20,
    });
    expect(JSON.stringify(spans)).not.toContain("85025");
  });
});

describe("result attribute mapping", () => {
  it("falls back to the requested model and skips missing usage", () => {
    expect(openAiResultAttrs({}, "step-5-preview")).toEqual({
      "gen_ai.response.model": "step-5-preview",
    });
    expect(geminiResultAttrs(null, "g")).toEqual({
      "gen_ai.response.model": "g",
    });
  });

  it("records finish reasons as a JSON array", () => {
    expect(
      openAiResultAttrs({ choices: [{ finish_reason: "length" }] }, "m")[
        "gen_ai.response.finish_reasons"
      ],
    ).toBe('["length"]');
  });
});
