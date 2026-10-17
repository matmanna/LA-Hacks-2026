# BetterBill: Shared Context and Binding Conventions (all four plans follow this)

Read this first. Every agent plan (`A-*.md`, `B-*.md`, `C-*.md`, `D-*.md`) builds on it. If a plan and this file disagree, this file wins until the team changes it in a PR.

Related files (absolute paths):
- Team brief: `/home/matmanna/projects/lahacks/plans/00-team-brief.md`
- Design doc (earlier name "Redline"; same product): `/home/matmanna/projects/lahacks/bill-audit-design-doc.md`
- PRD: `/home/matmanna/projects/lahacks/bill-audit-prd.md`
- Earlier Exit Grade and dark-pattern work (not used here): `/home/matmanna/projects/lahacks/escape-hatch-spec.md`
- UI reference screenshots (Goodbill, for flow and density only, do not copy): `/tmp/claude-1000/-home-matmanna-projects-lahacks/629bd265-8282-4b48-97c2-075d7ec3e542/images/2.png` (mobile balance card), `.../images/3.png` (bill activity timeline), `.../images/4.png` (desktop "Your bill" table)

---

## 1. Product in one paragraph

BetterBill is a self-serve, evidence-first hospital bill checker. A patient photographs or pastes a bill. BetterBill reads every line, asks the patient to confirm the lines, audits them with a deterministic rules engine, shows each flag with its evidence tier, estimates savings as a range, checks the hospital's financial assistance policy, drafts the dispute letter, and, after explicit approval, places a call to the billing office. Everything is traced. Demo data is synthetic or comes from real public sources (hospital price files, published news cases). Nothing is medical or legal advice.

**Hero path (never cut):** photo or text in, confirmed lines, at least three rule levers with evidence (duplicates, units, bill vs EOB; published price is the fourth), savings summary, one approved letter, Sentry traces.

---

## 2. Roles (after the demo change)

| Role | Name | Owns | Builds until |
|---|---|---|---|
| **A** | Conversation and actions | Chat flow, approval sheet logic, letter generation, test-inbox send, outbound call, transcript, Fetch adapter (gated), Fetch submission | 09:00 freeze |
| **B** | Bill intelligence and platform | Scaffold, repo, CI/CD, Docker, auth, evlog, Sentry, Vercel, Drizzle schema, oRPC routes, bill reader (step-5-preview and text), rules engine, savings math | 09:00 freeze |
| **C** | Evidence, data, and demo lead | Synthetic bills and EOBs, rule tables with sources, Browser Use capture of real hospital data, assistance screener, evaluation metrics, Bill of the Month benchmark, wording rules, then **demo script, rehearsal, video, Devpost, pitch, submission** | Evidence until about 01:00, then demo full-time |
| **D** | Experience and brand | Design system, Paper frames, all app UI (mobile-first plus desktop insights), onboarding UI, consumer landing page, insurer/plan landing page, redline view or share card, domain | 09:00 freeze |

---

## 3. Clock (PDT)

| Time | Milestone |
|---|---|
| Sat 14:40 to 16:00 | Foundation |
| **16:00 G0** | A phone loads the Vercel preview; contracts merged |
| **17:00 Fetch gate** | Agent answers in ASI:One and reaches the core API, or Fetch is dropped |
| 16:00 to 20:00 | Core loop |
| **20:00 G1** | Paste a bill, see flags with evidence on a phone; show at 2 to 3 booths |
| 20:00 to 00:00 | Action loop |
| **00:00 G2** | Photo in, flags, letter approved and sent. Strengthening options start only after this |
| 00:00 to 03:00 | Hero features and pick-one options |
| 03:00 to 07:00 | Sleep in two shifts; one person keeps main green |
| 07:00 to 09:00 | Proof and polish |
| **09:00 Freeze** | Fixes only |
| 10:30 | Devpost submitted (C) |
| 11:30 | Fetch Submission Agent done if Fetch is in (A) |
| 12:00 | Submission deadline |
| 12:30 | Judging |

---

## 4. Stack (verified by Better-T-Stack dry run on 2026-10-17)

