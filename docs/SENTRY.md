# Sentry

Tracing and error capture for the web app and the oRPC API. Everything is a no-op when the DSN variables are unset (CI, local dev, tests).

## What is instrumented

- Client: `apps/web/src/instrument.client.ts` (imported first in `src/client.tsx`), router navigation tracing in `src/router.tsx`.
- Server: `apps/web/src/instrument.server.ts` (imported at the top of `src/server.ts`, the serverless option from the Sentry docs), `wrapFetchWithSentry`, and request and server function middleware in `src/start.ts`.
- oRPC: `packages/api/src/observe.ts`, applied to `publicProcedure` (so `protectedProcedure` too). One span per call named `orpc.<procedure>` with attributes `bb.procedure`, `bb.case_id`, `bb.lever.<lever>` counts (when the output has flags) and `bb.duration_ms`. Unexpected errors (not 4xx `ORPCError`) are captured with a `procedure` tag.
- Privacy: `sendDefaultPii` is false, user info is off, and `beforeSend` and `beforeSendTransaction` drop request bodies, cookies, headers and query strings. Replay is off because bills are on screen. Never add bill text, line descriptions, names, account refs or images to spans or events.
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

Call `healthCheck` or run a case on the deployment, then open Sentry Performance and find a trace with an `orpc.<procedure>` span.
