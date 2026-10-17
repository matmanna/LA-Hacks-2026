# Onboarding (15 minutes)

1. **Accounts:** GitHub repo access, Vercel team, Sentry project, Tiger Data (B), StepFun key (B), Gemini key (A), Photon beta and ElevenLabs (A), Browser Use (C), Polar sandbox (D), Paper with code `LAHACKS26` (D), Fetch Agentverse (A).
2. **Tools:** Bun 1.3.12+, Docker, Git, GitHub CLI, Node 22 (optional), Python 3.11 + uv (A only), Playwright browsers (`bunx playwright install`).
3. **Run it:**
   ```
   git clone <repo url> && cd betterbill
   bun install
   cp .env.example apps/web/.env      # fill in values; never commit
   docker compose up -d db
   bun db:push                          # local database only
   bun dev
   ```
   Open the URL the dev server prints. (`bun db:seed` arrives with ticket B-06.)
4. **Check on a phone** over the Vercel preview once B-04 is merged.
5. **Read** `AGENTS.md`, `docs/plans/00-shared-context.md`, and your role plan in `docs/plans/`.
6. **Start your agent** from the repo root. Claude Code loads `CLAUDE.md`, which imports `AGENTS.md` and the shared context.
