# Role B: Bill Intelligence and Platform (execution plan)

Owner: Role B. Window: Sat Oct 17 15:00 PDT to Sun Oct 18 09:00 PDT (freeze). Binding context: `docs/plans/00-shared-context.md` (wins on any conflict), `docs/plans/00-team-brief.md`, `docs/plans/bill-audit-design-doc.md` (section 12), `docs/plans/bill-audit-prd.md`.

Conventions in this file: money is integer cents; times are PDT clock times; "UNVERIFIED" means not confirmed against official docs in this session (full list in section 13). Repo root after scaffolding: `<repo root>` (written below as `betterbill/`).

---

## 1. Role summary

**Mission.** Make the bill readable, the audit correct, and the platform boring. Every other role builds on B's contracts, routes, database, CI, and deploys. If B is late, everyone is late; if B's numbers are wrong, the demo is dishonest.

**B owns**
- Scaffold (Better-T-Stack command in shared context section 4), repo, AGENTS.md, PR template, branch protection, CODEOWNERS (optional).
- Docker Compose (timescale/timescaledb pg16), Drizzle schema, migrations, seed.
- CI/CD (GitHub Actions + Vercel Git integration), env management, Tiger Data shared DB.
- Better Auth (value before signup), Polar config kept as scaffolded (D builds pricing UI).
- evlog and Sentry (Tracing, Logs, AI agent monitoring, Replay only on our UI if it works).
- `packages/core`: zod schemas, rules engine, savings math, Money helpers. Pure, fully unit tested.
- `packages/api`: oRPC routers with the 16 binding procedure names.
- Bill reader: `bill.parseText` (deterministic plus model cleanup fallback) and `bill.parsePhoto` (StepFun `step-5-preview`).
- Cached runs for demo reliability; performance numbers (photo to lines p50, audit time).

**Tracks owned and what judges need to see**

| Track | What judges need to see | Proof we prepare |
|---|---|---|
| StepFun | Task completion, reliability, user understanding and control; `step-5-preview` is called at runtime | Live photo read in the demo; each line shows confidence (and crop if B1); user edits a misread line before audit; Sentry span with `gen_ai.request.model = step-5-preview`; measured extraction accuracy on N synthetic photos |
| Sentry | Tracing, Logs, AI agent monitoring; one real bug found via a trace | One trace per request with child spans per step; evlog wide events drained to Sentry Logs; AI span for the StepFun call; a short written story of a real bug found via a trace (never invented) |
| MLH Tiger Data | Postgres on Tiger Data actually used | Shared DB is a Tiger Cloud service; migrations applied by CI on `main`; case events stored there |
| Vercel hosting | App deployed on Vercel | Production URL plus per-PR preview URLs; Playwright smoke runs against the preview |

---

## 2. Onboarding

### 2.1 Role B onboarding (15 minutes, do first at 15:00)
1. Confirm tools: `bun --version` (1.3.12 is installed; CLI recommends 1.4+, optional), `docker compose version`, `gh auth status`, `node --version` (22).
2. Create or confirm accounts: GitHub repo owner, Vercel team, Sentry org and project (platform: TanStack Start), Tiger Data (MLH) service, StepFun API key at https://platform.stepfun.ai, Polar sandbox (D uses it).
3. Ask the team in chat (15:05): "New repo goes in `betterbill/`. I will leave the old `redline/` folder untouched. Anyone object to archiving it later? I will not delete it without a yes from all of you." Record the answer in the B-01 PR description.
4. Skim `redline/` (read-only) to recall what the scaffold generates: `apps/web` (TanStack Start, Nitro vite plugin, varlock), `packages/api` (oRPC `publicProcedure`, `appRouter`), `packages/db` (Drizzle 1.0 rc, `createDb`, `relations.ts`, drizzle-kit scripts), `packages/ui` (shadcn `base-lyra`), `vercel.json` with `services`, `scripts/sync-vercel-env.ts`, `.vercelignore`.
5. Open this plan's ticket list (section 6) and start B-01.

### 2.2 Team onboarding B must enable (done by 16:00)
| Item | B does | Each teammate does |
|---|---|---|
| Repo access | `gh repo create`, invite A, C, D as collaborators (write) | Accept invite, `git clone` |
| Vercel | Import repo, invite teammates to the team | Open preview URL on phone |
| Sentry | Invite teammates to the org | Open the project, find their own trace |
| Tiger Data | Create service; keep shared URL in GitHub secret and Vercel env only | Nothing; never connect `db:push` to it |
| Env | Commit `.env.example` and `.env.schema` entries; share real keys by private DM or a password manager, never in the repo or the team channel | `cp .env.example apps/web/.env`, fill keys they need |
| Docker | Commit `docker-compose.yml` | `docker compose up -d db` |
| First run | Write `docs/ONBOARDING.md` (short) | `bun install && bun db:migrate && bun db:seed && bun dev` |
| Playwright | Add config | `bunx playwright install chromium webkit` |

Keys by role: StepFun (B), Gemini (A, and B for text cleanup if StepFun text is not used), Photon and ElevenLabs (A), Browser Use (C), Polar sandbox (D).

---

## 3. Interfaces

### 3.1 Contracts (packages/core/src/schemas.ts)
Exactly as shared context section 6 (Line, Bill, Eob, Lever, Tier, Flag, Savings, CaseStatus, CaseEvent, Action). Added in B-03, tagged `contract`. Additional schemas B adds (also contract):

```ts
// packages/core/src/schemas.ts (additions)
export const Reconciliation = z.object({
  linesSumCents: z.number().int(), statedChargesCents: z.number().int().nullable(),
  diffCents: z.number().int(), ok: z.boolean(),
});
export const ParseResult = z.object({
  caseId: z.string(), bill: Bill, reconciliation: Reconciliation,
  lowConfidenceLineIds: z.array(z.string()),
  reader: z.object({
    mode: z.enum(["deterministic", "model_cleanup", "step-5-preview", "cache"]),
    model: z.string().nullable(), latencyMs: z.number().int(),
    cachedAt: z.string().nullable(),   // set only when served from cache; UI must label it
  }),
  warnings: z.array(z.string()),
});
export const AuditResult = z.object({ caseId: z.string(), flags: z.array(Flag), savings: Savings, durationMs: z.number().int() });
export const CaseSummary = z.object({ id: z.string(), status: CaseStatus, hospitalName: z.string().nullable(), createdAt: z.string(), savings: Savings.nullable() });
```

### 3.2 Procedures (names binding; inputs and outputs are zod)

| Procedure | Input | Output | Implements | Consumers | Real by |
|---|---|---|---|---|---|
| `case.create` | `{ sample?: string }` (sample id like `bill-01`) | `CaseSummary` | B | D, A | 17:00 |
| `case.get` | `{ caseId }` | `{ case: CaseSummary, bill: Bill \| null, eob: Eob \| null, audit: AuditResult \| null, actions: Action[] }` | B | D, A | 18:30 |
| `case.list` | `{}` (session user) | `CaseSummary[]` | B | D | 21:00 |
| `bill.parseText` | `{ caseId, text: string (max 50k chars), eobText?: string }` | `ParseResult` | B | D, A (Fetch adapter) | 18:30 |
| `bill.parsePhoto` | `{ caseId, pages: { imageDataUrl: string, page: number }[] (1 to 3) }` | `ParseResult` | B | D | 22:30 |
| `bill.confirmLines` | `{ caseId, lines: Line[], eob?: Eob \| null }` | `{ caseId, status: "lines_confirmed" }` | B | D | 18:30 |
| `audit.run` | `{ caseId }` | `AuditResult` | B | D, A | 19:00 |
| `audit.get` | `{ caseId }` | `AuditResult \| null` | B | D, A | 19:00 |
| `assistance.check` | `{ caseId, householdSize: number, annualIncomeCents: number }` | `Savings["assistance"]` | router B, logic C | D | 01:00 |
| `action.draftLetter` | `{ caseId, kind: "letter" \| "itemized_request" }` | `Action` | stub B, logic A | D | stub 16:45, A 22:00 |
| `action.approve` | `{ actionId }` | `Action` (auth required) | stub B, logic A | D | A |
| `action.send` | `{ actionId }` | `Action` (auth required) | stub B, logic A | D | A |
| `call.start` | `{ actionId }` | `{ callId: string, status: string }` (auth required) | stub B, logic A | D | A |
| `call.status` | `{ callId }` | `{ status: string, transcript: string \| null, outcome: string \| null }` | stub B, logic A | D | A |
| `event.list` | `{ caseId }` | `CaseEvent[]` (ordered by `at`) | B | D | 19:00 |
| `eval.results` | `{}` | contents of `data/eval/results.json` (passthrough zod with `generatedAt`) | B | D, C | 21:00 |

Rules for routers: validate with zod, call `@betterbill/core`, persist, append a `case_event`, return. No business logic in routers. UI never computes savings.