| Layer | Choice |
|---|---|
| App and API | TanStack Start full stack (`--backend self`), oRPC (typed routes; OpenAPI handler available for the Python adapter) |
| Data | PostgreSQL + Drizzle. Local: Docker. Shared: Tiger Data Postgres (MLH) |
| Auth and money | Better Auth; Polar (assisted-call tier, sandbox only) |
| Repo and logs | Turborepo + Biome; evlog addon; Sentry |
| UI | Tailwind 4 + shadcn (style `base-lyra`, CSS variables, lucide icons), shared in `packages/ui` |
| Hosting | Vercel, one deployment |
| AI | StepFun `step-5-preview` (bill photo reading), Gemini (letter drafting, text cleanup) |
| Real data | Browser Use (hospital price file and financial assistance policy) |
| Voice | Photon (call, SMS), ElevenLabs (voice) |
| Fetch adapter | Thin Python uAgents service calling oRPC over HTTP. No business logic there |

Scaffold command (dry run passed, including `evlog`):
```
cd /home/matmanna/projects/lahacks
bun create better-t-stack@latest betterbill \
  --frontend tanstack-start --backend self --runtime none \
  --api orpc --database postgres --orm drizzle \
  --db-setup none --manual-db \
  --auth better-auth --payments polar \
  --addons turborepo biome evlog --examples none \
  --web-deploy vercel --server-deploy none \
  --package-manager bun --git --install \
  --no-render-title --disable-analytics --directory-conflict error
```
Notes:
- The CLI warned that Bun 1.4+ is recommended (installed: 1.3.12). It still accepted the config. Upgrading is optional.
- The earlier partial scaffold at `/home/matmanna/projects/lahacks/redline` was deleted on 2026-10-17 at the user's request. Ignore any plan step about deciding whether to remove it.
- The earlier scaffold showed shadcn at `packages/ui/src/components` with `globals.css` at `packages/ui/src/styles/globals.css` and aliases like `@<project>/ui/components`. Expect `@betterbill/ui/...` after regenerating. Confirm after scaffolding.

---

## 5. Repo layout (target)

```
betterbill/
  apps/web/                 TanStack Start app (routes, UI composition, server functions)
  packages/api/             oRPC routers (thin: validate, call core, persist)
  packages/core/            NEW. Pure TypeScript: zod schemas, rules engine, savings math, formatting. No IO. 100% unit tested
  packages/db/              Drizzle schema, migrations, seed
  packages/ui/              shadcn components + BetterBill domain components + tokens
  packages/config/          shared TS config
  data/
    synthetic/              10 synthetic bills + EOBs (JSON + rendered PNG/PDF) with expected flags
    benchmark/              Bill of the Month recreations + reporter findings
    hospitals/              captured price files and policies (with capture metadata)
    eval/                   evaluation outputs (results.json), consumed by UI and pitch
  agents/fetch-adapter/     Python uAgents (only if the Fetch gate passes)
  e2e/                      Playwright smoke tests (mobile + desktop)
  docs/                     ARCHITECTURE.md, DESIGN.md, DEMO.md, EVAL.md, ONBOARDING.md
  docker-compose.yml
  AGENTS.md                 operating rules for coding agents (copy section 13 below)
  .github/workflows/ci.yml
  .env.example
```
Reuse from `github.com/matmanna/callcoach` (conventions only): pure rule functions in their own package, shared zod schemas validating inputs and model outputs, append-only audit records (corrections are new entries), synthetic data only, Docker Compose for the local DB, Vitest, `AGENTS.md` with repository operating principles.

---

## 6. Data contracts (owned by B, created in the first PR, change only by PR)

All money is **integer cents**. All times are ISO 8601 UTC strings. All ids are strings (cuid2 or uuid).

