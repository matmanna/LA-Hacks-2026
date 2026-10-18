// Gemini generateContent over REST (no SDK, so no new dependency). Server-only:
// reads GEMINI_API_KEY from the server env and must never reach the client bundle.
// Docs: https://ai.google.dev/api/generate-content
import { chatSpan, geminiResultAttrs } from "../aiSpan";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function geminiJson(
  req: {
    system: string;
    input: string;
    schema: object;
    timeoutMs: number;
    agent?: string;
  },
  opts: { fetch?: typeof fetch } = {},
): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  return chatSpan("gcp.gemini", model, req.agent, async (setResult) => {
    const res = await (opts.fetch ?? fetch)(
      `${BASE_URL}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.input }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: req.schema,
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(req.timeoutMs),
      },
    );
    setResult({ "http.response.status_code": res.status });
    if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    setResult(geminiResultAttrs(body, model));
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no content");
    return JSON.parse(text);
  });
}
