import type { ParseResult } from "@betterbill/core";
import { startSpan } from "@sentry/core";

// Sentry AI agent monitoring spans, named per
// https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/manual-instrumentation/
// Only model names, token counts, finish reasons and our own counts go on
// these spans. Never prompts, images, bill text or model output.
type Attrs = Record<string, string | number | boolean>;

export function chatSpan<T>(
  provider: string,
  model: string,
  agent: string | undefined,
  fn: (setResult: (attrs: Attrs) => void) => Promise<T>,
): Promise<T> {
  return startSpan(
    {
      op: "gen_ai.chat",
      name: `chat ${model}`,
      attributes: {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": provider,
        "gen_ai.request.model": model,
        ...(agent ? { "gen_ai.agent.name": agent } : {}),
      },
    },
    (span) => fn((attrs) => span.setAttributes(attrs)),
  );
}

export function agentSpan<T>(
  agent: string,
  attributes: Attrs,
  fn: (setResult: (attrs: Attrs) => void) => Promise<T>,
): Promise<T> {
  return startSpan(
    {
      op: "gen_ai.invoke_agent",
      name: `invoke_agent ${agent}`,
      attributes: {
        "gen_ai.operation.name": "invoke_agent",
        "gen_ai.agent.name": agent,
        ...attributes,
      },
    },
    (span) => fn((attrs) => span.setAttributes(attrs)),
  );
}

// OpenAI-compatible response (StepFun) -> span attributes.
export function openAiResultAttrs(body: unknown, requested: string): Attrs {
  const b = (body ?? {}) as {
    id?: unknown;
    model?: unknown;
    usage?: {
      prompt_tokens?: unknown;
      completion_tokens?: unknown;
      total_tokens?: unknown;
    };
    choices?: { finish_reason?: unknown }[];
  };
  const attrs: Attrs = {
    "gen_ai.response.model": typeof b.model === "string" ? b.model : requested,
  };
  if (typeof b.id === "string") attrs["gen_ai.response.id"] = b.id;
  const u = b.usage;
  if (typeof u?.prompt_tokens === "number")
    attrs["gen_ai.usage.input_tokens"] = u.prompt_tokens;
  if (typeof u?.completion_tokens === "number")
    attrs["gen_ai.usage.output_tokens"] = u.completion_tokens;
  if (typeof u?.total_tokens === "number")
    attrs["gen_ai.usage.total_tokens"] = u.total_tokens;
  const finish = b.choices?.[0]?.finish_reason;
  if (typeof finish === "string")
    attrs["gen_ai.response.finish_reasons"] = JSON.stringify([finish]);
  return attrs;
}

// Gemini generateContent response -> span attributes.
export function geminiResultAttrs(body: unknown, requested: string): Attrs {
  const b = (body ?? {}) as {
    modelVersion?: unknown;
    responseId?: unknown;
    usageMetadata?: {
      promptTokenCount?: unknown;
      candidatesTokenCount?: unknown;
      totalTokenCount?: unknown;
    };
    candidates?: { finishReason?: unknown }[];
  };
  const attrs: Attrs = {
    "gen_ai.response.model":
      typeof b.modelVersion === "string" ? b.modelVersion : requested,
  };
  if (typeof b.responseId === "string")
    attrs["gen_ai.response.id"] = b.responseId;
  const u = b.usageMetadata;
  if (typeof u?.promptTokenCount === "number")
    attrs["gen_ai.usage.input_tokens"] = u.promptTokenCount;
  if (typeof u?.candidatesTokenCount === "number")
    attrs["gen_ai.usage.output_tokens"] = u.candidatesTokenCount;
  if (typeof u?.totalTokenCount === "number")
    attrs["gen_ai.usage.total_tokens"] = u.totalTokenCount;
  const finish = b.candidates?.[0]?.finishReason;
  if (typeof finish === "string")
    attrs["gen_ai.response.finish_reasons"] = JSON.stringify([finish]);
  return attrs;
}

// Counts that make reader bugs visible in a trace: a non-zero diff on a bill
// that should reconcile, many low-confidence lines, or a cache fallback.
export function readerResultAttrs(r: ParseResult): Attrs {
  return {
    "bb.reader.mode": r.reader.mode,
    "bb.reader.latency_ms": r.reader.latencyMs,
    "bb.bill.line_count": r.bill.lines.length,
    "bb.reader.low_confidence_count": r.lowConfidenceLineIds.length,
    "bb.reader.warning_count": r.warnings.length,
    "bb.reconciliation.ok": r.reconciliation.ok,
    "bb.reconciliation.diff_cents": r.reconciliation.diffCents,
  };
}
