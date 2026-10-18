# Observability

Sentry setup (DSN, privacy, per-procedure spans) is in [SENTRY.md](SENTRY.md). This file covers the AI spans and the log of what traces showed us.

## AI agent monitoring

Spans follow Sentry's manual AI instrumentation names (https://docs.sentry.io/platforms/javascript/guides/node/agent-tracing/manual-instrumentation/). Our StepFun and Gemini clients call the REST APIs with `fetch`, not an SDK, so no Sentry integration instruments them automatically.

| Span | op | Where | Attributes |
|---|---|---|---|
| `orpc.<procedure>` | `rpc` | `packages/api/src/observe.ts` | `bb.procedure`, `bb.case_id`, `bb.lever.*`, `bb.duration_ms` |
| `invoke_agent bill-reader` | `gen_ai.invoke_agent` | `bill.parsePhoto`, `bill.parseText` | `bb.reader.input`, `bb.reader.mode_setting`, `bb.reader.pages`, then `bb.reader.mode` (`cache`, `step-5-preview`, `deterministic`, `model_cleanup`), `bb.reader.latency_ms`, `bb.bill.line_count`, `bb.reader.low_confidence_count`, `bb.reader.warning_count`, `bb.reconciliation.ok`, `bb.reconciliation.diff_cents` |
| `chat step-5-preview` | `gen_ai.chat` | `packages/api/src/reader/stepfun.ts` | `gen_ai.provider.name` `stepfun`, request and response model, input, output and total tokens, finish reasons, `http.response.status_code` |
| `chat <GEMINI_MODEL>` | `gen_ai.chat` | `packages/api/src/services/gemini.ts` (letters) | same, provider `gcp.gemini` |

Every call with a `caseId` runs `Sentry.setConversationId(caseId)`, so all AI calls for one case group together under Conversations.

**Never recorded:** prompts, images, bill text, line descriptions, model output, letter text. `gen_ai.input.messages` and `gen_ai.output.messages` are left out on purpose. `packages/api/src/aiSpan.test.ts` checks that a bill line sent to the model does not appear in any span.

### What to look for

- `bb.reconciliation.diff_cents` not 0 on a bill that should add up (a misread amount, a thousands separator, a credit line).
- `bb.reader.mode` is `cache` when `bb.reader.mode_setting` is `live` (the live read failed and we fell back).
- `gen_ai.chat` taking most of `orpc.bill.parsePhoto` (photo read latency, about 26 s p50 measured).
- `gen_ai.response.finish_reasons` `["length"]` (output cut off, lines missing).
- `http.response.status_code` 429 or 5xx on Gemini (quota; we hit 429 and 503 on some Gemini models on Oct 17).

## Trace log (bug found via a trace)

One line per finding: time (PDT), trace link, what the trace showed, fix PR. Only real findings. If nothing real turns up, we say the traces confirmed the flow worked and claim no bug.

| Time | Trace | What it showed | Fix |
|---|---|---|---|
| | | | |
