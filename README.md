# BetterBill

BetterBill is a self-serve, evidence-first hospital bill checker. A patient photographs or pastes a bill, confirms each line the reader extracted, and a deterministic rules engine audits those lines. Every flag is shown with its **evidence tier** (confirmed from the bill, billing rule, hospital's published price, or estimate), savings are shown as a range, the hospital's financial assistance policy is checked, and BetterBill drafts a letter to the billing office. Nothing is sent, and nothing is said on a call, until the patient approves the exact text. Demo data is synthetic or comes from public sources (hospital price files, published news cases). BetterBill is informational. It is not medical or legal advice. It never calls anything "illegal", "fraud" or "overcharge" as a conclusion. It says things like "looks wrong", "doesn't match" or "higher than the hospital's own published price" (see `data/copy/wording.json` and `bun run copy:check`).

Product rules and conventions live in [docs/plans/00-shared-context.md](docs/plans/00-shared-context.md) and [AGENTS.md](AGENTS.md).

## Hero path

1. **Bill in:** photo (read by StepFun `step-5-preview`) or pasted text (deterministic parser first, optional Gemini cleanup). A "sample bill" button works without any key.
2. **Confirm lines:** the patient checks every extracted line (`bill.confirmLines`).
3. **Audit:** `audit.run` runs the rules in `packages/core` (duplicates, units, bill vs EOB, hospital's published price, missing itemization, assistance). Each flag carries a tier and evidence. The UI never computes savings.
4. **Savings summary:** confirmed savings plus a potential range, with the method listed.
5. **Letter:** Gemini drafts a letter, the patient approves the exact text, and it is sent through Resend to an allowlisted address.
6. **Optional call:** an ElevenLabs agent dials an allowlisted test number after a separate approval.
7. **Traces:** Sentry spans and logs for each hero-path step.

## Tech stack

Status values: **Used** means the code path exists on `main`. "Not verified live" means the code exists but this README makes no claim that it was exercised against the real service. This list covers only what is in the repo.

| Technology | What it does here | Where | Status |
|---|---|---|---|
| TanStack Start (React 19, TanStack Router and Query, Vite, Nitro) | Full-stack web app: routes (`/`, `/check`, `/case/$id`, `/packet/$token`, `/for-plans`, `/welcome`, `/login`, `/success`), server functions and API route handlers | `apps/web/` (`src/routes`, `src/functions`, `src/server.ts`, `vite.config.ts`) | Used |
| oRPC | Typed API. `packages/api` holds thin routers (`case`, `bill`, `audit`, `assistance`, `action`, `call`, `event`, `eval`, `payment`, `account`). Served at `/api/rpc` for the web and native clients. The OpenAPI handler at `/api/v1/<router>/<procedure>` is what the Fetch adapter calls | `packages/api/src/routers`, `apps/web/src/routes/api/rpc`, `apps/web/src/routes/api/v1` | Used |
| Better Auth | Email and password sign-in, Drizzle adapter, TanStack Start cookies. **Anonymous plugin:** anyone can check a bill without an account, and `onLinkAccount` moves their cases to the new account on sign-up. **Expo plugin:** sessions for the native app, with trusted origins for the `betterbill://` scheme and Expo Go. Approve, send and call require a real account only when `BB_REQUIRE_ACCOUNT=true` | `packages/auth/src/index.ts`, `apps/web/src/lib/auth-client.ts`, `apps/native/lib/auth-client.ts` | Used. `BB_REQUIRE_ACCOUNT` defaults to off |
| Drizzle ORM + PostgreSQL | Cases, bills, audits, actions, append-only case events, auth tables. Migrations are committed. Seed script for local data | `packages/db/` (`src/schema`, `src/migrations`, `src/seed.ts`), `docker-compose.yml` | Used. Local: Docker (`timescale/timescaledb:latest-pg16`). Shared: Tiger Data Postgres, applied by CI on `main` (job skips until `DATABASE_URL_SHARED` is set) |
| `packages/core` (zod 4) | Pure TypeScript with no IO: schemas, text parser, rules engine, savings and balance math, letter and call-script builders, case state machine, savings-fee math, copy checks | `packages/core/src` | Used. Vitest with coverage |
| Turborepo, Bun, Biome | Monorepo tasks, package manager (Bun 1.3.12), lint and format | `turbo.json`, `package.json`, `biome.json`, `.github/workflows/ci.yml` | Used |
| Vitest | Unit tests in `packages/core` and `packages/api`, integration tests (`*.int.test.ts`) against Postgres | `packages/*/`, `scripts/eval/match.test.ts` | Used |
| Playwright | Smoke, a11y (axe) and flow specs on a mobile (iPhone 14 viewport, Chromium) and a desktop (1280x800) project | `e2e/`, `playwright.config.ts` | Used locally with `bun run e2e`. Not run in CI (the CI workflow has no Playwright step) |
| Varlock | Typed env schemas that generate `src/env.ts` for the web app, native app and db package | `apps/web/.env.schema`, `apps/native`, `packages/db/.env.schema` | Used |
| Tailwind CSS 4 + shadcn (`@betterbill/ui`) | Shared design tokens and shadcn components built on `@base-ui/react`, plus BetterBill domain components (`Money`, `BalanceCard`, `FlagRow`, `TierBadge`, `EvidenceSheet`, `LineConfirmRow`, `UploadPanel`, `ApprovalSheet`, `ActivityTimeline`, `BillTable`, `ComparePriceBar`, `SavingsBar`, `CallTranscriptCard` and others). Fonts: Geist and Instrument Serif | `packages/ui/src/components` (shadcn), `packages/ui/src/components/bb` (domain), `packages/ui/src/styles/globals.css` | Used |
| Vercel | One deployment of the web app (Vercel Services config, framework `tanstack-start`). Env sync scripts for preview and production | `vercel.json`, `scripts/sync-vercel-env.ts`, `package.json` (`deploy*`, `env:*`) | Used. Custom domain `betterbill.matmanna.dev`: a DNS lookup on 2026-10-18 showed the zone `matmanna.dev` on Cloudflare nameservers and the subdomain resolving to a Vercel address. DNS is not configured in this repo |
| Sentry | See the breakdown below. Everything is a no-op when DSN variables are unset | `apps/web/src/instrument.*.ts`, `packages/api/src/observe.ts`, `telemetry.ts`, `aiSpan.ts`, [docs/SENTRY.md](docs/SENTRY.md), [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) | Wired in code. [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) still has TODO rows for what traces taught us, so this README makes no such claim |
| evlog | Nitro error handler middleware on the root route. Its console output is forwarded to Sentry Logs (warnings and errors) | `apps/web/src/routes/__root.tsx`, `apps/web/src/instrument.server.ts` | Used (error handler only) |
| Polar (sandbox) | Savings fee: a percentage of **confirmed** savings only (10% in code, rounded half up, minimum 50 cents, maximum $1,000; demo value for the team to set). Bulk plan for insurers and plans (recurring monthly). Dev promo code makes the charge 50 cents outside production mode. `payment.quote`, `payment.checkout` and `payment.bulkCheckout` run server-side. MCP server for agents in `.mcp.json` | `packages/core/src/payments.ts`, `packages/api/src/services/payments.ts`, `packages/auth/src` (plugin), `.mcp.json`, [docs/POLAR.md](docs/POLAR.md) | Sandbox only. The checkout procedures return "Payments are not configured" without `POLAR_ACCESS_TOKEN`. The Better Auth Polar plugin in `packages/auth/src/index.ts` still has a placeholder product id (`your-product-id`), and the app's checkout goes through the oRPC procedures instead. Not verified live here |
| StepFun `step-5-preview` | Reads bill photos into lines with confidence and optional bounding boxes. REST call with `fetch`, server-side only. Modes: `live`, `cache_first`, `cache_only` | `packages/api/src/reader/stepfun.ts`, `parsePhoto.ts`, `photoCache.ts`, `data/cache/photos` | Used. Requires `STEPFUN_API_KEY`. Without it, cached reads and the sample bill still work. Measured results are in `data/eval/results.json` (see Testing) |
| Gemini | Drafts the dispute letter (default model `gemini-3.8-flash`, override with `GEMINI_MODEL`) and cleans up pasted text when the deterministic parser fails on more than 30% of rows | `packages/api/src/services/gemini.ts`, `letter-drafter.ts`, `packages/api/src/reader/cleanup.ts`, `parseText.ts` | Used. Requires `GEMINI_API_KEY`. |
| Browser Use | Captures hospital price transparency files and financial assistance policies (Python scripts using `browser_use_sdk`). Output is committed as `capture.json` and `policy.json` with source URLs, times and hashes. Used offline, not at request time | `scripts/hospitals/*.py`, `data/hospitals/` | Used for the committed captures (Cedars-Sinai policy and prices, UCLA Ronald Reagan prices). Needs `BROWSER_USE_API_KEY` to re-run |
| Resend | Sends approved letters to an allowlisted test inbox. This is the only email provider wired | `packages/api/src/services/email.ts`, `send.ts` | Used. Requires `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_ALLOWLIST`. Not verified live here |
| Photon + ElevenLabs | ElevenLabs Conversational AI places the outbound call through a **Photon SIP trunk** imported into ElevenLabs, so the app talks only to ElevenLabs. `call.start` and `call.status` fetch transcripts and outcomes. Calls go only to `CALL_ALLOWLIST` numbers, after approval of the exact script. A labelled recorded rehearsal call can be shown with `DEMO_CALL_FALLBACK=1` | `packages/api/src/services/elevenlabs.ts`, `call.ts`, `call-outcome.ts`, `packages/core/src/call.ts` | Code exists and is unit tested with fake providers. The ElevenLabs request shape is marked "UNVERIFIED against a live call" in the source. Photon email is **not** wired (the source says it only documents replies). Photon SMS is not used |
| Fetch.ai uAgents / ASI:One | Thin Python agent that keeps session state and calls the TypeScript API over HTTP with a shared key (`x-bb-adapter-key`). No business logic. Chat and Interactive Cards: paste a bill or type `sample`, confirm, see flags with tiers, read the exact letter, approve on a card | `agents/fetch-adapter/` ([README](agents/fetch-adapter/README.md)), `apps/web/src/routes/api/v1` | Code and Python tests exist. Per its README, the Agentverse mailbox connection, a recorded ASI:One run, and ASI:One's card-click reply format are not yet verified |
| Expo (SDK 57, Expo Router, uniwind, HeroUI Native) | Phone app: take or choose bill photos (up to 3 pages), upload, confirm lines, follow case status. Same oRPC API and Better Auth as the web app | `apps/native/` ([README](apps/native/README.md)) | Runs in Expo Go. UI is placeholder per its README. Not a store build |
| Paper | Design tool for the team's design files | Named in [docs/ONBOARDING.md](docs/ONBOARDING.md) and [docs/DEMO.md](docs/DEMO.md) only. No Paper export is in the repo | Referenced, nothing to verify in code |

### Sentry: what is wired

Details and privacy rules are in [docs/SENTRY.md](docs/SENTRY.md) and [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md).

- **Tracing:** browser to server traces (`tracePropagationTargets` set to the app's own origin), an `orpc.<procedure>` span per API call, and hero-path spans `bb.parse`, `bb.audit`, `bb.draft`, `bb.approve`, `bb.send`.
- **Logs:** `enableLogs` on client and server, structured hero-path logs via `Sentry.logger`, and console warnings and errors forwarded.
- **Session Replay:** all text and inputs masked, media blocked, bill content blocked with `data-sentry-block`. Sample rate 10% of sessions and 100% of sessions with an error.
- **Profiling:** browser profiling (Chromium) only. Node profiling is intentionally skipped, see [docs/SENTRY.md](docs/SENTRY.md).
- **AI agent monitoring:** manual `gen_ai.*` spans for the bill reader, StepFun and Gemini calls. Prompts, images, bill text and model output are never recorded, and a test checks it (`packages/api/src/aiSpan.test.ts`).
- **Source maps:** uploaded by the Sentry Vite plugin only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are all set. Release is `VERCEL_GIT_COMMIT_SHA`.
- **Uptime:** a monitor on `/api/auth/ok`, created in the Sentry UI, not in code. This README cannot verify it exists.
- **Test events:** `/sentry-test` sends a client error, a server error, a slow span and a log (production needs `SENTRY_TEST_ENABLED=true`).

## Architecture

```
betterbill/
├── apps/
│   ├── web/              TanStack Start app: routes, UI composition, server functions, /api/rpc, /api/v1, /api/auth
│   └── native/           Expo phone app (Expo Router)
├── packages/
│   ├── core/             Pure TypeScript: schemas, rules engine, savings math, letters, call script, formatting
│   ├── api/              oRPC routers (thin), bill reader (StepFun, text), services (Gemini, email, ElevenLabs, Polar), Sentry spans
│   ├── auth/             Better Auth setup (anonymous, Expo, Polar plugins)
│   ├── db/               Drizzle schema, migrations, seed
│   ├── ui/               shadcn components, BetterBill domain components (bb/), design tokens
│   └── config/           Shared TypeScript config
├── agents/fetch-adapter/ Python uAgents service (HTTP adapter, no business logic)
├── data/                 synthetic bills, benchmark cases, hospital captures, rules tables, eval output, wording rules
├── scripts/              eval harness, fixture validation, bill rendering, hospital capture (Python), env sync, data generation
├── e2e/                  Playwright specs
├── docs/                 plans, SENTRY, OBSERVABILITY, POLAR, EVAL, DEMO, ONBOARDING
└── docker-compose.yml    Local Postgres (and a test database profile)
```

Rules: business logic lives in `packages/core`, routers stay thin, money is integer cents, and the UI never computes savings. See [AGENTS.md](AGENTS.md).

## Local development

Needs Bun 1.3.12 or newer and Docker. Python 3.11 and uv are needed only for the Fetch adapter and the hospital capture scripts.

```bash
bun install
cp .env.example apps/web/.env     # fill in only what you need; never commit this file
docker compose up -d db
bun run db:push                   # local database only, never a shared one
bun run db:seed
bun run dev                       # web app on http://localhost:3001
```

Notes:

- `.env.example` lists variable names. Set `BETTER_AUTH_SECRET` (at least 32 characters) yourself.
- `docker-compose.override.yml` is tracked and maps the local database to host port **5434**. The default `DATABASE_URL` in `.env.example` uses 5432. Change the URL or the override so they match.
- Without any model keys, the sample bill and cached photo reads still work. Set `BB_READER_MODE=cache_only` to never call a model.
- Use `BB_FAKE_PROVIDERS=1` (tests only) so email and call providers return fake ids.
- Never use `db:push` against a non-local database. Use `bun run db:generate` for migrations and commit them.
- Native app: see [apps/native/README.md](apps/native/README.md). Fetch adapter: see [agents/fetch-adapter/README.md](agents/fetch-adapter/README.md).

## Environment variables

Names only. Values go in `apps/web/.env` locally and in the Vercel project env for deploys. Schema: `apps/web/.env.schema`. "Optional" means the schema does not require it, and the feature that uses it is off or limited when it is empty.

| Name | Required | Used for |
|---|---|---|
| `DATABASE_URL` | Required | Postgres connection (web, db package, CI) |
| `BETTER_AUTH_SECRET` | Required | Better Auth signing secret (32+ characters) |
| `BETTER_AUTH_URL` | Required (defaults to the Vercel origin) | Better Auth base URL |
| `NODE_ENV` | Required (public) | Environment mode |
| `BB_READER_MODE` | Optional (default `live`) | `live`, `cache_first` or `cache_only` for photo reading |
| `STEPFUN_API_KEY` | Optional (needed for live photo reading) | StepFun `step-5-preview` |
| `STEPFUN_BASE_URL` | Optional | Override the StepFun base URL |
| `GEMINI_API_KEY` | Optional (needed for letters and text cleanup) | Gemini |
| `GEMINI_MODEL` | Optional | Letter model override |
| `EMAIL_PROVIDER` | Optional (only `resend`) | Email provider |
| `RESEND_API_KEY` | Optional (needed to send) | Resend |
| `EMAIL_FROM` | Optional (needed to send) | Sender address |
| `EMAIL_ALLOWLIST` | Optional (empty means nothing is sent) | Addresses the demo may send to |
| `EMAIL_TEST_INBOX` | Optional | Where drafted letters are addressed in the demo |
| `ELEVENLABS_API_KEY` | Optional (needed for calls) | ElevenLabs |
| `ELEVENLABS_AGENT_ID` | Optional (needed for calls) | ElevenLabs agent |
| `ELEVENLABS_PHONE_NUMBER_ID` | Optional (needed for calls) | Photon number imported into ElevenLabs |
| `CALL_ALLOWLIST` | Optional (empty means no calls) | Numbers that agreed to take a test call |
| `DEMO_CALL_FALLBACK` | Optional | Show the labelled recorded rehearsal call |
| `BB_FAKE_PROVIDERS` | Optional (tests only) | Fake email and call providers |
| `BB_REQUIRE_ACCOUNT` | Optional (default `false`) | Require a real account to approve, send and call |
| `BB_ADAPTER_KEY` | Optional (needed for the Fetch adapter) | Shared secret in the `x-bb-adapter-key` header |
| `POLAR_ACCESS_TOKEN` | Optional (needed for payments) | Polar organization token, server only |
| `POLAR_SUCCESS_URL` | Optional (needed for payments) | Redirect after checkout |
| `POLAR_SERVER` | Optional (default `sandbox`) | `sandbox` or `production` |
| `POLAR_SAVINGS_PRODUCT_ID`, `POLAR_BULK_PRODUCT_ID` | Optional (needed for payments) | Polar product ids (not secrets) |
| `POLAR_DEV_PROMO_CODE` | Optional | Development-only 50 cent override |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | Optional | Sentry DSNs (server and browser) |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Optional (build time) | Source map upload |
| `SENTRY_ENVIRONMENT` | Optional | Overrides `VERCEL_ENV` as the Sentry environment |
| `SENTRY_TEST_ENABLED` | Optional (read by code, not in the schema) | Enable `/sentry-test` in production |
| `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Provided by Vercel | Origin and environment detection |
| `EXPO_PUBLIC_SERVER_URL` | Native app only (`apps/native/.env`) | Where the phone app finds the API |
| `AGENT_SEED`, `BETTERBILL_API_BASE`, `BB_ADAPTER_KEY` | Fetch adapter only (`agents/fetch-adapter/.env`) | Agent identity, API base URL, shared key |
| `BROWSER_USE_API_KEY` | Scripts only | `scripts/hospitals/*.py` captures |
| `EVAL_API_URL`, `EVAL_GIT_SHA`, `EVAL_NOTE` | Scripts only | `bun run eval` with `--live` and run labels |
| `DATABASE_URL_SHARED` | GitHub secret | CI migration of the shared database |

Never put a key in client code. Every model, email, call and payment request runs server-side in the oRPC handlers.

## Deployment

- **Web:** one Vercel project using `vercel.json` (service `web`, root `apps/web`, framework `tanstack-start`). First time: `bun run deploy:setup`, then `bun run env:preview` or `bun run env:production` to sync env vars, then `bun run deploy` or `bun run deploy:prod`. `bun run deploy:check` is a dry run. Local Vercel dev: `bun run dev:vercel`.
- **Database:** Tiger Data Postgres is the shared database. On pushes to `main`, the `migrate-shared` CI job runs `bun run db:migrate` with the `DATABASE_URL_SHARED` secret, and skips when the secret is not set. Never run `db:push` against it.
- **CI** (`.github/workflows/ci.yml`, on pull requests and `main`): `bun install --frozen-lockfile`, `biome ci`, `data:check`, `check-types`, unit tests, migrate and seed a service-container Postgres, integration tests, then `build`. CI forces `BB_READER_MODE=cache_only`, so no model is called.
- **Fetch adapter:** a Dockerfile is in `agents/fetch-adapter/`. It uses mailbox mode and needs no public port.

## Testing and evaluation

| Command | What it does |
|---|---|
| `bun run test` | Vitest unit tests (core with coverage thresholds, api) |
| `bun run test:integration` | Integration tests against a seeded Postgres |
| `bun run check-types` | TypeScript across the workspace |
| `bun x biome ci .` or `bun run check` | Lint and format (`check` writes fixes) |
| `bun run e2e` | Playwright mobile and desktop specs (builds and serves the app, or set `E2E_BASE_URL`) |
| `bun run fixtures:validate`, `bun run data:check` | Validate synthetic fixtures against the contract, and check bundled data matches `data/` |
| `bun run copy:check` | Check wording rules (`data/copy/wording.json`) |
| `bun run eval`, `eval:photos`, `eval:all` | Evaluation harness, writes `data/eval/results.json` ([docs/EVAL.md](docs/EVAL.md)) |
| `cd agents/fetch-adapter && uv run ruff check . && uv run pytest` | Fetch adapter checks |

Numbers from `data/eval/results.json` (run `2026-10-17T23:32:42Z`, git `eca94ef+botm-fixtures`):

- Seeded-error recall on 10 synthetic fixtures: 12 of 12 planted flags caught, 0 false flags on the 3 clean fixtures. The team planted these errors, so this shows the rules work as designed. It is **not** real-world accuracy.
- Bill of the Month recreations (5 cases): 1 of 3 in-scope reporter findings caught, and 1 of 13 overall.
- Photo line extraction: not measured in that file (0 photos).

Rule: a target is never presented as a result. Re-run the harness for current numbers. See [docs/EVAL.md](docs/EVAL.md) for definitions and caveats.

## Safety and privacy

- **Synthetic or public data only.** No real patient documents. SB-01 names Cedars-Sinai only so its public price file can be compared. The bill itself is invented.
- **Approval first.** Every outbound email and call needs an explicit approval of the exact text, recorded as an append-only case event. Approval via the Fetch agent counts only from the card selection or the exact message `approve`.
- **Allowlists.** Emails go only to `EMAIL_ALLOWLIST` and calls only to `CALL_ALLOWLIST`. Empty means nothing is sent. Calls are rate limited.
- **Keys stay on the server.** No model, email, call or payment key is in client code.
- **Telemetry avoids bill content.** Sentry replay masks text and blocks bill elements, and spans and logs never include bill text, prompts, images or letters.
- **Evidence, not accusations.** Every amount shows its tier, and every estimate says "estimate". Result screens say BetterBill is informational, not legal or medical advice.

## Fetch.ai agent

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)
![tag:hackathon](https://img.shields.io/badge/hackathon-5F43F1)

| | |
|---|---|
| Agent name | `betterbill` |
| Address | `agent1qwqz9059qrve4w2vykv4lrsws3hsw0r4ru4mmeh8wd3v0796al8zjh4uf7n` |
| Agentverse profile | add after registering the agent |
| ASI:One shared chat | add after the recorded run |

The agent is a thin adapter. It calls BetterBill's TypeScript API over HTTP. All rules, savings and letters live in `packages/core`. In ASI:One you paste a bill (or type `sample`), check the lines on a review card, see what looks wrong with its evidence, read the exact letter, and approve it on a card before anything is sent.

```
cd agents/fetch-adapter
uv sync
cp .env.example .env   # set AGENT_SEED, BETTERBILL_API_BASE, BB_ADAPTER_KEY
uv run python -m betterbill_agent.agent
```

Open the inspector URL it logs, connect the mailbox, then use "Chat with Agent" on the Agentverse profile. Keep `AGENT_SEED` unchanged: it sets the address above. More in [agents/fetch-adapter/README.md](agents/fetch-adapter/README.md).

## Prizes and tracks

The repo does not record which tracks the team has entered. [docs/DEMO.md](docs/DEMO.md) keeps a candidate list and says track names and extra requirements must be confirmed on the LA Hacks Devpost page. Nothing is claimed here.

## Other scripts

- `bun run db:generate`, `db:migrate`, `db:studio`: Drizzle migrations and studio.
- `bun run auth:generate`: regenerate the Better Auth schema after changing plugins, then review and migrate.
- `bun run env:generate`: regenerate typed env files after changing an `.env.schema`.
- `bun run render:bills`, `photos:read`, `data:gen`, `measure:letters`: fixture rendering, photo reading, bundled data generation, letter timing.
- Add shared shadcn components: `npx shadcn@latest add <component> -c packages/ui`, and import them as `@betterbill/ui/components/<name>`.

Built from [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).
