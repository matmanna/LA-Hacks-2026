# Sentry

Tracing and error capture for the web app and the oRPC API. Everything is a no-op when the DSN variables are unset (CI, local dev, tests).

## What is instrumented

- Client: `apps/web/src/instrument.client.ts` (imported first in `src/client.tsx`), router navigation tracing in `src/router.tsx`.
- Server: `apps/web/src/instrument.server.ts` (imported at the top of `src/server.ts`, the serverless option from the Sentry docs), `wrapFetchWithSentry`, and request and server function middleware in `src/start.ts`.
- oRPC: `packages/api/src/observe.ts`, applied to `publicProcedure` (so `protectedProcedure` too). One span per call named `orpc.<procedure>` with attributes `bb.procedure`, `bb.case_id`, `bb.lever.<lever>` counts (when the output has flags) and `bb.duration_ms`. Unexpected errors (not 4xx `ORPCError`) are captured with a `procedure` tag.
- Privacy: `sendDefaultPii` is false, user info is off, `dataCollection.genAI` inputs and outputs are off, and `beforeSend` and `beforeSendTransaction` drop request bodies, cookies, headers and query strings. Never add bill text, line descriptions, names, account refs, images or model prompts to spans, logs or events.
- Logs: `enableLogs` on client and server. The server also forwards `console.warn` and `console.error` (where evlog writes) with `consoleLoggingIntegration`. Hero-path steps log through `Sentry.logger` in `packages/api/src/telemetry.ts` (`heroStep`, `logStep`) with only caseId, counts, durations, mode and lever names.
- Hero-path spans: `bb.parse`, `bb.audit`, `bb.draft`, `bb.approve`, `bb.send` (op the same), each with a `bb.<step>_ms` measurement and `bb.duration_ms`. The `bb.flow` tag names the current step on the server and the current screen in the browser (set from the route in `src/router.tsx`). `bb.reader_mode` is a server tag from `BB_READER_MODE`.
- Tracing: the browser sends trace headers to its own origin (`tracePropagationTargets`), so a click, the `/api/rpc` call and the `orpc.*` span share one trace.
- Session Replay: `replayIntegration` in `src/instrument.client.ts`. `maskAllText`, `maskAllInputs` and `blockAllMedia` are on, and anything with `data-sentry-block` (bill table, line rows, flag rows, evidence sheet, approval and letter overlays, packet page), any table, dialog or textarea is blocked. Sample rate is 10% of sessions and 100% of sessions with an error.
- Profiling: browser profiling (Chromium only) with `browserProfilingIntegration`, `profileSessionSampleRate: 1.0`, `profileLifecycle: "trace"`, and the `Document-Policy: js-profiling` header from the root route. Node profiling is skipped, see below.
- Error fallback: `defaultErrorComponent` in `src/router.tsx` reports to Sentry and shows plain words. No feedback dialog, to keep the diff small.
- Source maps: uploaded by the Sentry Vite plugin only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are all set.

## Environment variables

| Name | Where | Notes |
|---|---|---|
| `SENTRY_DSN` | Vercel (server runtime) | Not a secret |
| `VITE_SENTRY_DSN` | Vercel (build and runtime) | Public, same DSN |
| `SENTRY_AUTH_TOKEN` | Vercel (build only) | Secret. Scopes: `project:releases`, `org:read`, `project:write` or an org auth token |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Vercel (build) | Slugs, for source maps |
| `SENTRY_ENVIRONMENT` | Vercel (optional) | Defaults to `VERCEL_ENV` |

Release is `VERCEL_GIT_COMMIT_SHA` on the server.

## Create the project

1. In Sentry, create a project with platform TanStack Start.
2. Copy its DSN into `SENTRY_DSN` and `VITE_SENTRY_DSN` in the Vercel project env.
3. Create an auth token and set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel (build).
4. Redeploy.

## Verify

Open `/sentry-test`, or call `healthCheck` or run a case on the deployment, then open Sentry Performance and find a trace with an `orpc.<procedure>` span.

## Replay: why it is safe here, and how to turn it off

The demo uses synthetic or public bills only, so no real patient data is on screen. Even so, replay masks all text and inputs, blocks media, and blocks every element that renders bill content, so a replay shows layout, clicks and navigation, not words or numbers. If you ever use real bills, set `replaysSessionSampleRate` and `replaysOnErrorSampleRate` to `0` (or remove `replayIntegration`) in `apps/web/src/instrument.client.ts`, then redeploy. Add `data-sentry-block` to any new component that renders bill content.

## Profiling: what was skipped

Node profiling needs `@sentry/profiling-node`, a native add-on that must match the SDK version exactly. The web app builds a standalone Nitro bundle with `ssr.noExternal`, which cannot ship a native binary, and a prebuilt-binary mismatch on Vercel would break the deploy. Server work is covered by traces and spans instead. Browser profiling needs no native code.

## Release and source maps

Release is `VERCEL_GIT_COMMIT_SHA` on the server, in the browser (injected at build by `vite.config.ts`) and in the source map upload, so all three line up. Environment is `SENTRY_ENVIRONMENT` or `VERCEL_ENV`. Check the Sentry build log for "Source Maps" upload lines after a Vercel build.

## Test events

`/sentry-test` sends a client error, a server error, a 1.5 s slow span and a log. It works in dev, and in production only when `SENTRY_TEST_ENABLED=true` is set on the server.
