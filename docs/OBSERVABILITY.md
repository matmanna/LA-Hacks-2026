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
| Oct 17, 21:07 | [762858848e27](https://eng-hackclub-benderhq.sentry.io/explore/traces/trace/762858848e274eea9d27a83099eaf0b4/) | During the first production run of the hero path, the demo photo took 26 s. The trace put almost all of `bill.parsePhoto` in the StepFun call, for a photo whose saved reading was already bundled in the build. So the saved reading was never used. Cause 1: `BB_READER_MODE` was not set on Vercel, so production read every photo live. | Set `BB_READER_MODE=cache_first` on Vercel; the same photo then read in 0.45 s (22:03). #68 adds `bb.reader.mode_setting` and `bb.reader.mode` to the `invoke_agent bill-reader` span so this is visible in one look. |
| Oct 17, about 22:50 | (follow-up from the same span fields) | With `cache_first` on, photos uploaded through the web app still read live (27 s) while the script upload hit the saved reading. Cause 2: the web app re-encoded every photo through a canvas, so the hash never matched the saved reading. | #82 sends small JPEGs unchanged; a browser upload of the demo photo then used the saved reading in under a second. |

How it was found, honestly: we noticed the slow read while testing, and the trace showed where the time went and that it was a live model call, not the database or the network. The second cause came from comparing a script upload with a browser upload.

## Which Sentry product is used where

| Product | Where | Notes |
|---|---|---|
| Tracing | [`apps/web/src/instrument.client.ts`](../apps/web/src/instrument.client.ts), [`instrument.server.ts`](../apps/web/src/instrument.server.ts), [`packages/api/src/observe.ts`](../packages/api/src/observe.ts), [`packages/api/src/telemetry.ts`](../packages/api/src/telemetry.ts) | Browser to server traces, `orpc.*` spans, hero-path spans `bb.parse`, `bb.audit`, `bb.draft`, `bb.approve`, `bb.send` with `bb.<step>_ms` measurements and a `bb.flow` tag |
| Logs | [`telemetry.ts`](../packages/api/src/telemetry.ts), [`lib/sentry.ts`](../apps/web/src/lib/sentry.ts) | `enableLogs`, structured hero-path logs, console warnings and errors forwarded |
| Session Replay | [`instrument.client.ts`](../apps/web/src/instrument.client.ts) | Mask all text and inputs, block media and bill content. 100% on error |
| Profiling | [`instrument.client.ts`](../apps/web/src/instrument.client.ts), [`routes/__root.tsx`](../apps/web/src/routes/__root.tsx) | Browser profiling (Chromium). Node profiling skipped, see [SENTRY.md](SENTRY.md) |
| AI agent monitoring | [`packages/api/src/aiSpan.ts`](../packages/api/src/aiSpan.ts) | Section above |
| Uptime | Sentry Uptime monitor on `/api/auth/ok` (created in the Sentry UI, not in code) | Checks the deployed app answers |
| Errors | `captureException` in `observe.ts`, route error fallback in [`router.tsx`](../apps/web/src/router.tsx) | |

Generate real events for the demo with `/sentry-test` (see [SENTRY.md](SENTRY.md)).

## How we used it (team to fill in)

Do not add anything here that Sentry did not show us. Link the trace, replay or log for each item.

- TODO: a slow endpoint or step found in a trace (which span, how long, what we changed).
- TODO: a broken flow caught in a replay (which screen, what the user hit, fix PR).
- TODO: a bug found through logs (the query used, what it showed, fix PR).
- TODO: what browser profiling showed on the results screen, if we looked.
- TODO: an uptime alert, if one fired.