```ts
// packages/core/src/schemas.ts (zod)
Line = {
  id: string,
  serviceDate: string | null,       // YYYY-MM-DD
  description: string,              // as printed
  code: string | null,              // e.g. "85025"
  codeType: "CPT" | "HCPCS" | "REV" | "OTHER" | null,
  units: number,                    // default 1
  chargeCents: number,              // integer
  source: { page: number, bbox: [number, number, number, number] | null }, // normalized 0..1
  confidence: number,               // 0..1 from the reader
  userEdited: boolean
}
Bill = {
  id: string,
  hospital: { name: string, city: string | null, state: string | null },
  statementDate: string | null,
  accountRefMasked: string | null,  // last 4 only
  kind: "itemized" | "summary",
  sourceKind: "photo" | "text" | "pdf",
  lines: Line[],
  totals: { chargesCents: number, adjustmentsCents: number, paidCents: number, dueCents: number }
}
Eob = { payer: string, claimRefMasked: string | null, patientResponsibilityCents: number, lines?: { code: string | null, allowedCents: number | null, patientCents: number | null }[] }
Lever = "duplicate" | "units" | "eob_mismatch" | "published_price" | "assistance" | "missing_itemization"
Tier  = "confirmed" | "rule" | "published" | "estimate"
Flag = {
  id: string, lineIds: string[], lever: Lever, tier: Tier,
  title: string,           // plain language, <= 60 chars
  explanation: string,     // plain language, <= 2 sentences, grade 6 to 8
  amountCents: number,     // amount at stake
  evidence: { kind: "arithmetic" | "rule" | "quote" | "price_file", detail: string, quote?: string, sourceUrl?: string, capturedAt?: string },
  confidence: number
}
Savings = {
  confirmedCents: number,
  potentialLowCents: number, potentialHighCents: number,
  assistance: { status: "likely" | "possible" | "unlikely" | "unknown", quote?: string, sourceUrl?: string, capturedAt?: string },
  method: string[]         // one plain line per lever used
}
// Added after plan review (D needs it, B implements in packages/core, returned by audit.get):
BalanceSummary = {
  billedCents: number,            // bill.totals.dueCents
  fairBalanceCents: number,       // billed minus confirmed minus potentialLow
  fairBalanceLowCents: number,    // billed minus confirmed minus potentialHigh
  lessThanBilledCents: number,    // billed minus fairBalance, positive
  isEstimate: boolean             // true whenever potential or assistance is included
}
CaseStatus = "new" | "lines_confirmed" | "audited" | "action_pending" | "sent" | "called" | "closed"
CaseEvent = { id: string, caseId: string, at: string, actor: "user" | "agent" | "system", type: string, summary: string, artifactRef?: string } // append-only
Action = { id: string, caseId: string, kind: "letter" | "itemized_request" | "call", draft: string, recipient: string, approvedAt: string | null, sentAt: string | null, outcome: string | null }
```

oRPC procedures (names are binding; B implements, A and D consume):
`case.create`, `case.get`, `case.list`, `bill.parseText`, `bill.parsePhoto`, `bill.confirmLines`, `audit.run`, `audit.get`, `assistance.check`, `action.draftLetter`, `action.approve`, `action.send`, `call.start`, `call.status`, `event.list`, `eval.results`.

---

## 7. The numbers that matter