### 3.3 Handoffs (what A, C, D get and when)
| Time | B hands off | To |
|---|---|---|
| 15:40 | Repo, AGENTS.md, PR template, docker-compose, `.env.example` | All |
| 16:00 | Contracts merged (`packages/core/src/schemas.ts`), Vercel preview URL | All |
| 16:45 | All 16 procedures exist as stubs returning fixtures; OpenAPI endpoint `POST /api/v1/<router>/<procedure>` reachable on preview | D (UI wiring), A (Fetch gate at 17:00) |
| 17:00 | DB schema + seed from `data/synthetic` (needs C's first 3 bills by 16:30) | All |
| 18:30 | `bill.parseText`, `bill.confirmLines`, `case.get` real | D, A |
| 19:00 | `audit.run` real with duplicate + units; `Money` helpers in core | D (G1 at 20:00), A (letters cite flags) |
| 20:30 | Auth gating on save/send/call | A, D |
| 22:30 | `bill.parsePhoto` real | D |
| 23:15 | `eob_mismatch` rule | D, C |
| 01:00 | `published_price` rule using C's captured file | D, C |
| 01:00 | `scripts/eval-extraction.ts` output for C's `results.json` | C |

Agreements B needs from C by 16:30: synthetic fixture format (section 6, B-06) and the text rendering format (B-09). From D by 18:00: `UploadPanel` compresses images client-side (long edge 1600 px, JPEG quality about 0.8) before calling `bill.parsePhoto`.

---

## 4. Numbers that matter for B

Rule from shared context: a target is never presented as a result. Every number states "measured on N items, date".

| Number | Target | How B measures | Where it lands |
|---|---|---|---|
| Photo to lines time (p50, p90) | p50 under 30 s | `reader.latencyMs` recorded per call (evlog field and Sentry span); `scripts/perf-report.ts` runs `bill.parsePhoto` on every PNG in `data/synthetic/` live, 1 run each, prints p50/p90 and N | `data/eval/perf.json`, C merges into `results.json` |
| Audit time after confirm | under 2 s | `durationMs` returned by `audit.run` (server-measured with `performance.now()`); same script loops 10 seeded cases | `data/eval/perf.json` |
| Line extraction accuracy | measured, no target | With C: `scripts/eval-extraction.ts` compares reader output to fixture lines. A line matches when `serviceDate`, `code`, `units`, and `chargeCents` are all exact. Report line recall (matched / expected), line precision (matched / extracted), and per-field accuracy over matched-by-position lines. Report N photos and N lines | `data/eval/extraction.json` |
| Totals reconciliation rate | measured | Share of photo reads where `reconciliation.ok` is true | same file |
| Core test coverage | lines 95%, branches 90% enforced on `packages/core/src` | `bun run --filter @betterbill/core test -- --coverage` with `@vitest/coverage-v8` thresholds; CI fails below | CI log, PR description |
| Seeded-error recall, false flags | C owns | B makes `runAudit` callable from C's eval script with no DB | C's `results.json` |

Small-sample honesty: with 10 photos, p50 and accuracy are rough. Say "measured on 10 synthetic photos, Oct 18".

---

## 5. Timeline (PDT) with gates

| Time | B work (tickets) | Parallel coding agents |
|---|---|---|
| 15:00 to 15:40 | B-01 scaffold, repo, AGENTS.md, PR template, docker-compose, env example; push `main` | none (B drives) |
| 15:40 to 16:00 | B-02 CI and branch protection; B-04 Vercel + Tiger Data (manual) | Agent 1: B-03 core schemas |
| **16:00 G0** | Phone loads preview; contracts merged | |
| 16:00 to 17:00 | B-05 router stubs + OpenAPI; B-06 Drizzle schema, migration, seed | Agent 1: B-08 rules (duplicate, units), Money, savings |
| **17:00 Fetch gate** | Confirm A's adapter reached `/api/v1` on preview (B only supports; A decides) | |
| 17:00 to 18:30 | B-07 evlog + Sentry; B-09 parseText | Agent 1: finishes B-08 |
| 18:30 to 20:00 | B-10 real case/bill/audit routes + integration tests; help D wire G1 | Agent 2: B-12 Playwright smoke scaffold |
| **20:00 G1** | Paste a bill, see flags with evidence on a phone | |
| 20:00 to 00:00 | B-11 auth gating; B-13 parsePhoto; B-14 eob_mismatch; B-15 cached runs; B-16 migrate-on-main | Agent 1: B-14; Agent 2: B-15 |
| **00:00 G2** | Photo in, flags, letter approved and sent | |
| 00:00 to 01:00 | B-17 perf + extraction eval; B-18 published_price | Agent 1: B-18 |
| 01:00 to 03:00 | B-19 AI monitoring + bug-via-trace; pick one: B1 or B2 | Agent 1: B1/B2 |
| 03:00 to 07:00 | Sleep shift (coordinate with team; one person keeps main green) | |
| 07:00 to 09:00 | Reliability pass: cold-start preview, cache labels, airplane-mode text fallback, rerun perf and eval, Sentry dashboard for demo | |
| **09:00 Freeze** | Fixes only | |

### Gate checklists

**G0 (16:00)**
- [ ] `betterbill/` scaffolded with the verified command; `bun install` and `bun run build` pass locally.
- [ ] Repo on GitHub, A, C, D invited; AGENTS.md, PR template, docker-compose, `.env.example` on `main`.
- [ ] `packages/core/src/schemas.ts` merged with PR label `contract`; heads-up posted in chat.
- [ ] Vercel project linked; preview URL loads on a phone (B and D both check).
- [ ] CI runs on PRs (Biome, types, unit, build); branch protection on.
- [ ] Tiger Data service exists; `DATABASE_URL_SHARED` in GitHub secrets; Vercel env has `DATABASE_URL` (shared) for preview and production.

**Fetch gate (17:00)** (B supports A)
- [ ] `POST https://<preview>/api/v1/bill/parseText` with JSON body returns a stub `ParseResult` (curl in B-05 verification).
- [ ] Adapter key header check works (`x-bb-adapter-key`).

**G1 (20:00)**
- [ ] `bill.parseText` parses all of C's synthetic text bills with zero `unparsedLines`.
- [ ] `audit.run` returns duplicate and units flags with evidence on seeded bills; unit tests green.
- [ ] Integration test `parseText -> confirmLines -> audit.run` passes in CI with the Postgres service.
- [ ] Sentry shows one trace per `audit.run` with rule spans; evlog wide event visible.
- [ ] D's case page shows flags on a phone from the preview.

**G2 (00:00)**
- [ ] `bill.parsePhoto` calls `step-5-preview` live, returns lines with confidence and bbox (or null), reconciliation shown.
- [ ] User can edit a line before audit (D's `LineConfirmRow`); audit uses edited lines (`userEdited: true`).
- [ ] `eob_mismatch` rule live. Three levers with evidence on the hero path.
- [ ] Cached run fallback works and is labelled.
- [ ] Auth: audit without account; approve/send/call require account. A's send works.
- [ ] Migrations run on `main` against Tiger Data via CI.
- [ ] Playwright smoke passes against the preview.

**Freeze (09:00)**
- [ ] Perf and extraction numbers measured and handed to C with date and N.
- [ ] Bug-via-trace story written in `docs/OBSERVABILITY.md` with the trace link.
- [ ] No secrets in git history (`git log -p | grep -iE "sk-|api[_-]?key"` reviewed).
- [ ] `main` green; production deploy matches `main`.

---

## 6. PR-by-PR tickets

Every PR: branch `b/<feature>`, conventional title, under 400 changed lines where possible, PR template filled, rebase on `main` before opening, squash merge, delete branch. Contract changes get label `contract` and a chat heads-up. Prompts below assume the agent runs in `<repo root>` unless stated.

Shared "do not" list for every prompt (agents must follow it; each prompt repeats the most relevant items):
- Do not touch `the old redline folder (deleted)`.
- Do not run `db:push` or `db:migrate` against any non-localhost database.
- Do not commit `.env` files or keys. Do not put API keys in client code.
- Do not invent API names, model ids, or package names. If unsure, stop and report.
- Do not use "illegal", "fraud", or "overcharge" in any string.
- Do not change `packages/core/src/schemas.ts` unless the ticket says so.

---

### B-01 Scaffold, repo, and team basics
- **Branch:** none (initial commit to `main` before protection exists). **Time:** 40 min. **Deps:** none.
- **Goal:** working monorepo on GitHub with the operating files every teammate needs.
- **Files:** whole scaffold; `AGENTS.md`; `.github/pull_request_template.md`; `.github/CODEOWNERS` (optional); `docker-compose.yml`; `.env.example`; `docs/ONBOARDING.md`; `docs/plans/` (copy of the planning folder so AGENTS.md paths resolve).
- **Acceptance:** `bun install`, `bun run build`, `bun run check-types` pass; `docker compose up -d db` healthy; repo pushed; teammates invited.
- **Tests:** none yet (CI in B-02).

**PR template (`.github/pull_request_template.md`, full draft)**
```md
## What
<!-- One feature. One or two sentences. -->

## Why
<!-- Which gate or ticket (for example G1, B-08). -->

## Screens
<!-- Required for UI changes: mobile 390 px and desktop 1280 px. Write "n/a" for backend-only. -->
| Mobile 390 | Desktop 1280 |
|---|---|
|  |  |

## Tests added
<!-- List test files and what they cover. -->

## Contract changes
- [ ] No
- [ ] Yes: label `contract` added and heads-up posted in chat (schemas.ts or oRPC names)

## Checklist
- [ ] `bun x biome ci .` clean
- [ ] `bun run check-types` clean
- [ ] `bun run test` green
- [ ] No secrets, no keys in client code
- [ ] Copy rules: no "illegal", "fraud", "overcharge"; every amount shows its tier
- [ ] a11y: labels, 44 px targets, focus ring, not color alone
- [ ] Synthetic or public data only
```

**docker-compose.yml (full draft)**
```yaml
services:
  db:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: bb
      POSTGRES_PASSWORD: bb
      POSTGRES_DB: betterbill
    ports: ["5432:5432"]
    volumes: ["bb-db:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bb -d betterbill"]
      interval: 5s
      retries: 10
  db-test:
    image: timescale/timescaledb:latest-pg16
    profiles: ["test"]
    environment:
      POSTGRES_USER: bb
      POSTGRES_PASSWORD: bb
      POSTGRES_DB: betterbill_test
    ports: ["5433:5432"]
    tmpfs: ["/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bb -d betterbill_test"]
      interval: 5s
      retries: 10
volumes:
  bb-db: {}
```

**.env.example (names only; final list confirmed against the scaffold's `.env.schema`)**
```
NODE_ENV=development
DATABASE_URL=postgres://bb:bb@localhost:5432/betterbill
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3001
POLAR_ACCESS_TOKEN=
STEPFUN_API_KEY=
GEMINI_API_KEY=
SENTRY_DSN=
VITE_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
BB_READER_MODE=live            # live | cache_first | cache_only
BB_ADAPTER_KEY=                # shared secret for the Fetch adapter
```

```text
CODING-AGENT PROMPT (B-01). Run from the repo root (a clone of the betterbill repo that already contains docs/plans/).
Context: read docs/plans/00-shared-context.md sections 4, 5, 9, 10, 13 first.
Steps:
1. Run the scaffold block from shared context section 4 exactly as written (it scaffolds into a temporary folder named betterbill, copies into the repo root, then runs bun install). Stop if the copy would overwrite anything in docs/plans/.
2. Stay in the repo root. Print the tree to depth 3 (exclude node_modules). Report: the package scope (expect @betterbill/*), whether a packages/auth exists, where Better Auth tables live, where evlog was wired, the root scripts in package.json, and the contents of turbo.json. Do not change anything yet.
3. Create AGENTS.md at repo root with the exact text from shared context section 13.
4. Create .github/pull_request_template.md, docker-compose.yml, .env.example with the exact drafts in docs/plans/B-bill-intelligence-platform.md ticket B-01. Add any env names the scaffold's apps/web/.env.schema declares that are missing from .env.example (names only, no values).
5. docs/plans/ is already in the repo; do not move it. Create CLAUDE.md with exactly two lines: @AGENTS.md and @docs/plans/00-shared-context.md. Create docs/ONBOARDING.md with the 6 steps from shared context section 14.1 (short).
6. Make sure .gitignore ignores .env and .env.* except .env.example and .env.schema.
7. Run: bun install; bun run build; bun run check-types; bun x biome ci . ; docker compose up -d db; docker compose ps.
8. git add -A; git commit -m "chore: scaffold betterbill with better-t-stack"; do not push (B pushes).
Do not: edit generated source beyond the files listed; run db:push against anything but localhost; commit apps/web/.env.
Verification: all commands in step 7 exit 0; `git status` clean; `git log --oneline` shows the docs/plans commit plus one or two new commits.
Definition of done: report the step-2 findings and the command outputs. B then runs (the GitHub repo already exists, since it was cloned):
  git push origin main
  gh api -X PUT repos/<owner>/betterbill/collaborators/<user> -f permission=push   (for A, C, D, if not already invited)
```

---

### B-02 CI workflow and branch protection
- **Branch:** `b/ci`. **Time:** 20 min (plus fix-ups). **Deps:** B-01.
- **Goal:** every PR runs Biome, types, unit, integration, build; `main` protected.
- **Files:** `.github/workflows/ci.yml`, root `package.json` (add `test`, `test:integration`, `db:seed` scripts), `turbo.json` (add `test` task).
- **Acceptance:** CI green on this PR; required check `checks` enforced on `main`.

**.github/workflows/ci.yml (full draft)**
```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
  deployment_status:
concurrency:
  group: ci-${{ github.ref }}-${{ github.event_name }}
  cancel-in-progress: true
env:
  NODE_ENV: test
  DATABASE_URL: postgres://bb:bb@localhost:5432/betterbill_test
  BETTER_AUTH_SECRET: ci-only-not-a-secret-0123456789abcdef
  BETTER_AUTH_URL: http://localhost:3001
  BB_READER_MODE: cache_only
jobs:
  checks:
    if: github.event_name != 'deployment_status'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_USER: bb
          POSTGRES_PASSWORD: bb
          POSTGRES_DB: betterbill_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U bb -d betterbill_test"
          --health-interval 5s --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.12 }
      - run: bun install --frozen-lockfile
      - run: bun x biome ci .
      - run: bun run check-types
      - run: bun run test            # Vitest unit (packages/core with coverage thresholds)
      - run: bun run db:migrate      # against the service container only
      - run: bun run db:seed
      - run: bun run test:integration
      - run: bun run build
  migrate-shared:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: checks
    runs-on: ubuntu-latest
    environment: shared-db
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.12 }
      - run: bun install --frozen-lockfile
      - run: bun run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_SHARED }}
  e2e-preview:
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.3.12 }
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium webkit
      - run: bunx playwright test -c e2e/playwright.config.ts
        env:
          BASE_URL: ${{ github.event.deployment_status.environment_url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: playwright-report, path: e2e/playwright-report }
  python-adapter:
    if: github.event_name != 'deployment_status' && hashFiles('agents/fetch-adapter/pyproject.toml') != ''
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: agents/fetch-adapter } }
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync && uv run ruff check . && uv run pytest -q
```
Notes: Vercel production deploy happens through the Vercel Git integration on push to `main`, in parallel with `migrate-shared`. Therefore every migration must be additive (new tables, nullable columns). Never rename or drop during the hackathon. `hashFiles` in a job-level `if` may not be allowed (UNVERIFIED); if CI rejects it, A moves the Python job into its own workflow with `paths: agents/fetch-adapter/**`.

**Branch protection (B runs after this PR is green once)**
```bash
cat > ../protect.json <<'JSON'   # outside the repo; delete after use
{ "required_status_checks": { "strict": false, "contexts": ["checks"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null }
JSON
gh api -X PUT repos/<owner>/betterbill/branches/main/protection --input ../protect.json
```

```text
CODING-AGENT PROMPT (B-02). Repo: <repo root>. Branch: git checkout -b b/ci
1. Create .github/workflows/ci.yml with the exact YAML in docs/plans/B-bill-intelligence-platform.md ticket B-02.
2. In turbo.json add tasks "test" and "test:integration" (cache false for integration; outputs ["coverage/**"] for test). Keep existing tasks.
3. Root package.json scripts: "test": "turbo run test", "test:integration": "turbo run test:integration", "db:seed": "bun run --filter @betterbill/db db:seed". Use the scaffold's existing pattern for filters if it differs (check how db:push is defined and copy it).
4. If no package has a test script yet, add packages/core later (B-03). For now make "turbo run test" succeed with zero tasks.
5. Add a stub packages/db script "db:seed": "bun src/seed.ts" and a src/seed.ts that logs "no seed yet" and exits 0 (B-06 replaces it).
6. Run locally: bun x biome ci . ; bun run check-types ; bun run test ; docker compose up -d db ; DATABASE_URL=postgres://bb:bb@localhost:5432/betterbill bun run db:migrate ; bun run build.
7. Commit "ci: add github actions workflow", push, open a PR with gh pr create --fill, then watch: gh pr checks --watch.
Do not: add secrets to the YAML; run migrations against non-local URLs; delete scaffold scripts.
Definition of done: PR open, check "checks" green. Report the PR URL.
```

---

### B-03 Core package and contracts (label `contract`)
- **Branch:** `b/core-schemas`. **Time:** 25 min. **Deps:** B-01.
- **Goal:** new `packages/core` with zod schemas from shared context section 6 plus section 3.1 additions, Vitest, coverage thresholds.
- **Files:** `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/vitest.config.ts`, `packages/core/src/index.ts`, `packages/core/src/schemas.ts`, `packages/core/src/schemas.test.ts`.
- **Acceptance:** `import { Bill, Line, Flag } from "@betterbill/core"` works in `packages/api`; round-trip tests pass; types exported as `type Bill = z.infer<typeof Bill>`.

```text
CODING-AGENT PROMPT (B-03). Repo: <repo root>. git checkout -b b/core-schemas
1. Create packages/core with package.json: name "@betterbill/core", type module, exports { ".": "./src/index.ts", "./*": "./src/*.ts" }, scripts { "test": "vitest run --coverage", "check-types": "tsc --noEmit" }, dependencies { "zod": "catalog:" }, devDependencies { "vitest", "@vitest/coverage-v8", "typescript": "catalog:", "@betterbill/config": "workspace:*" }. Copy tsconfig.json from packages/api and adjust.
2. vitest.config.ts: test.include ["src/**/*.test.ts"]; coverage provider "v8", include ["src/**/*.ts"], exclude ["src/**/*.test.ts","src/index.ts"], thresholds { lines: 95, branches: 90, functions: 95, statements: 95 }.
3. src/schemas.ts: zod schemas named exactly Line, Bill, Eob, Lever, Tier, Flag, Savings, CaseStatus, CaseEvent, Action from docs/plans/00-shared-context.md section 6, plus Reconciliation, ParseResult, AuditResult, CaseSummary from docs/plans/B-bill-intelligence-platform.md section 3.1. Money fields z.number().int(). Dates: serviceDate z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(). bbox: z.tuple([z.number().min(0).max(1) x4]).nullable(). confidence z.number().min(0).max(1). Flag.title max 60. Export `export type X = z.infer<typeof X>` for each.
4. src/index.ts re-exports everything from ./schemas.
5. src/schemas.test.ts: (a) a valid synthetic Bill with two lines (CBC w/ differential, code "85025", CPT, units 1, chargeCents 8400, serviceDate "2026-09-12", page 1, bbox null, confidence 0.95, userEdited false) parses; (b) chargeCents 84.5 fails; (c) bbox [0,0,1.2,1] fails; (d) Flag with title of 61 chars fails; (e) every Lever and Tier literal parses.
6. Add "@betterbill/core": "workspace:*" to packages/api dependencies. bun install.
7. Run: bun run --filter @betterbill/core test ; bun run check-types ; bun x biome ci .
8. Commit "feat(core): data contracts", push, gh pr create --fill --label contract. Post in chat: "Contracts PR open: <url>".
Do not: add fields not in the contracts; use floats for money; add IO (fs, fetch, db) to packages/core.
Definition of done: tests green with coverage thresholds met; PR open with label contract.
```

---

### B-04 Vercel, Tiger Data, env sync (mostly manual, small PR)
- **Branch:** `b/deploy-env`. **Time:** 20 min. **Deps:** B-01.
- **Goal:** preview per PR, production on `main`, env vars synced, shared DB ready.
- **Steps (B, by hand):**
  1. `bun deploy:setup` (runs `bunx vercel link`), or import the repo in the Vercel dashboard. Confirm the root `vercel.json` `services` config is what the scaffold generated (service `web`, root `apps/web`, framework `tanstack-start`).
  2. Tiger Data: create a service in Tiger Console. Copy the connection string (format per Tiger docs: `postgresql://tsdbadmin:<password>@<service-id>.<project-id>.tsdb.cloud.timescale.com:<port>/tsdb?sslmode=require`; port varies per service). Prefer the direct connection for migrations; consider the pooler URL for the app if connection limits bite (UNVERIFIED for our plan tier).
  3. GitHub: `gh secret set DATABASE_URL_SHARED`, `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET` (create the bypass secret under Vercel Deployment Protection, Protection Bypass for Automation). Create GitHub environment `shared-db`.
  4. Vercel env: fill a local `apps/web/.env.vercel-preview` file (gitignored) with shared values, then `bun env:preview apps/web/.env.vercel-preview` and `bun env:production apps/web/.env.vercel-preview`. The script skips `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NODE_ENV` and warns on localhost values. Set `BETTER_AUTH_URL` per environment by hand in the dashboard. Check the script's behaviour against the new scaffold before running (it reads only keys declared in `.env.schema`).
  5. Run `DATABASE_URL=<shared> bun run db:migrate` once by hand after B-06 merges (CI takes over after B-16).
  6. Open the preview on a phone. Post URL in chat. G0.
- **PR content:** only `.env.schema` additions (names, `@sensitive`, types) for keys in `.env.example`. Varlock schema syntax per the scaffold's existing file.

---

### B-05 oRPC router skeleton with all 16 procedures, OpenAPI for the adapter
- **Branch:** `b/router-stubs`. **Time:** 40 min. **Deps:** B-03.
- **Goal:** every binding procedure exists with zod input and output and returns fixture data, so D and A can wire UI and the adapter immediately.
- **Files:** `packages/api/src/routers/index.ts`, `packages/api/src/routers/{case,bill,audit,assistance,action,call,event,eval}.ts`, `packages/api/src/fixtures.ts`, `packages/api/src/index.ts` (add `protectedProcedure` placeholder that currently equals `publicProcedure`, and `adapterProcedure`), `apps/web/src/routes/api/v1/$.ts`.
- **Acceptance:** `client.bill.parseText(...)` typed in web; `curl -X POST <url>/api/v1/bill/parseText -H 'content-type: application/json' -H 'x-bb-adapter-key: ...' -d '{"caseId":"c1","text":"..."}'` returns JSON. Default OpenAPI mapping: no `.route()` means `POST /<router>/<procedure>` (verified in oRPC routing docs).
- **Tests:** `packages/api/src/routers/stubs.test.ts` calls each procedure via `createRouterClient(appRouter, { context })` and parses output with the declared zod schema.

```text
CODING-AGENT PROMPT (B-05). Repo: <repo root>. git checkout -b b/router-stubs
Read: packages/api/src/index.ts, packages/api/src/routers/index.ts, apps/web/src/routes/api/rpc/$.ts, apps/web/src/context.ts, docs/plans/B-bill-intelligence-platform.md section 3.2.
1. In packages/api/src/routers create one file per router: case.ts, bill.ts, audit.ts, assistance.ts, action.ts, call.ts, event.ts, eval.ts. Each exports an object, for example `export const billRouter = { parseText: publicProcedure.input(ParseTextInput).output(ParseResult).handler(...), parsePhoto: ..., confirmLines: ... }`. Input and output schemas exactly per section 3.2; import shared schemas from "@betterbill/core"; define input schemas in packages/api/src/inputs.ts.
2. Handlers return data from packages/api/src/fixtures.ts (a synthetic case with two CBC 85025 lines at $84.00 on 2026-09-12, one duplicate flag, savings confirmedCents 8400). Mark each with a comment "// STUB: replaced in B-10" or "// STUB: owned by A".
3. appRouter in routers/index.ts: keep healthCheck; add case: caseRouter, bill: billRouter, audit: auditRouter, assistance, action, call, event, eval. Use the exact keys "case","bill","audit","assistance","action","call","event","eval".
4. Add apps/web/src/routes/api/v1/$.ts: copy the OpenAPIHandler part of api/rpc/$.ts, prefix "/api/v1", keep OpenAPIReferencePlugin with ZodToJsonSchemaConverter from "@orpc/zod/zod4". In context creation, read header x-bb-adapter-key and set ctx.adapter = (header === process env BB_ADAPTER_KEY via the scaffold's ENV object).
5. Write packages/api/src/routers/stubs.test.ts with vitest: for each procedure call it through createRouterClient(appRouter, { context: { db: {} as never, adapter: false } }) and assert the output parses with its schema. Add vitest to packages/api devDependencies and "test": "vitest run".
6. Run: bun run test ; bun run check-types ; bun x biome ci . ; bun dev then curl -X POST http://localhost:3001/api/v1/bill/parseText -H 'content-type: application/json' -d '{"caseId":"c1","text":"x"}'.
7. Commit "feat(api): procedure stubs for all binding routes", push, gh pr create --fill --label contract.
Do not: rename procedures; put business logic in handlers; remove the existing /api/rpc route.
Definition of done: curl returns JSON; tests green; PR open. Paste the curl output in the PR.
```

---

### B-06 Drizzle schema, migration, seed
- **Branch:** `b/db-schema`. **Time:** 50 min. **Deps:** B-03; C's first 3 synthetic bills (agree format at 16:30).
- **Goal:** tables per contracts plus Better Auth tables; first migration committed; seed loads `data/synthetic`.
- **Files:** `packages/db/src/schema/{app.ts,index.ts}` (keep Better Auth schema file the scaffold generated), `packages/db/src/relations.ts`, `packages/db/src/migrations/*`, `packages/db/src/seed.ts`, `packages/db/src/seed.test.ts` (integration), `data/synthetic/README.md` (format, written with C).
- **Tables (all ids `text` primary keys, money `integer` cents, times `timestamp with time zone`):**
  - `case` (id, user_id null fk user, status, hospital_name, created_at, updated_at)
  - `bill` (id, case_id fk, hospital_name, hospital_city, hospital_state, statement_date, account_ref_masked, kind, source_kind, charges_cents, adjustments_cents, paid_cents, due_cents, confirmed_at null)
  - `line` (id, bill_id fk, position int, service_date date null, description, code, code_type, units real, charge_cents, source_page int, bbox jsonb null, confidence real, user_edited bool)
  - `eob` (id, case_id fk, payer, claim_ref_masked, patient_responsibility_cents, lines jsonb null)
  - `flag` (id, case_id fk, audit_run_id, line_ids jsonb, lever, tier, title, explanation, amount_cents, evidence jsonb, confidence real)
  - `action` (id, case_id fk, kind, draft, recipient, approved_at, sent_at, outcome)
  - `case_event` (id, case_id fk, at, actor, type, summary, artifact_ref) append-only, with a trigger that raises on UPDATE and DELETE (custom migration via `bun run --filter @betterbill/db drizzle-kit generate --custom --name case_event_append_only`; flag UNVERIFIED for drizzle-kit 1.0 rc)
  - `hospital_price` (id, hospital_name, code, description, cash_cents null, min_negotiated_cents null, max_negotiated_cents null, source_url, captured_at, file_name)
  - `hospital_policy` (id, hospital_name, url, captured_at, quote, threshold_text, fpl_percent int null)
  - `eval_result` (id, run_at, metric, value real, n int, details jsonb)
  - Better Auth tables as generated by the scaffold (do not hand-edit; if missing, `npx auth@latest generate --adapter drizzle --dialect <dialect>` per Better Auth CLI docs, dialect value UNVERIFIED).
- **Synthetic fixture format (agree with C):** `data/synthetic/bill-01.json` = `{ "id": "bill-01", "bill": Bill, "eob": Eob | null, "expected": { "flags": [{ "lever": Lever, "lineIds": string[] }] }, "notes": string }`, with `bill-01.txt` (text rendering, section B-09 format) and `bill-01.png` (rendered photo). Every hospital name ends with "(synthetic)" unless it is a real public price file captured by C.

```text
CODING-AGENT PROMPT (B-06). Repo: <repo root>. git checkout -b b/db-schema
Read packages/db/src (all files), packages/db/drizzle.config.ts, packages/core/src/schemas.ts, and the table list in docs/plans/B-bill-intelligence-platform.md ticket B-06.
1. Create packages/db/src/schema/app.ts with pgTable definitions from "drizzle-orm/pg-core" for: caseTable ("case"), bill, line, eob, flag, action, caseEvent ("case_event"), hospitalPrice, hospitalPolicy, evalResult. Column names snake_case exactly as listed. Foreign keys with onDelete "cascade" from child to case/bill. Indexes: line(bill_id, position), flag(case_id), case_event(case_id, at).
2. Export from packages/db/src/schema/index.ts alongside the Better Auth schema the scaffold generated. Update relations.ts using the same API the file already uses (drizzle 1.0 rc defineRelations). Do not switch Drizzle versions.
3. docker compose up -d db. Run: DATABASE_URL=postgres://bb:bb@localhost:5432/betterbill bun run db:generate. Then generate a custom migration for the append-only trigger with SQL:
   CREATE OR REPLACE FUNCTION bb_forbid_change() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'case_event is append-only'; END; $$ LANGUAGE plpgsql;
   CREATE TRIGGER case_event_no_update BEFORE UPDATE OR DELETE ON case_event FOR EACH ROW EXECUTE FUNCTION bb_forbid_change();
   If drizzle-kit has no --custom flag in this version, create an empty generated migration and paste the SQL in; report what you did.
4. Run bun run db:migrate against localhost. Verify with: docker compose exec db psql -U bb -d betterbill -c '\dt'.
5. packages/db/src/seed.ts: read every data/synthetic/*.json, parse with Bill and Eob from @betterbill/core, upsert case (id "case-<fixture id>", status "new"), bill, lines, eob. Read data/hospitals/*/prices.json if present into hospital_price. Idempotent (delete by case id cascade first, except case_event rows which are only inserted). Script "db:seed": "bun src/seed.ts".
6. packages/db/src/seed.test.ts (vitest, script "test:integration"): runs seed twice against DATABASE_URL, asserts counts equal after both runs; asserts UPDATE on case_event throws.
7. Run: bun run db:seed ; bun run --filter @betterbill/db test:integration ; bun run check-types ; bun x biome ci .
8. Commit "feat(db): schema, migrations, seed", push, gh pr create --fill.
Do not: run db:push or migrate against any non-localhost URL; hand-edit generated migration SQL except the custom trigger; store images.
Definition of done: migration files committed; seed idempotent; integration test green locally and in CI.
```

---

### B-07 evlog and Sentry wiring
- **Branch:** `b/observability`. **Time:** 60 min. **Deps:** B-05.
- **Goal:** one trace per request, wide event per procedure, errors as issues, logs in Sentry Logs.
- **Files:** `apps/web/instrument.server.mjs`, `apps/web/src/instrument.client.ts`, `apps/web/src/client.tsx`, `apps/web/src/server.ts`, `apps/web/src/start.ts`, `apps/web/src/router.tsx`, `apps/web/vite.config.ts`, evlog config file (wherever the scaffold's evlog addon put it), `packages/api/src/middleware/observe.ts`.
- **Facts verified in docs:** package `@sentry/tanstackstart-react` (beta, for TanStack Start 1.0 RC); client init in `src/instrument.client.ts` imported first in `src/client.tsx`; `Sentry.tanstackRouterBrowserTracingIntegration(router)` added in `src/router.tsx`; `Sentry.replayIntegration()`; server init in `instrument.server.mjs`; Vite plugin `sentryTanstackStart` from `@sentry/tanstackstart-react/vite`, last in plugins, options `org`, `project`, `authToken`; `wrapFetchWithSentry` in `src/server.ts`; `sentryGlobalRequestMiddleware` and `sentryGlobalFunctionMiddleware` in `createStart()` in `src/start.ts`. For serverless platforms (Vercel named as an example) the guide imports `../instrument.server.mjs` directly at the top of `src/server.ts` instead of `--import`. evlog: package `evlog`; Sentry drain `createSentryDrain` from `evlog/sentry` (env `SENTRY_DSN`); TanStack Start integration via Nitro module `evlog/nitro/v3`, `evlogErrorHandler` middleware, request logger via `useRequest()` from `nitro/context` then `req.context.log`.
- **Decisions:** `createSentryDrain()` without `issues: true` (the Sentry SDK already reports errors; avoids duplicates per evlog docs). `sendDefaultPii` off; `dataCollection.userInfo: false`. `tracesSampleRate: 1.0` for the hackathon. Replay: `replaysSessionSampleRate: 1.0` during demo only on our app, keep default masking.

```text
CODING-AGENT PROMPT (B-07). Repo: <repo root>. git checkout -b b/observability
Read first: https://docs.sentry.io/platforms/javascript/guides/tanstackstart-react/manual-setup/ and https://www.evlog.dev/raw/integrate/frameworks/tanstack-start.md and https://www.evlog.dev/raw/integrate/adapters/cloud/sentry.md . Follow them exactly; where this prompt and the docs disagree, follow the docs and report the difference.
1. bun add --cwd apps/web @sentry/tanstackstart-react
2. Create apps/web/src/instrument.client.ts per the guide with dsn from the public env var (VITE_SENTRY_DSN or the scaffold's public env mechanism), tracesSampleRate 1.0, integrations [Sentry.replayIntegration()], replaysSessionSampleRate 1.0, replaysOnErrorSampleRate 1.0, sendDefaultPii false. Import it first in src/client.tsx (create client.tsx per the guide if the scaffold has none).
3. In src/router.tsx add Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(router)) on the client only, as the guide shows.
4. Create apps/web/instrument.server.mjs per the guide (server dsn SENTRY_DSN, tracesSampleRate 1.0, enableLogs true if the server SDK supports it per the guide). Because Vercel is serverless, use the guide's serverless option: import "../instrument.server.mjs" at the top of src/server.ts and wrap the fetch handler with wrapFetchWithSentry. Add sentryGlobalRequestMiddleware and sentryGlobalFunctionMiddleware in src/start.ts createStart().
5. vite.config.ts: add sentryTanstackStart({ org, project, authToken: process.env.SENTRY_AUTH_TOKEN }) as the LAST plugin. Org and project come from env SENTRY_ORG and SENTRY_PROJECT.
6. evlog: confirm what the scaffold's evlog addon already wired (search for "evlog"). Add the Sentry drain with createSentryDrain() from "evlog/sentry" (no issues: true) using the documented hook for Nitro v3 or the evlog config file.
7. packages/api/src/middleware/observe.ts: an oRPC middleware `observe` that, for each procedure, opens Sentry.startSpan({ name: "orpc.<path>", op: "rpc" }) and sets evlog fields: procedure, caseId (from input if present), durationMs, outcome. Apply it to publicProcedure in packages/api/src/index.ts. Never log line descriptions, names, or images: only ids, codes, counts, cents totals.
8. Add a temporary route /api/debug/boom that throws (guarded by NODE_ENV !== "production"). Run bun dev, hit it, confirm an issue and a trace in Sentry. Then remove the route.
9. bun run check-types ; bun run build ; bun x biome ci .
10. Commit "feat(obs): sentry tracing, logs, replay, evlog drain", push, gh pr create --fill. Include a screenshot of one trace in the PR.
Do not: enable sendDefaultPii; log request bodies; add Replay to pages that are not ours; put SENTRY_AUTH_TOKEN in client env.
Definition of done: a request to /api/rpc shows a trace with an rpc span in Sentry; an evlog wide event appears in Sentry Logs; build passes on Vercel preview.
```

---

### B-08 Rules engine v1, savings, Money (core, pure)
- **Branch:** `b/core-rules`. **Time:** 80 min. **Deps:** B-03.
- **Goal:** duplicate and units rules, missing itemization, savings math with tiers, Money helpers; full unit tests on golden synthetic bills. EOB and published price follow in B-14 and B-18 with the same shape.
- **Files:** `packages/core/src/rules/{types.ts,duplicate.ts,units.ts,eobMismatch.ts,publishedPrice.ts,missingItemization.ts,index.ts}`, `packages/core/src/savings.ts`, `packages/core/src/money.ts`, `packages/core/src/copy.ts`, tests beside each, `packages/core/src/__fixtures__/golden.ts`.

**Signatures (binding inside core)**
```ts
// packages/core/src/rules/types.ts
import type { Bill, Eob, Flag, Lever, Savings } from "../schemas";
export type UnitBound = { code: string; maxUnitsPerDay: number; source: string; sourceUrl?: string };
export type PublishedPrice = {
  hospitalName: string; code: string;
  cashCents: number | null; minNegotiatedCents: number | null; maxNegotiatedCents: number | null;
  sourceUrl: string; capturedAt: string;
};
export type AuditInput = { bill: Bill; eob: Eob | null; unitBounds: UnitBound[]; prices: PublishedPrice[]; enabledLevers?: Lever[] };
export type AuditOutput = { flags: Flag[]; savings: Savings };

// rules/*.ts
export function detectDuplicates(bill: Bill): Flag[];
export function detectUnitAnomalies(bill: Bill, bounds: UnitBound[]): Flag[];
export function detectEobMismatch(bill: Bill, eob: Eob | null): Flag[];          // B-14
export function detectPublishedPrice(bill: Bill, prices: PublishedPrice[]): Flag[]; // B-18
export function detectMissingItemization(bill: Bill): Flag[];
// rules/index.ts
export function runAudit(input: AuditInput): AuditOutput;
// savings.ts
export function computeSavings(flags: Flag[], prices: PublishedPrice[], assistance?: Savings["assistance"]): Savings;
// money.ts
export function moneyParts(cents: number): { sign: "" | "\u2212"; dollars: string; cents: string };
export function formatMoney(cents: number): string;            // "$84.00", "\u2212$1,022.47"
export function parseMoneyToCents(text: string): number | null; // "1,234.50" -> 123450; "$84" -> 8400; "abc" -> null
```

**Rule definitions**
- Flag id is deterministic: `${lever}:${lineIds.join(",") || "bill"}`. Flags are sorted by `amountCents` desc, then id.
- `duplicate` (tier `confirmed`, evidence `arithmetic`): group lines by `(serviceDate, code ?? normalized description, units, chargeCents)`; skip lines with `serviceDate` null; for a group of size n > 1, one flag with `lineIds` = the 2nd to nth lines, `amountCents` = sum of their charges, `confidence` = min line confidence.
- `units` (tier `rule`, evidence `rule` with bound and source): sum units per `(serviceDate, code)`; if over `maxUnitsPerDay`, `amountCents` = round(chargeCents / units) x excess units across those lines; lines already flagged as duplicates are excluded first.
- `eob_mismatch` (tier `confirmed`, evidence `arithmetic`): if `eob` and `bill.totals.dueCents > eob.patientResponsibilityCents`, one flag, `lineIds` [], amount = difference.
- `published_price` (tier `published`, evidence `price_file` with `sourceUrl`, `capturedAt`): match by code and hospital name (case-insensitive, trimmed); if `chargeCents > cashCents x units`, amount = gap to cash price; skip when `cashCents` null.
- `missing_itemization` (tier `rule`, amount 0): `bill.kind === "summary"` or zero lines with codes. Title "Ask for an itemized bill".
- Copy (placeholder until C reviews, in `copy.ts`): titles "Charged twice on the same day", "More units than the billing rule allows", "Bill asks more than your EOB says", "Higher than the hospital's published price". A test asserts no string in `copy.ts` matches `/illegal|fraud|overcharge/i` and every title is at most 60 chars.

**Savings math (method strings returned in `Savings.method`)**
- `confirmedCents` = max(sum of `duplicate` amounts, `eob_mismatch` amount). Reason: the EOB gap may already include the duplicate; we take the larger, never the sum. Method line says so.
- Potential range: `units` flags add their amount to both low and high. `published_price` flags: low = charge minus the highest reference price below the charge (from cash, min negotiated, max negotiated); high = charge minus the lowest reference price. A line already counted as confirmed is never counted again.
- `estimate` tier and amount-0 flags never add to numbers.
- `assistance` defaults to `{ status: "unknown" }`.

**Example test cases (synthetic only)**
```ts
// packages/core/src/rules/duplicate.test.ts
const cbc = (id: string, date = "2026-09-12") => line({ id, serviceDate: date, code: "85025", codeType: "CPT",
  description: "CBC W/ DIFFERENTIAL", units: 1, chargeCents: 8400 });
it("flags CBC 85025 $84 twice same date", () => {
  const flags = detectDuplicates(bill([cbc("l1"), cbc("l2")]));
  expect(flags).toHaveLength(1);
  expect(flags[0]).toMatchObject({ id: "duplicate:l2", lever: "duplicate", tier: "confirmed", lineIds: ["l2"], amountCents: 8400 });
});
it("does not flag same code on different dates", () => {
  expect(detectDuplicates(bill([cbc("l1", "2026-09-12"), cbc("l2", "2026-09-13")]))).toEqual([]);
});
it("does not flag same code same date different amount", () => {
  expect(detectDuplicates(bill([cbc("l1"), { ...cbc("l2"), chargeCents: 9100 }]))).toEqual([]);
});
it("skips lines without a service date", () => {
  expect(detectDuplicates(bill([cbc("l1", null as never), cbc("l2", null as never)]))).toEqual([]);
});
// units.test.ts (bound is a test fixture, not a real policy value)
const bound = { code: "36415", maxUnitsPerDay: 1, source: "test fixture" };
it("flags 3 units of 36415 at $30 each when bound is 1", () => {
  const f = detectUnitAnomalies(bill([line({ id: "v1", code: "36415", units: 3, chargeCents: 9000 })]), [bound]);
  expect(f[0]).toMatchObject({ lever: "units", tier: "rule", amountCents: 6000 });
});
// eobMismatch.test.ts
it("flags due $1,200.00 vs EOB patient responsibility $450.00", () => {
  const f = detectEobMismatch(bill([], { dueCents: 120000 }), eob({ patientResponsibilityCents: 45000 }));
  expect(f[0]).toMatchObject({ id: "eob_mismatch:bill", tier: "confirmed", amountCents: 75000 });
});
// publishedPrice.test.ts (fixture price, not a real hospital value)
it("flags MRI 72148 billed $6,900 vs fixture cash $4,800", () => {
  const f = detectPublishedPrice(bill([line({ id: "m1", code: "72148", chargeCents: 690000 })]),
    [price({ code: "72148", cashCents: 480000 })]);
  expect(f[0]).toMatchObject({ lever: "published_price", tier: "published", amountCents: 210000 });
});
// savings.test.ts
it("takes the larger of duplicates and EOB gap, not the sum", () => {
  expect(computeSavings([dupFlag(8400), eobFlag(75000)], []).confirmedCents).toBe(75000);
});
// money.test.ts
it("formats", () => {
  expect(formatMoney(8400)).toBe("$84.00");
  expect(formatMoney(-102247)).toBe("\u2212$1,022.47");
  expect(moneyParts(260937)).toEqual({ sign: "", dollars: "2,609", cents: "37" });
  expect(parseMoneyToCents("1,234.50")).toBe(123450);
});
```
Golden test: `runAudit` on every `data/synthetic/*.json` fixture yields exactly the `expected.flags` (lever and lineIds). The test reads fixtures with `node:fs` in the test file only (core source stays IO-free).

```text
CODING-AGENT PROMPT (B-08). Repo: <repo root>. git checkout -b b/core-rules
Read: packages/core/src/schemas.ts; docs/plans/B-bill-intelligence-platform.md ticket B-08 (signatures, rule definitions, savings math, example tests). Use TDD: write each test first, see it fail, then implement.
1. Create packages/core/src/rules/types.ts with the exact types in ticket B-08.
2. Create test helpers in packages/core/src/__fixtures__/golden.ts: line(partial), bill(lines, totalsPartial?), eob(partial), price(partial), with synthetic defaults (hospital "Westside General Hospital (synthetic)", Los Angeles, CA).
3. Implement money.ts (Intl.NumberFormat("en-US") for grouping; minus sign is the character \u2212), copy.ts, rules/duplicate.ts, rules/units.ts, rules/missingItemization.ts, rules/eobMismatch.ts and rules/publishedPrice.ts (both may be done now; B-14 and B-18 only wire data), savings.ts, rules/index.ts runAudit (runs enabled levers, default all; excludes duplicate-flagged lines from units and published_price; validates every Flag with the Flag zod schema; sorts flags).
4. Write every example test from ticket B-08 plus: runAudit on a clean bill returns [] and confirmedCents 0; a flag explanation is at most 2 sentences; missing_itemization on kind "summary".
5. Golden test packages/core/src/rules/golden.test.ts: for each data/synthetic/*.json (skip with it.skip if folder empty), runAudit with unit bounds from data/rules/unit-bounds.json if present, compare sorted (lever, lineIds) to expected.flags.
6. Export all public functions from src/index.ts.
7. Run: bun run --filter @betterbill/core test (coverage thresholds must pass) ; bun run check-types ; bun x biome ci .
8. Commit in small commits ("feat(core): duplicate rule", etc.), push, gh pr create --fill.
Do not: use floats for stored money (rounding only via Math.round on the final cents); import fs, fetch, or db in non-test files; invent real CMS unit limits (bounds come from C's table data/rules/unit-bounds.json with sources); use "illegal", "fraud", "overcharge".
Definition of done: all tests green, coverage thresholds met, PR open with the coverage summary pasted.
```

---

### B-09 bill.parseText (deterministic parser plus model cleanup fallback)
- **Branch:** `b/parse-text`. **Time:** 60 min. **Deps:** B-08 (money parsing), C's text format agreement.
- **Goal:** parse C's synthetic text format exactly; for unknown pasted text, fall back to a model cleanup that returns the same JSON, validated by zod.
- **Text format (agreed with C; C renders every synthetic bill this way):**
```
HOSPITAL: Westside General Hospital (synthetic) | Los Angeles | CA
STATEMENT DATE: 2026-09-30
ACCOUNT: ****4821
TYPE: itemized
DATE        CODE   TYPE  DESCRIPTION                     UNITS  CHARGE
2026-09-12  85025  CPT   CBC W/ DIFFERENTIAL             1      84.00
2026-09-12  85025  CPT   CBC W/ DIFFERENTIAL             1      84.00
2026-09-12  72148  CPT   MRI LUMBAR SPINE W/O CONTRAST   1      6,900.00
TOTAL CHARGES: 12,000.00
ADJUSTMENTS: 0.00
PAYMENTS: 0.00
AMOUNT DUE: 12,000.00
```
Columns are separated by 2 or more spaces. Dates also accepted as `MM/DD/YYYY`. Code `-` means null.
- **Files:** `packages/core/src/parse/text.ts` (pure: `parseBillText(text: string, opts: { idPrefix: string }): { bill: Bill; warnings: string[]; unparsedLines: string[] }` and `reconcile(bill: Bill): Reconciliation`), `packages/core/src/parse/text.test.ts`, `packages/core/src/parse/readerOutput.ts` (zod `ReaderOutput` for model JSON plus `readerOutputToBill`), `packages/api/src/reader/cleanup.ts` (IO), `packages/api/src/routers/bill.ts`.
- **Fallback:** if `unparsedLines.length > 0` and more than 30% of candidate rows failed, call the cleanup model. Default: StepFun chat completions with `step-5-preview` in text mode and `response_format: { type: "json_object" }` (verified fields), so only one AI key is needed. Gemini is an alternative only if A's Gemini wrapper exists (model id from A's code, not invented here). Output must parse with `ReaderOutput`; otherwise return the deterministic result with warnings.
- **Acceptance:** all C's `.txt` fixtures parse with zero unparsed lines and match the `.json` lines exactly (golden test); `reconcile` returns `ok: true` on them.

```text
CODING-AGENT PROMPT (B-09). Repo: <repo root>. git checkout -b b/parse-text
Read: docs/plans/B-bill-intelligence-platform.md ticket B-09 (format), packages/core/src/money.ts, packages/core/src/schemas.ts.
1. packages/core/src/parse/text.ts: export parseBillText(text, { idPrefix }) and reconcile(bill). Header keys case-insensitive. Line rows: regex for a leading date (YYYY-MM-DD or MM/DD/YYYY), then split the rest on /\s{2,}/ into code, codeType, description, units, charge. Use parseMoneyToCents. Line ids `${idPrefix}-l${position}`. source { page: 1, bbox: null }, confidence 1, userEdited false. sourceKind "text". kind from TYPE header, default "itemized" if any line has a code else "summary". Lines that look like rows but fail go to unparsedLines with a warning.
2. reconcile: linesSumCents = sum chargeCents; statedChargesCents = totals.chargesCents or null if the header was missing; diffCents = stated - sum; ok = diff === 0 or stated null.
3. Tests in text.test.ts: the sample in ticket B-09 (3 lines, 85025 twice at 8400, 72148 at 690000); MM/DD/YYYY date; code "-" -> null; "6,900.00" -> 690000; a malformed row goes to unparsedLines; reconciliation mismatch example (stated 12,000.00 vs lines 7,068.00 -> diffCents 493200). Golden test: every data/synthetic/*.txt parses to the lines in the matching .json (compare all fields except id).
4. packages/core/src/parse/readerOutput.ts: zod ReaderOutput = { hospital?: {name, city, state}, statementDate?, kind?, lines: [{ serviceDate: string|null, description, code: string|null, codeType: string|null, units: number|null, charge: string, bbox?: [n,n,n,n]|null, confidence?: number, page?: number }], totals?: { charges?: string, adjustments?: string, paid?: string, due?: string } }. readerOutputToBill(out, { idPrefix, sourceKind }) converts charge strings with parseMoneyToCents, clamps bbox to 0..1 and sets null if x1<=x0 or y1<=y0, maps unknown codeType to "OTHER", units null -> 1. Unit tests for each conversion.
5. packages/api/src/reader/stepfun.ts: export async function stepfunChat(messages, opts): uses the "openai" npm package with baseURL "https://api.stepfun.ai/v1" and apiKey from STEPFUN_API_KEY (server env only), model "step-5-preview", response_format { type: "json_object" }, temperature 0, timeout 25000 ms. Export const STEPFUN_MODEL = "step-5-preview".
6. packages/api/src/reader/cleanup.ts: cleanupText(text): sends a system prompt asking for JSON matching ReaderOutput (charges as printed strings, never computed), parses with ReaderOutput.safeParse.
7. bill.parseText handler: parseBillText -> maybe cleanupText -> reconcile -> persist bill and lines (replace previous unconfirmed bill for the case) -> append case_event { actor "system", type "bill.parsed", summary "Read N lines from text" } -> return ParseResult with reader.mode "deterministic" or "model_cleanup". lowConfidenceLineIds = lines with confidence < 0.8.
8. Run: bun run test ; bun run check-types ; bun x biome ci .
9. Commit "feat(core): text bill parser" and "feat(api): bill.parseText", push, gh pr create --fill.
Do not: let the model compute totals or cents; call the model when the deterministic parse is clean; log bill text; expose STEPFUN_API_KEY to the client bundle.
Definition of done: golden text tests green; procedure returns a valid ParseResult for every fixture via the integration client.
```

---

### B-10 Real case, confirm, audit, event routes with integration tests
- **Branch:** `b/routes-core-loop`. **Time:** 70 min. **Deps:** B-06, B-08, B-09.
- **Goal:** replace stubs for `case.create`, `case.get`, `bill.confirmLines`, `audit.run`, `audit.get`, `event.list`, `eval.results`.
- **Files:** `packages/api/src/routers/{case,bill,audit,event,eval}.ts`, `packages/api/src/repo/*.ts` (small query helpers), `packages/api/src/routers/loop.int.test.ts`, `packages/api/vitest.integration.config.ts`.
- **Acceptance:** integration test `case.create({ sample: "bill-01" }) -> bill.parseText -> bill.confirmLines -> audit.run -> event.list` passes on the CI Postgres service; flags match fixture `expected`; `audit.run` returns `durationMs`; every step appends a `case_event`.

```text
CODING-AGENT PROMPT (B-10). Repo: <repo root>. git checkout -b b/routes-core-loop
Read: packages/api/src/routers/*.ts (stubs), packages/db/src/schema/app.ts, packages/core/src/index.ts, ticket B-10.
1. case.create: insert case (id via crypto.randomUUID()), status "new"; if input.sample, load data/synthetic/<sample>.txt text and return; append case_event "case.created".
2. bill.confirmLines: validate lines with Line[]; replace lines for the case's bill; set confirmed_at; mark lines whose content differs from the stored parse as userEdited true; upsert eob if given; status "lines_confirmed"; event "bill.confirmed" with summary "Confirmed N lines (M edited)".
3. audit.run: load confirmed bill, eob, unit bounds (data/rules/unit-bounds.json, read once at module load), prices from hospital_price for the bill's hospital; t0 = performance.now(); runAudit; durationMs = Math.round(performance.now() - t0); insert flags with a new audit_run_id; status "audited"; event "audit.completed" summary "Found N flags". Return AuditResult. Reject with an ORPCError("PRECONDITION_FAILED") if lines are not confirmed.
4. audit.get returns the latest audit_run's flags plus recomputed savings (computeSavings) or null.
5. event.list returns events ordered by at asc. eval.results reads data/eval/results.json if present, else { generatedAt: null, metrics: [] }.
6. Integration test loop.int.test.ts using createRouterClient(appRouter, { context: { db: createDb({ DATABASE_URL: process.env.DATABASE_URL! }), adapter: false, session: null } }). Run the full loop for every fixture in data/synthetic; assert flags (lever, lineIds) equal expected.flags; assert event types in order. Script "test:integration": "vitest run -c vitest.integration.config.ts".
7. Run locally with docker compose up -d db; bun run db:migrate; bun run db:seed; bun run test:integration.
8. Commit "feat(api): core loop routes", push, gh pr create --fill.
Do not: compute savings in routers beyond calling computeSavings; update or delete case_event rows; change procedure names or schemas.
Definition of done: integration tests green in CI; D confirms the case page renders real flags from the preview.
```

---

### B-11 Better Auth: value before signup
- **Branch:** `b/auth-gating`. **Time:** 50 min. **Deps:** B-10.
- **Goal:** audit works without an account; saving the case, sending, and calling require a real account.
- **Approach:** Better Auth anonymous plugin (verified in docs): server `import { anonymous } from "better-auth/plugins"`, client `import { anonymousClient } from "better-auth/client/plugins"`, `authClient.signIn.anonymous()`, `onLinkAccount: async ({ anonymousUser, newUser }) => {...}` runs when an anonymous user signs up; by default the anonymous user is then deleted. The plugin adds a user-table field (name shown as a component on the docs page; likely `isAnonymous`, UNVERIFIED; read the regenerated schema).
- **Rules:** on first upload D calls `authClient.signIn.anonymous()` if no session. Cases get `user_id` of the session user. `protectedProcedure` = session exists and user is not anonymous; used by `action.approve`, `action.send`, `call.start`, `case.list`. `onLinkAccount` reassigns `case.user_id` from `anonymousUser.user.id` to `newUser.user.id` (exact object shape UNVERIFIED; log both in dev to confirm) and appends `case_event` "case.claimed". Fallback if the plugin misbehaves: allow `user_id` null for unauthenticated cases and claim by `caseId` after signup (store the caseId in localStorage on the client).
- **Files:** auth config file the scaffold generated (likely `packages/auth/src/index.ts`, UNVERIFIED), its client file in `apps/web/src/lib`, `packages/api/src/index.ts`, `packages/api/src/context.ts`, migration for the new field.

```text
CODING-AGENT PROMPT (B-11). Repo: <repo root>. git checkout -b b/auth-gating
Read: https://www.better-auth.com/docs/plugins/anonymous ; the scaffold's Better Auth server and client config (grep -r "betterAuth(" and "createAuthClient"); packages/api/src/context.ts.
1. Add anonymous({ onLinkAccount }) to the server plugins and anonymousClient() to the client plugins, imports exactly as the docs show.
2. Regenerate the Better Auth Drizzle schema the way the scaffold did (check package scripts; Better Auth CLI docs: npx auth@latest generate --adapter drizzle --dialect <dialect>). Then bun run db:generate for a migration. Report the new user column name.
3. context.ts: add session (from auth.api.getSession({ headers: req.headers }) as the scaffold does) to Context.
4. packages/api/src/index.ts: export protectedProcedure that throws ORPCError("UNAUTHORIZED", { message: "Create an account to save, send, or call." }) when there is no session or the user is anonymous. Apply to action.approve, action.send, call.start, case.list.
5. case.create sets user_id from the session if present. onLinkAccount: update case set user_id = newUser id where user_id = anonymous user id; append case_event "case.claimed".
6. Integration tests: anonymous session can parse and audit; anonymous action.send rejects with UNAUTHORIZED; after link, case.list for the new user includes the case.
7. Run all checks; commit "feat(auth): anonymous audit, account to act"; push; gh pr create --fill --label contract (context shape changed).
Do not: require login for parse or audit; store passwords or tokens in logs; change Polar config.
Definition of done: tests green; manual check on preview: audit without login, send asks to sign up.
```

---

### B-12 Playwright smoke (config and first tests)
- **Branch:** `b/e2e-smoke`. **Time:** 40 min. **Deps:** B-10, D's case page. D and A extend tests.
- **Files:** `e2e/playwright.config.ts`, `e2e/smoke.spec.ts`, root devDependency `@playwright/test`.
- **Config facts (verified):** bypass Vercel Deployment Protection with header `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` and `x-vercel-set-bypass-cookie: true` in `use.extraHTTPHeaders`.
- **Tests:** landing loads; "Try a sample bill" leads to flags visible; evidence sheet opens; approval sheet shows exact text (A); desktop table renders. Projects: `devices["iPhone 14"]` (webkit) and desktop chromium 1280x800.

```text
CODING-AGENT PROMPT (B-12). Repo: <repo root>. git checkout -b b/e2e-smoke
1. bun add -d @playwright/test at the root. Create e2e/playwright.config.ts: testDir ".", outputDir "test-results", reporter [["html", { outputFolder: "playwright-report", open: "never" }]], use.baseURL = process.env.BASE_URL ?? "http://localhost:3001", extraHTTPHeaders only when VERCEL_AUTOMATION_BYPASS_SECRET is set: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" }. Projects: { name: "mobile", use: { ...devices["iPhone 14"] } }, { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }. When BASE_URL is unset, webServer: { command: "bun run build && bun run --filter web serve", url: "http://localhost:3001", reuseExistingServer: true }.
2. e2e/smoke.spec.ts: test "landing loads" (status 200, heading visible); test "sample bill shows flags" (click the button with accessible name /try a sample bill/i, expect text /charged twice/i visible within 20 s). Use getByRole and getByText only; no CSS selectors.
3. Run locally: bunx playwright install chromium webkit ; bunx playwright test -c e2e/playwright.config.ts.
4. Commit "test(e2e): playwright smoke", push, gh pr create --fill.
Do not: hardcode the bypass secret; test live StepFun calls in e2e (use the sample text bill).
Definition of done: smoke passes locally and the e2e-preview job runs on the PR's Vercel preview.
```

---

### B-13 bill.parsePhoto with step-5-preview
- **Branch:** `b/parse-photo`. **Time:** 2 h. **Deps:** B-09 (ReaderOutput, stepfun client), B-07.
- **Goal:** photo pages to `Line[]` with normalized bbox and confidence, totals reconciliation, and low-confidence lines surfaced for user confirmation.
- **API facts (verified on StepFun docs):** `POST https://api.stepfun.ai/v1/chat/completions`, `Authorization: Bearer <key>`, OpenAI-compatible SDK with `baseURL: "https://api.stepfun.ai/v1"`; model id `step-5-preview` (text, image, video input; 1M context); image part `{ type: "image_url", image_url: { url: "data:image/jpeg;base64,...", detail: "high" } }` (detail `low` default; formats jpg, png, webp, static gif); `response_format: { type: "json_object" }`; response `choices[0].message.content`, `usage`. Whether `step-5-preview` returns reliable row bounding boxes is UNVERIFIED: measure on synthetic photos before relying on crops.
- **Flow:** validate data URLs (mime in jpeg/png/webp, decoded size under 4 MB each, at most 3 pages) -> sha256 per page -> cache lookup (B-15) per `BB_READER_MODE` -> StepFun call per page with `detail: "high"` -> `ReaderOutput.safeParse` (one retry with the zod error message appended if parse fails) -> `readerOutputToBill` -> confidence adjustment -> `reconcile` -> persist -> event "bill.parsed" with "Read N lines from photo (M need a check)" -> `ParseResult`.
- **Confidence (documented, deterministic):** `confidence = min(modelConfidence ?? 0.7, structural)`, where structural is 1.0, minus 0.3 if the code is present but does not match `/^\d{5}$|^[A-Z]\d{4}$|^\d{3,4}$/`, minus 0.3 if the charge string failed to parse, minus 0.2 if the date is invalid. Lines below 0.8 go to `lowConfidenceLineIds`. If reconciliation fails, every line is shown for confirmation and the UI says "The lines add up to $X but the bill says $Y. Please check."
- **Prompt rules:** read only what is printed; charges as printed strings; null when unreadable; bbox `[x0, y0, x1, y1]` normalized to the page; never compute totals; never infer codes.
- **Files:** `packages/api/src/reader/photo.ts`, `packages/api/src/reader/prompts.ts`, `packages/api/src/routers/bill.ts`, `packages/core/src/parse/confidence.ts` (+ test), `packages/api/src/reader/photo.test.ts` (mocks the client).

```text
CODING-AGENT PROMPT (B-13). Repo: <repo root>. git checkout -b b/parse-photo
Read: ticket B-13 in docs/plans/B-bill-intelligence-platform.md; packages/api/src/reader/stepfun.ts; packages/core/src/parse/readerOutput.ts; https://platform.stepfun.ai/docs/en/api-reference/chat/chat-completion-create
1. packages/core/src/parse/confidence.ts: export function scoreLineConfidence(raw: { code: string|null; charge: string; serviceDate: string|null; modelConfidence?: number }): number implementing the formula in ticket B-13 (clamp 0..1). Tests for each penalty.
2. packages/api/src/reader/prompts.ts: export const PHOTO_SYSTEM_PROMPT (rules from ticket B-13; describe the ReaderOutput JSON shape field by field; say "Return only JSON").
3. packages/api/src/reader/photo.ts: export async function readBillPhoto(pages: { imageDataUrl: string; page: number }[], opts: { caseId: string }): Promise<{ output: ReaderOutput; latencyMs: number; usage: unknown; cachedAt: string | null }>. Validate inputs (mime jpeg/png/webp; base64 length * 3/4 under 4 MB; 1 to 3 pages). For each page call stepfunChat with messages [{ role: "system", content: PHOTO_SYSTEM_PROMPT }, { role: "user", content: [{ type: "text", text: "Page N of M" }, { type: "image_url", image_url: { url, detail: "high" } }] }]. Merge lines, set page. Wrap each call in Sentry.startSpan({ op: "gen_ai.chat", name: "chat step-5-preview", attributes: { "gen_ai.operation.name": "chat", "gen_ai.request.model": "step-5-preview" } }) and add usage token counts as attributes if present. On invalid JSON retry once with the zod issues appended.
4. bill.parsePhoto handler per the flow in ticket B-13, reader.mode "step-5-preview", reader.model "step-5-preview".
5. photo.test.ts: mock stepfunChat; returns fixture JSON for a 3-line synthetic bill; assert ParseResult, bbox clamping, low-confidence ids, reconciliation; invalid JSON then valid JSON triggers exactly one retry.
6. Manual live test (needs STEPFUN_API_KEY in apps/web/.env): bun run --filter @betterbill/api reader:try data/synthetic/bill-01.png (add a tiny script packages/api/scripts/try-photo.ts that prints lines and latency). Paste output (no key) in the PR.
7. Checks; commit "feat(api): bill.parsePhoto with step-5-preview"; push; gh pr create --fill.
Do not: send images to any other service; store images in the DB or logs; let the model produce cents or totals; call the API from the browser; use any model id other than step-5-preview for photos.
Definition of done: live read of bill-01.png returns lines; tests green; trace shows a gen_ai.chat span.
```

---

### B-14 eob_mismatch rule wired end to end
- **Branch:** `b/rule-eob`. **Time:** 40 min. **Deps:** B-08, B-10.
- **Goal:** EOB input via `bill.parseText({ eobText })` (format: `PAYER: ...`, `CLAIM: ****1234`, `PATIENT RESPONSIBILITY: 450.00`) or `bill.confirmLines({ eob })`; rule active in `runAudit`; golden fixtures with EOB pass.
- **Files:** `packages/core/src/parse/eob.ts` (+ test), `packages/api/src/routers/bill.ts`, `packages/core/src/rules/eobMismatch.ts` (already implemented in B-08; add edge tests: equal amounts no flag, due lower no flag, missing EOB no flag).

```text
CODING-AGENT PROMPT (B-14). git checkout -b b/rule-eob. Implement packages/core/src/parse/eob.ts: parseEobText(text): Eob | null (keys PAYER, CLAIM, PATIENT RESPONSIBILITY; money via parseMoneyToCents; claim masked to last 4). Tests: valid, missing responsibility -> null, "$1,200.00" parsing. Wire eobText into bill.parseText (persist eob). Add edge tests to eobMismatch.test.ts (equal, lower, null). Extend loop.int.test.ts with a fixture that has an EOB and expects eob_mismatch. Run bun run test, bun run test:integration, check-types, biome. Commit "feat(core): eob parsing and mismatch wiring"; push; gh pr create --fill.
Do not: sum duplicate and EOB amounts in savings (see savings rule); change Eob schema.
Definition of done: golden and integration tests green; D sees the EOB flag with tier "Confirmed from your bill".
```

---

### B-15 Cached runs for demo reliability
- **Branch:** `b/reader-cache`. **Time:** 45 min. **Deps:** B-13.
- **Goal:** the demo never dies on a slow or failed model call, and cached output is always labelled.
- **Design:** `data/cache/reader/<sha256>.json` files committed to the repo (Vercel functions cannot write to the repo at runtime) = `{ sha256, model: "step-5-preview", recordedAt, output: ReaderOutput, latencyMs }`. Recorded by `bun run reader:record <png...>` which calls StepFun live. `BB_READER_MODE`: `live` (call; on error or 25 s timeout fall back to cache if present, set `reader.mode = "cache"`, `cachedAt`), `cache_first` (use cache if present, else live), `cache_only` (CI and offline). The UI shows "Read earlier on <date> (saved copy)" whenever `cachedAt` is set (D renders, B provides the field). For the StepFun judging moment use `live`.
- **Files:** `packages/api/src/reader/cache.ts`, `packages/api/scripts/record-reader.ts`, `data/cache/reader/*.json`, tests.

```text
CODING-AGENT PROMPT (B-15). git checkout -b b/reader-cache. Create packages/api/src/reader/cache.ts: sha256Hex(dataUrl) via node:crypto on the decoded bytes; loadCached(sha): Promise<CacheEntry|null> reading data/cache/reader/<sha>.json resolved from the repo root (use import.meta.url, and confirm the file is included in the Vercel bundle; if not, import the JSON files through a generated index module packages/api/src/reader/cache-index.ts produced by the record script). Modes per ticket B-15 in readBillPhoto. Script packages/api/scripts/record-reader.ts: for each PNG path arg, build a data URL, call StepFun live, write the entry, regenerate cache-index.ts. Tests: cache_only with a hit returns cachedAt; cache_only with a miss throws ORPCError("SERVICE_UNAVAILABLE", { message: "Photo reading is offline. Paste the bill text instead." }); live with a mocked timeout falls back to cache. Record all data/synthetic/*.png. Run checks; commit "feat(api): cached reader runs"; push; gh pr create --fill.
Do not: present a cached read as live; cache anything but synthetic images; write files at runtime.
Definition of done: with network off and BB_READER_MODE=cache_first the sample photo still yields lines with a cachedAt label.
```

---

### B-16 Migrations on main against Tiger Data
- **Branch:** `b/ci-migrate`. **Time:** 15 min. **Deps:** B-02, B-04, B-06.
- **Goal:** `migrate-shared` job active; GitHub environment `shared-db` holds `DATABASE_URL_SHARED`.
- **Steps:** confirm job exists (B-02 YAML); add `sslmode=require` in the secret; do one dry merge; check Tiger Console shows tables. Add `docs/ONBOARDING.md` note: "Only CI migrates the shared DB."
- **Prompt:** none (B does it by hand; 3 commands): `gh secret set DATABASE_URL_SHARED --env shared-db`, merge, `gh run watch`.

---

### B-17 Performance and extraction measurement (with C)
- **Branch:** `b/eval-reader`. **Time:** 50 min. **Deps:** B-13, C's photos.
- **Files:** `scripts/perf-report.ts`, `scripts/eval-extraction.ts`, `data/eval/perf.json`, `data/eval/extraction.json`.

```text
CODING-AGENT PROMPT (B-17). git checkout -b b/eval-reader.
1. scripts/eval-extraction.ts: for each data/synthetic/bill-XX.png with a matching .json, run readBillPhoto (BB_READER_MODE from env; default live) then readerOutputToBill. Match extracted lines to expected by greedy pairing on (serviceDate, code, chargeCents), then units. Compute per bill and overall: expectedLines, extractedLines, matchedLines, lineRecall, linePrecision, fieldAccuracy for serviceDate, code, units, chargeCents (over pairs aligned by position), reconciliationOk. Write data/eval/extraction.json { generatedAt, model: "step-5-preview", mode, n, perBill, overall }.
2. scripts/perf-report.ts: run each photo once live, record latencyMs; run audit via createRouterClient on each seeded case 10 times, record durationMs; compute p50 and p90 (nearest-rank); write data/eval/perf.json { generatedAt, n, photoToLines: { p50Ms, p90Ms }, audit: { p50Ms, p90Ms } }.
3. Unit test the matching and percentile helpers (scripts/lib/metrics.ts + metrics.test.ts).
4. Run both scripts once live; commit outputs; gh pr create --fill. Tell C in chat: "extraction.json and perf.json ready, N=<n>, mode=<mode>".
Do not: run in cache mode and report it as live latency (mode is written into the file); round numbers up; drop failing bills from N.
Definition of done: both JSON files committed with real measured values and mode.
```

---

### B-18 published_price rule with C's captured price file
- **Branch:** `b/rule-published-price`. **Time:** 50 min. **Deps:** B-08, C's `data/hospitals/<slug>/prices.json` with `sourceUrl` and `capturedAt`.
- **Goal:** seed `hospital_price` from C's capture; `audit.run` passes matching prices; flag shows source link and capture date; savings range from reference prices.
- **Honesty:** the published-price flag uses the real captured file only. The synthetic demo bill names that real hospital only if C and the team agree the comparison is fair; otherwise the bill stays synthetic and the flag compares to the real public price with the hospital named as the price source. The "$1,700 to $2,400" figure stays illustrative until computed from the real file.

```text
CODING-AGENT PROMPT (B-18). git checkout -b b/rule-published-price. Read data/hospitals/*/prices.json (C's format; if the format differs from PublishedPrice, write packages/db/src/import/prices.ts to map it and report the mapping). Seed into hospital_price in seed.ts. In audit.run load prices where lower(hospital_name) = lower(bill hospital name) OR the case explicitly selected a price source hospital (add optional input priceSourceHospital to audit.run only if A/D need it; label contract). Add tests: no cash price -> no flag; charge equal to cash -> no flag; range computation with cash 480000, min negotiated 450000, max negotiated 520000 for a 690000 charge gives low 170000 high 240000 (fixture numbers). Integration test with a fixture price file under data/hospitals/test-fixture/. Commit "feat(core): published price lever"; push; gh pr create --fill.
Do not: invent prices; use a price without sourceUrl and capturedAt; call it an error (it is leverage: "Higher than the hospital's published price").
Definition of done: the hero bill shows the MRI flag with the real captured source and date.
```

---

### B-19 AI agent monitoring and the bug-via-trace story
- **Branch:** `b/obs-ai`. **Time:** 45 min. **Deps:** B-13.
- **Goal:** Sentry AI agent monitoring shows the StepFun calls; one real bug found through a trace is fixed and written up.
- **Steps:** look up at https://docs.sentry.io/platforms/javascript/guides/node/ai-agent-monitoring/ whether `openAIIntegration` (named in Sentry docs for Node) auto-instruments our OpenAI-SDK client in the TanStack Start/Nitro server on Vercel (UNVERIFIED in this setup). If it does, enable it with `recordInputs: false, recordOutputs: false` (no bill images in Sentry). If not, keep the manual `gen_ai.chat` spans from B-13 and add `Sentry.setConversationId(caseId)` (verified name) so spans group per case. Wrap `audit.run` as `gen_ai.invoke_agent`-style parent only if the docs' attribute names match the SDK version installed (Sentry docs differ across versions; check).
- **Bug story:** see section 9.3.

---

## 7. Docker strategy

- **One local DB per developer** (`db` service, port 5432, volume `bb-db`). Optional `db-test` (port 5433, tmpfs) via `docker compose --profile test up -d db-test` for integration tests that wipe data.
- **Migrations workflow:** change `packages/db/src/schema/app.ts` -> `bun db:generate` -> review SQL -> `bun db:migrate` locally -> commit migration with the PR. `bun db:push` is allowed only for quick local experiments; before opening a PR, reset and run `db:migrate` from scratch to prove the migration works.
- **Never `db:push` to shared.** Only CI `migrate-shared` (or B by hand, announced in chat) migrates Tiger Data. Migrations are additive only until after judging.
- **Conflicts:** two PRs that both generate a migration: the second rebases, deletes its generated migration and snapshot, regenerates. B reviews every PR touching `packages/db`.
- **Reset local:** `docker compose down -v && docker compose up -d db && bun db:migrate && bun db:seed`.
- **Inspect:** `docker compose exec db psql -U bb -d betterbill`.
- **CI:** Postgres service container (`timescale/timescaledb:latest-pg16`) in the `checks` job; `db:migrate` then `db:seed` then integration tests.
- **Port clash:** if 5432 is taken, set `ports: ["5434:5432"]` in a local `docker-compose.override.yml` (gitignored) and change `DATABASE_URL`.

---

## 8. CI/CD and testing details

| Layer | Command | Where | Gate |
|---|---|---|---|
| Lint and format | `bun x biome ci .` | `checks` | every PR |
| Types | `bun run check-types` | `checks` | every PR |
| Unit | `bun run test` (Vitest; `packages/core` with coverage thresholds; `packages/api` mocked tests) | `checks` | every PR |
| Contract | `packages/core/src/contract.test.ts`: every `data/synthetic/*.json` parses with `Bill`/`Eob`; every `data/cache/reader/*.json` `output` parses with `ReaderOutput`; `data/eval/results.json` parses with the eval schema | `checks` | every PR |
| Integration | `bun run test:integration` against the service container: stubs, seed idempotency, full loop, auth gating | `checks` | every PR |
| Build | `bun run build` | `checks` | every PR |
| E2E smoke | Playwright vs Vercel preview on `deployment_status` success | `e2e-preview` | required before merge after G1 (reviewer checks the run) |
| Migrations | `bun run db:migrate` with `DATABASE_URL_SHARED` | `migrate-shared` | push to `main` |
| Deploy | Vercel Git integration (preview per PR, production on `main`) | Vercel | automatic |
| Evaluation hook | `packages/core/src/eval.test.ts` reads `data/eval/results.json` if present and asserts: every metric has `n` and `generatedAt`; no metric value without `n` (prevents unmeasured numbers reaching the UI) | `checks` | every PR |

`deployment_status` checks are not attached to the PR's required checks automatically; reviewers confirm the e2e run is green (or B adds it as a required check if it reports on the PR head commit, UNVERIFIED).

Flaky-test rule: a flaky test is fixed or quarantined (`it.skip` with a ticket comment) within 30 minutes; never disable a whole job.

---

## 9. Observability plan

### 9.1 Spans per step (names fixed so traces are comparable)
| Request | Child spans |
|---|---|
| `orpc.bill.parsePhoto` | `reader.validate_input`, `reader.cache_lookup`, `gen_ai.chat` "chat step-5-preview" (per page), `reader.zod_parse`, `reader.retry` (if any), `reader.score_confidence`, `reader.reconcile`, `db.persist_bill` |
| `orpc.bill.parseText` | `parse.deterministic`, `gen_ai.chat` (cleanup, only if used), `reader.reconcile`, `db.persist_bill` |
| `orpc.bill.confirmLines` | `db.replace_lines`, `db.append_event` |
| `orpc.audit.run` | `db.load_case`, `rule.duplicate`, `rule.units`, `rule.eob_mismatch`, `rule.published_price`, `rule.missing_itemization`, `savings.compute`, `db.persist_flags`, `db.append_event` |
| A's routes | A adds `gen_ai.chat` for letters and `call.*` spans using the same pattern |

Rule spans are created in the router around each `detect*` call (core stays free of Sentry).

### 9.2 evlog wide event fields (one event per procedure call)
`procedure`, `caseId`, `userKind` (`anonymous` or `account` or `none`), `durationMs`, `outcome` (`ok` or error code), `bill.lineCount`, `bill.kind`, `bill.sourceKind`, `reader.mode`, `reader.model`, `reader.latencyMs`, `reader.cachedAt`, `reader.retries`, `reader.lowConfidenceCount`, `reconciliation.ok`, `reconciliation.diffCents`, `audit.flagCount`, `audit.flagsByLever` (object of counts), `savings.confirmedCents`, `savings.potentialLowCents`, `savings.potentialHighCents`, `audit.durationMs`. Errors via evlog `createError({ message, status, why, fix })` (verified API) so logs say what to do. Never: line descriptions, account numbers, images, letter text, phone numbers.

### 9.3 The "bug found via a trace" story (process, not a script)
We do not invent this. From 18:00 on, B keeps a short log in `docs/OBSERVABILITY.md`: time, trace link, what the trace showed, the fix PR. Candidates worth watching, because the spans and fields above would expose them:
- `reconciliation.diffCents` non-zero on a bill that should reconcile (for example a thousands separator or a credit line parsed wrong).
- `reader.retries > 0` frequently (prompt or schema mismatch).
- `gen_ai.chat` span dominating `bill.parsePhoto` time with `detail: "high"` (latency trade-off).
- `rule.units` firing on a line already flagged as duplicate (double counting).
At 01:00, B picks the clearest real one, links the trace and the fix PR, and gives C two sentences for the Devpost and pitch. If nothing real was found, we say "traces confirmed X worked" and do not claim a bug.

### 9.4 Sentry setup summary
Project: TanStack Start (`@sentry/tanstackstart-react`, beta). Tracing 100%. Logs via evlog drain (and SDK logger if enabled). AI monitoring: `gen_ai.chat` spans (auto or manual). Replay: our app only; default masking on; turn `replaysSessionSampleRate` down after judging. Source maps via the Vite plugin with `SENTRY_AUTH_TOKEN` in Vercel build env only. Release tagged with the Vercel commit SHA if the plugin supports it (UNVERIFIED). Demo prep at 08:00: saved Sentry search for `procedure:bill.parsePhoto` and one bookmarked full trace.

---

## 10. Strengthening options (pick one after G2; decide at 00:15 with the team)

Recommendation: **B1**, because StepFun is judged on reliability and user control, and B1 makes both visible. Pick B2 only if bbox quality from `step-5-preview` is poor in B-17 (then crops would look wrong).

### B1 Line confidence with source crops
- **Branch:** `b/line-crops`. **Time:** 2 h. **Deps:** B-13, B-15, D's `LineConfirmRow`.
- **Goal:** every photo-read line shows the cropped image region and a confidence dot; low-confidence lines are shown first and must be confirmed before audit.
- **Design:** crops are rendered client-side from the in-memory photo with a canvas and the normalized bbox (no image leaves the server or is stored). If bbox is null, show the full-width horizontal band estimated from line position (labelled "approximate area") or no crop. `bill.confirmLines` rejects (PRECONDITION_FAILED) if any `lowConfidenceLineIds` were not confirmed (client sends `confirmedLowConfidenceIds`).
- **Files:** `packages/ui/src/components/bb/LineCrop.tsx` (D reviews), `packages/core/src/parse/bbox.ts` (`toPixelRect(bbox, width, height, padding = 0.01): { x, y, w, h }`, tested), `packages/api/src/inputs.ts` (confirm input addition, label `contract`).
- **Acceptance:** on bill-01.png, each line shows a crop that contains its printed text (manual check on 10 lines; report how many were correct, honestly); low-confidence lines appear first with "Please check this line".

```text
CODING-AGENT PROMPT (B1). git checkout -b b/line-crops.
1. packages/core/src/parse/bbox.ts: toPixelRect(bbox: [number,number,number,number], width: number, height: number, padding = 0.01) returns integer { x, y, w, h } clamped to the image. Tests: full-image bbox, padding at edges, tiny bbox.
2. packages/ui/src/components/bb/LineCrop.tsx: props { imageUrl: string (object URL), bbox: [n,n,n,n] | null, alt: string }. Draws the crop into a canvas sized max 320x64 CSS px with devicePixelRatio scaling; when bbox is null renders nothing. Uses tokens only; rounded-lg border. alt text "Image of the bill line: <description>".
3. Add optional confirmedLowConfidenceIds: string[] to the bill.confirmLines input; handler rejects with PRECONDITION_FAILED "Please check the highlighted lines first." if any low-confidence id from the last parse is missing.
4. Integration test for the rejection. Biome, types, tests. Commit "feat: line confidence with source crops"; gh pr create --fill --label contract; ask D for review and mobile screenshots.
Do not: upload or store the image; show a crop when bbox is invalid; compute confidence in the UI.
Definition of done: demo bill shows crops and confidence; the low-confidence gate works.
```

### B2 Evidence packet export
- **Branch:** `b/evidence-packet`. **Time:** 2 h. **Deps:** B-10, A's letter and transcript.
- **Goal:** one share link (read-only page) and print-to-PDF with bill lines, flags with tiers and sources, savings method, approved letter, call transcript, and the case timeline.
- **Design:** new procedure `case.packet` (label `contract`) returning an aggregated `Packet` zod object; route `apps/web/src/routes/packet/$token.tsx` rendering it with print CSS (`@media print`); token = random 32-byte base64url stored on the case (`share_token`, additive migration), revocable. PDF via the browser's print dialog (no server PDF library, less risk).
- **Acceptance:** opening the link on another device shows the packet without login; revoked token returns 404; footer "BetterBill is informational, not legal or medical advice."; no account numbers beyond last 4.

```text
CODING-AGENT PROMPT (B2). git checkout -b b/evidence-packet.
1. Additive migration: case.share_token text null unique.
2. packages/core/src/schemas.ts: add Packet = { case: CaseSummary, bill: Bill, flags: Flag[], savings: Savings, actions: Action[], events: CaseEvent[], generatedAt: string } (label contract).
3. Procedures: case.share { caseId } -> { url } (protectedProcedure; creates token with crypto.randomBytes(32).toString("base64url")); case.revokeShare { caseId }; case.packet { token } -> Packet (public, 404 NOT_FOUND if unknown).
4. Route apps/web/src/routes/packet/$token.tsx: server-loads case.packet, renders sections with existing bb components (TierBadge, Money, ActivityTimeline), a "Print or save as PDF" button calling window.print(), and print styles hiding buttons.
5. Tests: integration for share, packet, revoke; Playwright test opens a packet URL on mobile and desktop.
6. Checks; commit "feat: evidence packet share link"; gh pr create --fill --label contract.
Do not: include full account or claim numbers; make tokens guessable; add a PDF library.
Definition of done: link works on a second phone; revoke works.
```

---

## 11. Fallbacks, cut order, and risks

**B cut order (cut from the top; never cut the hero path):**
1. Strengthening option (B1 or B2).
2. `published_price` rule (keep the captured price shown as context if C has it; otherwise drop the lever and say three levers).
3. Session Replay.
4. Model cleanup fallback in `parseText` (deterministic only; unknown formats get "Paste in the sample format or use a photo").
5. Multi-page photos (single page only).
6. Auth gating polish (keep: send and call require an account; drop `case.list`).

**Never cut:** photo to confirmed lines (live `step-5-preview`, cached fallback labelled), duplicate + units + eob_mismatch with evidence, savings summary, Sentry traces.

**Fallbacks**
| Failure | Fallback |
|---|---|
| StepFun down or slow (over 25 s) | Cached run for known demo photos, labelled "saved copy"; otherwise "Photo reading is offline. Paste the bill text instead." with the text path |
| Photo misread | User edits lines (always available); reconciliation warning forces review |
| bbox unreliable | Hide crops; keep confidence dots; choose B2 |
| Vercel preview broken | Roll back via Vercel "Promote" of the last good deployment; fix forward on a branch |
| Tiger Data unreachable | Point Vercel `DATABASE_URL` at a second Tiger service (create it at 07:00 as a standby, migrate and seed it); worst case, demo on `bun dev` locally with Docker and say so |
| Better Auth anonymous plugin issue | `user_id` null cases, claim by caseId after signup |
| evlog drain issue | Keep Sentry SDK tracing; drop the drain |
| CI red near freeze | Revert the last PR, never force-push `main` |

**Risks**
| Risk | Mitigation |
|---|---|
| Sentry TanStack Start SDK is beta and Vercel/Nitro serverless setup may differ | Start B-07 early (17:00); verify with a thrown error on preview, not only locally |
| Vercel request body limit for base64 photos (UNVERIFIED value) | Client compression to 1600 px JPEG; max 4 MB per page server check; test a 3-page upload on preview |
| Vercel function timeout for slow model calls (plan limits UNVERIFIED) | 25 s per-call timeout, cached fallback, one page at a time from the client if needed |
| Drizzle 1.0 rc and drizzle-kit quirks | Stay on the scaffolded versions; no upgrades during the event |
| Migration race with Vercel deploy | Additive migrations only |
| Model output not valid JSON | `json_object` mode, zod validation, one retry, deterministic text fallback |
| Double counting savings | Precedence rules in `computeSavings`, tested |
| Single point of failure (B) | AGENTS.md and this plan let a coding agent continue any ticket; B pairs with A at 20:00 on routes A needs |

---

## 12. Security and secrets

- All keys server-side: `STEPFUN_API_KEY`, `GEMINI_API_KEY`, `BETTER_AUTH_SECRET`, `POLAR_ACCESS_TOKEN`, `SENTRY_AUTH_TOKEN`, `DATABASE_URL`. Only `VITE_SENTRY_DSN` (a DSN is designed to be public) goes to the client. Varlock schema marks keys `@sensitive`; a CI grep step can fail the build if `STEPFUN` appears in `apps/web/dist` client assets (add in B-13 if time).
- Model calls only from oRPC handlers. No browser calls to StepFun or Gemini.
- Synthetic or public data only. Fixture hospital names end with "(synthetic)". No real patient documents, ever; the upload screen says "Demo: use a sample bill".
- Minimal retention: photos are never stored (only sha256 for cache lookup of synthetic images); `line` rows hold extracted text; account and claim refs masked to last 4 at parse time. Purge after the event: `TRUNCATE case_event, flag, action, line, bill, eob, "case" CASCADE;` (TRUNCATE bypasses the row-level append-only trigger by design; run by B only).
- Logs and traces: no PII fields (section 9.2); Sentry `sendDefaultPii` false, `recordInputs/recordOutputs` false for AI spans, Replay masking on.
- Adapter: `/api/v1` mutating procedures require `x-bb-adapter-key` when called without a session; key in Vercel env and A's Agentverse secrets only.
- Auth: Better Auth secret 32+ random bytes; cookies default secure settings from the scaffold; never log sessions.
- Repo is public: run `git log -p | grep -iE "sk-|api[_-]?key|postgres(ql)?://[^b]"` before 09:00. If a key leaks, rotate first, then clean history.
- Every outbound action needs an approval `case_event` (A enforces in `action.send` and `call.start`; B's integration test asserts the event exists before `sent`).

---

## 13. UNVERIFIED items

1. Exact files the new scaffold generates with `--auth better-auth --payments polar --addons turborepo biome evlog` (for example a `packages/auth` package, where evlog is wired, turbo task names). Confirm in B-01 step 2.
2. Better Auth anonymous plugin user-table field name (likely `isAnonymous`) and the exact `onLinkAccount` argument shape. Read the regenerated schema and log in dev.
3. Better Auth CLI `--dialect` value for Postgres with the Drizzle adapter.
4. Sentry TanStack Start SDK (beta) behaviour on Vercel with Nitro: whether the serverless import of `instrument.server.mjs` in `src/server.ts` captures server spans, and whether the scaffold has `src/server.ts`, `src/start.ts`, `src/client.tsx` or they must be created.
5. Whether Sentry `openAIIntegration` auto-instruments the OpenAI SDK pointed at StepFun in this runtime; exact current `gen_ai.*` attribute names for the installed SDK version (Sentry docs differ across versions).
6. Whether `enableLogs` is the right option for the server SDK version installed, and release tagging via the Vite plugin.
7. evlog Nitro v3 module placement when Nitro is configured through `nitro/vite` inside `vite.config.ts` (the scaffold's evlog addon may already handle it).
8. `step-5-preview` quality for row bounding boxes and self-reported confidence; latency with `detail: "high"`; rate limits and quotas for our key.
9. Vercel request body size limit and function max duration on our plan, for base64 photos and slow model calls.
10. Tiger Data plan connection limits and whether the pooler URL is needed for serverless; port is per service.
11. `drizzle-kit generate --custom` availability in drizzle-kit 1.0.0-rc.
12. GitHub Actions: `hashFiles` in a job-level `if`; whether `deployment_status` e2e results can be required checks on PRs.
13. oRPC OpenAPI reference plugin default spec path, and exact JSON body mapping for the Python adapter (verify with a curl in B-05).
14. Varlock behaviour in CI when required env keys are placeholders (B-02 sets dummy values).
15. Gemini model id for text cleanup (only if used; take it from A's code, never guess).
16. Fonts and other D-owned package names are out of B's scope (see shared context 8.2).

Verified in this session (official docs, 2026-10-17): StepFun chat completions endpoint, auth header, `step-5-preview` model id with image input, image_url part format, `json_object` response format, OpenAI SDK base URL; Better Auth anonymous plugin imports and methods; Sentry TanStack Start package, file names, Vite plugin, wrappers; evlog package, `createSentryDrain` from `evlog/sentry`, Nitro v3 integration, `createError`; oRPC default OpenAPI mapping (`POST /<router>/<procedure>`) and `.route({ method, path })`; Vercel protection bypass header and Playwright example; Tiger Cloud connection string pattern with `sslmode=require` and per-service ports.
