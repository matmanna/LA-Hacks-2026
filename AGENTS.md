# BetterBill agent rules

Before any task, read docs/plans/00-shared-context.md and your role plan in docs/plans/ (A-conversation-actions.md, B-bill-intelligence-platform.md, C-evidence-data-demo.md, or D-experience-landing.md). The shared context wins on conflicts.

- Read docs/ARCHITECTURE.md (once it exists) and docs/plans/00-shared-context.md before changing code.
- Business logic lives in packages/core (pure, tested). Routers in packages/api are thin. UI never computes savings.
- Money is integer cents. Use <Money/> to display it.
- Use shadcn components from @betterbill/ui and BetterBill domain components in packages/ui/src/components/bb. Do not add other UI libraries.
- Follow the design tokens and copy rules in the shared context. Mobile first, then lg: desktop.
- Every PR: one feature, tests, mobile and desktop screenshots, Biome clean, types clean.
- Never run db:push against a non-local database. Use Docker for local Postgres.
- Never commit secrets. Never put API keys in client code.
- Never invent statistics, testimonials, logos, or compliance claims.
- Wording: never "illegal", "fraud", or "overcharge" as a conclusion. Always show the evidence tier.
- Goodbill reference screenshots live temporarily in docs/design/goodbill-refs/ (to be removed before submission). Use them for flow and density only. Never copy them into app code or assets, and never commit other third-party images.