| Number | Value | Status | Owner |
|---|---|---|---|
| Insured adults who got a bill they thought insurance should cover | "Close to half (45%) of insured adults ages 19 to 64 got a medical bill in the past year they thought insurance should have covered." Footnote: Commonwealth Fund Health Care Affordability Survey 2023 (n = 5,602), published Aug 1, 2024. **Never say "insured workers."** Use plan C section 4 wording for the challenged and reduced shares | 45% verified by plan C from the Commonwealth Fund release; other shares per plan C section 4 | C |
| Goodbill fee | 20% of savings, capped at $1,000; nothing if no savings | Verified on Goodbill's help center 2026-10-17 | C |
| Goodbill scope | Hospital bills only, unpaid only, not collections | Verified on Goodbill's FAQ 2026-10-17 | C |
| Demo bill | Synthetic $12,000 hospital bill | Synthetic | C |
| Duplicate example | CBC w/ differential (85025) $84.00 twice, same date | Synthetic. The duplicate line is confirmed from the bill, but CMS limits allow up to 4 per day for 85025 (plan C), so the wording **asks, not accuses**: "Listed twice on the same date. Ask billing whether you had two tests." | C |
| Published-price example | MRI lumbar no contrast (72148) billed $6,900 (synthetic) vs Cedars-Sinai's published outpatient discounted cash price $5,143.15 (price file last updated 2025-11-26) | **Preliminary** (partial read, no full-file hash yet). Say nothing numeric until plan C ticket C-05 captures it with date and hash. LA General's file has no cash prices. Team decides by G0 whether the demo bill names Cedars-Sinai | C |
| Savings shown | Whatever `audit.run` returns for the demo bill, labelled by tier. Do not reuse the brief's "$1,700 to $2,400". If the Cedars figure holds, the published-price gap alone is $1,756.85 | Computed, not written by hand | B, C, D |
| Seeded-error recall | Measured on 10 synthetic bills | Must be measured, never assumed | C |
| False flags on clean bills | Measured | Must be measured | C |
| Bill of the Month recall | Measured on 5 to 8 recreated published bills | Must be measured | C |
| Line extraction accuracy | Measured on photos of synthetic bills | Must be measured | B, C |
| Photo to confirmed lines time | Target under 30 s (p50) | Target, measure | B |
| Audit time after confirm | Target under 2 s (deterministic) | Target, measure | B |
| Letter draft time | Target under 15 s | Target, measure | A |
| Mobile page load | Target LCP under 2.5 s on throttled 4G | Target, measure | D |
| Prizes | Paper $1,500 / $1,000 / $500 (verified on Paper's page); Fetch $1,500 / $1,000 / $500 (team figure); Sentry interview per member | Mixed | C |

Rule: a target is never presented as a result. Every number in the UI or pitch shows its source or says "measured on N bills, date."

---

## 8. Design system (binding; D owns, everyone uses)

**Personality:** calm, clinical-clean, warm, money-positive. Plain words. Generous white space. One strong number per screen. Never alarming.

**Distinct from Goodbill.** Goodbill uses an indigo/violet gradient balance card, teal savings, coral errors. BetterBill uses an **ink-navy balance card with mint**, cobalt actions, and a serif display face. Do not copy Goodbill's layouts, copy, illustrations, or brand.

### 8.1 Color tokens (light theme; dark theme optional later)
Put these in `packages/ui/src/styles/globals.css` as shadcn CSS variables (hex is fine in Tailwind 4; convert to oklch if preferred).

| Token | Hex | Use |
|---|---|---|
| `--background` | `#FFFFFF` | Page |
| `--foreground` | `#0B1B2B` | Ink text |
| `--card` | `#FFFFFF` | Cards |
| `--muted` | `#F4F6FA` | Surfaces, table header, sheet background |
| `--muted-foreground` | `#5B6B7C` | Secondary text |
| `--border` | `#E3E8EF` | Hairlines |
| `--primary` | `#1E4ED8` | Cobalt: primary buttons, links, focus |
| `--primary-foreground` | `#FFFFFF` | |
| `--secondary` | `#EEF2FF` | Secondary buttons |
| `--secondary-foreground` | `#1E3A8A` | |
| `--destructive` | `#E5484D` | Coral: errors, flagged amounts |
| `--ring` | `#1E4ED8` | Focus ring |
| `--radius` | `16px` | Base radius |
| `--ink` | `#0B1B2B` | Balance card background |
| `--mint` | `#0F9D76` | Savings numbers, success, checks |
| `--mint-soft` | `#D1FAE5` | Savings chip background (text `#065F46`) |
| `--coral-soft` | `#FDECEC` | Flag icon background (text `#B4232A`) |
| `--amber-soft` | `#FEF3C7` | Estimate tier background (text `#92400E`) |
| `--slate-soft` | `#EEF2F6` | Rule tier background (text `#334155`) |

Text-color tokens (added after plan review, for AA contrast): `--mint-ink #065F46`, `--coral-ink #B4232A`, `--amber-ink #92400E`, `--slate-ink #334155`. Use `text-coral-ink` for flagged amounts at any size and `text-mint-ink` for small savings text; `#E5484D` and `#0F9D76` are for icons, fills, and large numbers only. Radius scale is set explicitly so `rounded-2xl` equals `--radius` (16 px); see plan D.

Tier badges (icon plus label, never color alone):
| Tier | Label | Badge | Icon (lucide) |
|---|---|---|---|
| confirmed | "Confirmed from your bill" | mint-soft / `#065F46` | `BadgeCheck` |
| rule | "Billing rule" | slate-soft / `#334155` | `BookOpen` |
| published | "Hospital's published price" | secondary / `#1E3A8A` | `Landmark` |
| estimate | "Estimate" | amber-soft / `#92400E` | `CircleDashed` |

### 8.2 Typography
- UI: **Geist Sans** (variable). Display: **Instrument Serif** for landing headlines and the balance title only. Numbers: always `tabular-nums`.
- Packages: try `@fontsource-variable/geist` and `@fontsource/instrument-serif` (verify names on npm; fall back to Google Fonts links).
- Mobile scale (Tailwind classes): display `text-[40px] leading-[44px] font-serif`; h1 `text-[28px] leading-[34px] font-semibold tracking-[-0.01em]`; h2 `text-[22px] leading-[28px] font-semibold`; h3 `text-lg leading-6 font-semibold`; body `text-base leading-6`; small `text-sm leading-5`; caption `text-xs leading-4 text-muted-foreground`.
- Desktop (`lg:`): display `lg:text-[64px] lg:leading-[68px]`; h1 `lg:text-[36px] lg:leading-[42px]`.
- Money: `<Money cents={...} />` renders `$2,609` with cents as `<sup class="text-[0.55em] align-top ml-0.5">.37</sup>`. Negative savings show as `−$1,022.47` using the true minus sign U+2212.

### 8.3 Spacing, radius, elevation, motion
- 4 px grid. Screen padding `px-5` mobile, `md:px-8`, content max width `max-w-6xl` (1152 px) on desktop.
- Card: `rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(11,27,43,0.06),0_8px_24px_rgba(11,27,43,0.06)]`.
- Buttons: height 48 px mobile (`h-12`), 44 px desktop (`lg:h-11`), `rounded-xl`, full width on mobile for primary actions.
- Pills and chips: `rounded-full px-2.5 py-1 text-xs font-medium`.
- Motion: 150 to 250 ms ease-out; sheets slide 250 ms; respect `prefers-reduced-motion`.
- Icons: lucide, 20 px, stroke width 1.75.

### 8.4 Components
shadcn base: Button, Card, Badge, Sheet, Dialog, Tabs, Table, Accordion, Progress, Skeleton, Sonner (toast), Input, Textarea, Label, Tooltip, Popover, Avatar, Separator, Alert, Checkbox, DropdownMenu.

BetterBill domain components (in `packages/ui/src/components/bb/`), owned by D, consumed by A and B:
| Component | Purpose |
|---|---|
| `Money` | Formatted cents with superscript cents and tabular numbers |
| `BalanceCard` | Ink card: hospital name, "Your fair balance", big number, mint chip "−$X less than billed" |
| `SavingsBar` | Sticky bottom bar on mobile: confirmed + potential range + primary action |
| `FlagRow` | Icon, plain title, one-line explanation, amount in coral, tier badge, chevron |
| `TierBadge` | Section 8.1 table |
| `EvidenceSheet` | Bottom sheet (mobile) or right side sheet (desktop): what we found, why, source with link and capture date, "what to say to billing" |
| `LineConfirmRow` | Extracted line, crop thumbnail, confidence dot, edit inline |
| `UploadPanel` | Camera capture, gallery, paste text, sample bill button |
| `ApprovalSheet` | Exact text to be sent or said, recipient, data shared, Approve and Cancel |
| `ActivityTimeline` | Vertical timeline with mint check circles, current step card, timestamps |
| `BillTable` | Desktop: Item, Tier, Amount, Potential savings, chevron |
| `ComparePriceBar` | Two bars: "As billed" vs "Hospital's published cash price", with source |
| `EmptyState`, `ErrorState`, `LoadingState` | Consistent states |

### 8.5 Layouts
- **Mobile first (360 to 430 px):** single column; top app bar 56 px; sticky `SavingsBar` 64 px plus `env(safe-area-inset-bottom)`; evidence in bottom sheets; one primary action per screen.
- **Tablet (`md:` 768 px):** two columns where it helps (flags and summary).
- **Desktop (`lg:` 1024 px+), "full insights":** 12-column grid. Left 8 columns: `BillTable` with every line and savings. Right 4 columns, sticky: `BalanceCard`, savings breakdown, actions, `ActivityTimeline`. Evidence opens as a right side sheet. Same components as mobile, different composition. No desktop-only features beyond density.
- **Patients first:** jargon explained inline ("Unbundling: billed separately for things usually billed together"); no tables on mobile; at most 3 flags shown before "See all".

### 8.6 Copy rules
- Second person, plain words, grade 6 to 8, sentences under 20 words.
- Never say "illegal," "fraud," or "overcharge" as a conclusion. Say "looks wrong," "doesn't match," "higher than the hospital's own published price."
- Every amount shows its tier. Every estimate says "estimate."
- Footer of every result screen: "BetterBill is informational, not legal or medical advice."
- Primary CTAs: "Check my bill", "Looks right", "Send the letter", "Call for me", "Approve and send".
- Never invent testimonials, press logos, customer counts, partner names, or compliance badges. Use honest placeholders ("Pilot partners wanted").

### 8.7 Accessibility
WCAG AA contrast; 44 px minimum targets; visible focus (`ring-2 ring-ring ring-offset-2`); money read aloud with context (`aria-label="Duplicate charge, 84 dollars"`); tiers carry icon and text; forms have labels; no hover-only actions.

---

## 9. Git, branches, and PRs (incremental by rule)

- `main` is protected: PRs only, CI must pass, one approval from any teammate (review within 10 minutes; reviewer checks mobile screenshot and tests).
- Branches: `a/<feature>`, `b/<feature>`, `c/<feature>`, `d/<feature>`.
- **One feature per PR, opened as soon as the feature works.** Target under 400 changed lines. Merge at least every 2 hours. Rebase on `main` before opening.
- Conventional commit titles: `feat(core): duplicate rule`, `fix(web): sheet scroll on iOS`.
- PR template (`.github/pull_request_template.md`): What, Why, Screens (mobile 390 px and desktop 1280 px), Tests added, Contract changes (yes/no), Checklist (Biome, types, tests, no secrets, copy rules, a11y).
- Contract changes (`packages/core/src/schemas.ts`, oRPC names) need a PR tagged `contract` and a heads-up in chat.
- Squash merge. Delete branch after merge.

---

## 10. Local development with Docker (before anything touches shared data)

```yaml
# docker-compose.yml
services:
  db:
    image: timescale/timescaledb:latest-pg16   # mirrors Tiger Data (Postgres + Timescale); plain postgres:16 also works
    environment:
      POSTGRES_USER: bb
      POSTGRES_PASSWORD: bb
      POSTGRES_DB: betterbill
    ports: ["5432:5432"]
    volumes: ["bb-db:/var/lib/postgresql/data"]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U bb"], interval: 5s, retries: 10 }
volumes: { bb-db: {} }
```
- Local `DATABASE_URL=postgres://bb:bb@localhost:5432/betterbill`.
- On a feature branch: `docker compose up -d db`, `bun db:push` (local only), `bun db:seed`.
- Schema changes: `bun db:generate` to create a migration, commit it with the PR. **Never run `db:push` against the shared Tiger Data database.** Only CI on `main` (or B, manually) runs `bun db:migrate` against the shared database.
- Reset local: `docker compose down -v && docker compose up -d db && bun db:push && bun db:seed`.
- CI runs its own Postgres service container for integration tests.

---

## 11. CI/CD and testing

GitHub Actions `.github/workflows/ci.yml` on every PR and on `main`:
1. Setup Bun (pin 1.3.12 or newer), `bun install --frozen-lockfile`.
2. `bun x biome ci .`
3. `bun run check-types` (Turborepo)
4. Unit tests: `bun run test` (Vitest) for `packages/core` (rules, savings, formatting, schemas).
5. Integration tests with a Postgres service container: oRPC procedures against a seeded database.
6. `bun run build`.
7. E2E smoke (Playwright) against the Vercel preview URL (trigger on `deployment_status`) or a local `build && start`: mobile (iPhone 14 viewport) and desktop (1280x800).
8. On `main` only: `bun db:migrate` against Tiger Data (secret `DATABASE_URL_SHARED`), then Vercel production deploy (Vercel Git integration).
9. Python adapter (if Fetch is in): `ruff check` and `pytest` in `agents/fetch-adapter`.

Test layers:
| Layer | What | Owner |
|---|---|---|
| Unit | Each rule on golden synthetic bills, savings math, Money formatting, zod round-trips | B |
| Contract | Zod parse of every fixture in `data/synthetic` and model outputs | B, C |
| Integration | `bill.parseText` to `audit.run` to `action.draftLetter` on seeded DB | B, A |
| E2E smoke | Landing loads; sample bill to flags visible; evidence sheet opens; approval sheet shows exact text; desktop table renders | D, A |
| Evaluation | Recall, false flags, extraction accuracy, Bill of the Month; writes `data/eval/results.json` | C |
| Live checks | Browser Use capture, StepFun call, Photon call (manual, logged, cached) | C, B, A |

Smoke test must pass before every merge to `main` after G1.

---

## 12. Secrets and safety

- `.env` local only; `.env.example` lists names. Vercel holds deploy values; GitHub holds CI values.
- All model, voice, and telephony calls are **server-side** (oRPC handlers). No keys in client code.
- Synthetic or public data only. No real patient documents. No real hospital calls in the demo: calls go to a phone held by a teammate or a judge who agreed.
- Calls open with: "Hi, this is an automated assistant calling on behalf of a patient." Only minimum data is spoken.
- Every outbound action needs an explicit approval event in `CaseEvent`.

---

## 13. AGENTS.md (copy into the repo root)

```
# BetterBill agent rules
- Read docs/ARCHITECTURE.md and plans/00-shared-context.md before changing code.
- Business logic lives in packages/core (pure, tested). Routers in packages/api are thin. UI never computes savings.
- Money is integer cents. Use <Money/> to display it.
- Use shadcn components from @betterbill/ui and BetterBill domain components in packages/ui/src/components/bb. Do not add other UI libraries.
- Follow the design tokens and copy rules in the shared context. Mobile first, then lg: desktop.
- Every PR: one feature, tests, mobile and desktop screenshots, Biome clean, types clean.
- Never run db:push against a non-local database. Use Docker for local Postgres.
- Never commit secrets. Never put API keys in client code.
- Never invent statistics, testimonials, logos, or compliance claims.
- Wording: never "illegal", "fraud", or "overcharge" as a conclusion. Always show the evidence tier.
```

---

## 14. Onboarding

### 14.1 Team onboarding (15 minutes per person)
1. Accounts: GitHub repo access, Vercel team, Sentry project, Tiger Data (B), StepFun key (B), Gemini key (A), Photon beta and ElevenLabs (A), Browser Use (C), Polar sandbox (D), Paper with code `LAHACKS26` (D), Fetch Agentverse (A).
2. Tools: Bun 1.3.12+, Docker, Git, GitHub CLI, Node 22 (optional), Python 3.11 + uv (A only), Playwright browsers (`bunx playwright install`).
3. `git clone`, `bun install`, `cp .env.example .env`, `docker compose up -d db`, `bun db:push`, `bun db:seed`, `bun dev`. Open the URL the dev server prints.
4. Open the sample case; confirm you can see flags on your phone over the Vercel preview.
5. Read `AGENTS.md`, `docs/DESIGN.md`, and your role plan.

### 14.2 Patient onboarding (product)
- First run: three short cards ("Snap your bill", "See what looks wrong, with proof", "You approve everything we send"), then the upload screen. Skippable.
- Privacy promise up front: "We only use your bill to check it. We never sell your data." (Demo uses synthetic bills.)
- Value before signup: the audit works without an account. Saving the case, sending a letter, or calling asks the user to create an account (Better Auth).
- A "Try a sample bill" button for judges and first-time visitors.

---

## 15. Reference: Goodbill patient flow (for structure, not copying)

From goodbill.com/patients (read 2026-10-17): hero "we negotiate hospital bills for you" with a free-start CTA; press and testimonials; value section with a sample bill and pricing (20% of savings); three numbered steps (they get the itemized bill, the patient shares medical records for coder review, they negotiate and send updates via a "bill activity" timeline); trust section (mission, team, security); closing CTA; footer with compliance badges. Signup starts with picking a hospital.

BetterBill's flow differs: self-serve and instant (snap or paste, confirm lines, see evidence now), the user approves each action, the audit is free, and assisted calls are an optional paid tier. We do not claim negotiating power, press, or compliance we do not have.

---

## 16. Plan files

- `/home/matmanna/projects/lahacks/plans/A-conversation-actions.md`
- `/home/matmanna/projects/lahacks/plans/B-bill-intelligence-platform.md`
- `/home/matmanna/projects/lahacks/plans/C-evidence-data-demo.md`
- `/home/matmanna/projects/lahacks/plans/D-experience-landing.md`
