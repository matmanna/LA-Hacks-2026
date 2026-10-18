// StepFun chat completions (OpenAI-compatible). Server-only: reads
// STEPFUN_API_KEY from the server env and must never reach the client bundle.
// Docs: https://platform.stepfun.ai/docs/en/api-reference/chat/chat-completion-create
export const STEPFUN_MODEL = "step-5-preview";
const DEFAULT_BASE_URL = "https://api.stepfun.ai/v1";

export type ChatContent =
  | string
  | (
      | { type: "text"; text: string }
      | {
          type: "image_url";
          image_url: { url: string; detail?: "low" | "high" };
        }
    )[];
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: ChatContent;
};

export async function stepfunChat(
  messages: ChatMessage[],
  opts: { fetch?: typeof fetch; timeoutMs?: number } = {},
): Promise<string> {
  const key = process.env.STEPFUN_API_KEY;
  if (!key) throw new Error("STEPFUN_API_KEY is not set");
  const base = process.env.STEPFUN_BASE_URL || DEFAULT_BASE_URL;
  const res = await (opts.fetch ?? fetch)(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: STEPFUN_MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
  });
  if (!res.ok) throw new Error(`StepFun request failed: ${res.status}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("StepFun returned no content");
  return content;
}
