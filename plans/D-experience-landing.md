# Role D: Experience, Design System, and Landing Pages (BetterBill, LA Hacks AI 2026)

Owner: Role D (UI/UX and brand). Builds until the **Sun 09:00 freeze**. Demo work (script, video, Devpost, pitch) belongs to C.
Binding context: `/home/matmanna/projects/lahacks/plans/00-shared-context.md` (section 8 design system wins on conflicts), `/home/matmanna/projects/lahacks/plans/00-team-brief.md`, `/home/matmanna/projects/lahacks/bill-audit-design-doc.md` (12.11 Paper workflow), `/home/matmanna/projects/lahacks/bill-audit-prd.md`.
Written Sat 15:00 PDT. All times PDT. Items marked **UNVERIFIED** are listed in section 12.

---

## 1. Role summary

**Mission:** make BetterBill feel calm, trustworthy, and obviously hand-crafted. A patient with a scary $12,000 bill should understand the one number that matters within 3 seconds, see the proof behind every flag, and never feel rushed into sending anything. Judges should remember one image: the ink-navy balance card with a mint "less than billed" chip, above flags that each carry an evidence tier.

**D owns:**
- The design system in `packages/ui`: tokens in `globals.css` as shadcn CSS variables, Geist Sans and Instrument Serif, restyled shadcn primitives (style `base-lyra`, Base UI under the hood), and every BetterBill domain component in `packages/ui/src/components/bb/`.
- Paper frames: hand-designed key frames first, then implementation via Paper MCP.
- Every app screen, mobile first (390 px) plus a desktop "full insights" composition (1280 px).
- Two landing pages: consumer `/` and plan-facing `/for-plans`.
- OG images, favicon, manifest, Lighthouse.
- The GoDaddy domain.
- One strengthening option after G2 (D1 redline view, recommended; D2 share card plus Polar pricing, if ahead).

**Tracks D owns and what those judges need to see**

| Track | Prize | Judges need to see | D's proof |
|---|---|---|---|
| Paper, Best Designed Hack | $1,500 / $1,000 / $500 (verified on Paper's page) | Design fundamentals (hierarchy, type, spacing, contrast), ease of use, personal craft that does not look AI-generated | Hand-drawn Paper frames shown next to the live app; a `/design` page showing tokens and components; the redline view (D1); a Paper file link in Devpost |
| MLH GoDaddy | Gift card (team brief) | A real domain registered through GoDaddy, pointing at the live app | `betterbill.<tld>` (or fallback) resolves to Vercel with HTTPS |
| Polar | Not listed | Polar used for real money flow (sandbox) | Assisted-call checkout in Polar sandbox on `/pricing` (D2) or at least the pricing section linking to it |
| Commit Fellowship | Interview | A real problem, a launchable business, a team that ships | Consumer landing plus plan-facing landing (B2B channel), honest pricing, honest security roadmap |

---

## 2. Role onboarding (15 minutes)

1. **Paper (4 min).** Sign in at https://paper.design, redeem code `LAHACKS26` (free Pro month for the team of 4; redeem early because MCP limits change on Pro). Create file `BetterBill` with pages `00 Tokens`, `01 Mobile`, `02 Desktop`, `03 Landing`, `04 Redline`.
2. **Paper Desktop plus MCP (5 min).** Install Paper Desktop and open the file (Desktop runs the MCP server and installs the Paper CLI). With nothing selected, open the MCP panel, click **Add to Claude**, or run:
   `claude plugin marketplace add paper-design/agent-plugins && claude plugin install paper-desktop@paper`
   Restart Claude Code, run `/mcp`, confirm Paper is listed, test with "Create a basic Hello World frame in Paper." Older HTTP setups at `http://127.0.0.1:29979/mcp` still work while a file is open, but the stdio CLI is recommended; remove duplicate entries.
   **Platform:** Paper's MCP docs mention WSL (Windows) and a Linux note about restarting Claude, but do not list supported desktop OSes. Paper Desktop on Linux is **UNVERIFIED**. This dev machine is Arch Linux. Recommendation: run Paper Desktop on a macOS or Windows laptop. If D only has Linux: hand-design in Paper's browser editor, export PNG frames to `design/frames/`, and implement by hand from this plan (MCP is a speed-up, not a dependency).
3. **shadcn CLI in the monorepo (2 min).** The scaffold uses style `base-lyra`, CSS variables, lucide, and two `components.json` files (`packages/ui/components.json` and `apps/web/components.json`, both pointing at `packages/ui/src/styles/globals.css`). Primitives go into `packages/ui`:
   ```
   cd betterbill/packages/ui
   bunx shadcn@latest add sheet dialog tabs table accordion progress badge separator alert avatar popover
   ```
   Import as `@betterbill/ui/components/<name>` (confirm the alias after B's scaffold; the earlier scaffold used `@redline/ui/...`). `base-lyra` is built on `@base-ui/react`: there is **no `asChild`**; use the `render` prop (for example `<Button render={<Link to="/check" />}>`). Its defaults are `rounded-none` and `h-8`; D-02 restyles them.
4. **Local run (2 min).** `git clone`, `bun install`, `cp .env.example .env`, `docker compose up -d db`, `bun db:push`, `bun db:seed`, `bun dev`. Open the printed URL. Then open it on a phone over the Vercel preview.
5. **Playwright (2 min).** `bunx playwright install chromium webkit`. Tests live in `e2e/`. Run `bunx playwright test --project=mobile --project=desktop`.

Read `AGENTS.md` and this file. Ask B in chat for the fixture case id (`SAMPLE_CASE_ID`).

---

## 3. Visual direction

### 3.1 Moodboard (describe in Paper page `00 Tokens`, hand-assembled, no AI images)
- **Editorial finance, not fintech.** Think a well-set newspaper money page: serif headline, generous margins, one big number, hairline rules. Not dashboards with ten cards.
- **Proofreader's marks.** The product is literally editing a bill. The signature motif is a hand-drawn cobalt underline, a mint check tick, and a single-line strike through a wrong amount. Drawn by hand in Paper as SVG strokes (2 px, round caps, slight wobble). This is the "personal craft" element.
- **Clinical clean.** White paper, ink-navy text, cool gray surfaces (`#F4F6FA`), no beige, no glassmorphism.
- **Money-positive.** Mint is reserved for money coming back to the patient. Coral is reserved for "this line looks wrong". Cobalt is reserved for "you can act here".
- **Anti-references (do not look like):** Goodbill's violet gradient card, generic SaaS hero with 3D blobs, purple-to-pink gradients, stock photos of doctors, emoji, "AI sparkle" icons.

### 3.2 Tokens and exact Tailwind usage

| Token | Hex | Tailwind utility | Use only for |
|---|---|---|---|
| `--background` | `#FFFFFF` | `bg-background` | Page |
| `--foreground` | `#0B1B2B` | `text-foreground` | Body and headings |
| `--card` | `#FFFFFF` | `bg-card` | Cards |
| `--muted` | `#F4F6FA` | `bg-muted` | Section bands, table header, sheet body, inputs |
| `--muted-foreground` | `#5B6B7C` | `text-muted-foreground` | Secondary text, captions (5.4:1 on white) |
| `--border` | `#E3E8EF` | `border-border` (default `border`) | Hairlines |
| `--primary` | `#1E4ED8` | `bg-primary text-primary-foreground`, `text-primary` | Primary buttons, links, focus |
| `--secondary` | `#EEF2FF` | `bg-secondary text-secondary-foreground` | Secondary buttons, published tier badge |
| `--secondary-foreground` | `#1E3A8A` | `text-secondary-foreground` | |
| `--destructive` | `#E5484D` | `bg-destructive`, `text-destructive` | Coral icons, bar fills, error borders. **Not for small text** (3.9:1 on white) |
| `--ring` | `#1E4ED8` | `ring-ring` | Focus |
| `--radius` | `16px` | `rounded-2xl` (see radius scale) | Cards |
| `--ink` | `#0B1B2B` | `bg-ink` | BalanceCard, dark footer band |
| `--mint` | `#0F9D76` | `text-mint`, `bg-mint` | Savings numbers at 24 px+ on white, any size on ink (5.0:1); check circles |
| `--mint-soft` | `#D1FAE5` | `bg-mint-soft text-mint-ink` | Savings chip, confirmed badge |
| `--mint-ink` | `#065F46` | `text-mint-ink` | Small mint text on white |
| `--coral-soft` | `#FDECEC` | `bg-coral-soft text-coral-ink` | Flag icon circle |
| `--coral-ink` | `#B4232A` | `text-coral-ink` | Flagged amounts at any size (6.3:1) |
| `--amber-soft` | `#FEF3C7` | `bg-amber-soft text-amber-ink` | Estimate badge |
| `--amber-ink` | `#92400E` | `text-amber-ink` | |
| `--slate-soft` | `#EEF2F6` | `bg-slate-soft text-slate-ink` | Rule badge |
| `--slate-ink` | `#334155` | `text-slate-ink` | |

Note: `--mint-ink`, `--coral-ink`, `--amber-ink`, `--slate-ink` are the text colors already given in section 8.1, promoted to named tokens so classes stay readable. Flagged amounts use `text-coral-ink` (section 8.7 requires AA; `#E5484D` fails AA for body text).

**Radius scale** (set explicitly in `@theme inline`, replacing shadcn's calc chain so `rounded-2xl` equals `--radius`): `--radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px; --radius-xl: 12px; --radius-2xl: var(--radius); --radius-3xl: 24px;`. Cards `rounded-2xl` (16 px), buttons and inputs `rounded-xl` (12 px), chips `rounded-full`, landing product frame `rounded-3xl`.

**Shadow:** one card shadow only: `shadow-[0_1px_2px_rgba(11,27,43,0.06),0_8px_24px_rgba(11,27,43,0.06)]`, exposed as utility `shadow-card` via `--shadow-card` in `@theme`. Sheets use `shadow-[0_-8px_32px_rgba(11,27,43,0.12)]` (`shadow-sheet`).

**Dark mode:** not in scope. Remove `className="dark"` from `<html>` in `__root.tsx` (the scaffold sets it).

### 3.3 Type scale

| Role | Mobile classes | Desktop add-ons |
|---|---|---|
| Display (landing H1, balance number) | `font-serif text-[40px] leading-[44px] tracking-[-0.01em]` | `lg:text-[64px] lg:leading-[68px]` |
| H1 | `text-[28px] leading-[34px] font-semibold tracking-[-0.01em]` | `lg:text-[36px] lg:leading-[42px]` |
| H2 | `text-[22px] leading-[28px] font-semibold` | landing section titles use `font-serif text-[32px] leading-[36px] lg:text-[44px] lg:leading-[48px]` |
| H3 | `text-lg leading-6 font-semibold` | |
| Body | `text-base leading-6` | landing lead `lg:text-lg lg:leading-7` |
| Small | `text-sm leading-5` | |
| Caption | `text-xs leading-4 text-muted-foreground` | |
| Eyebrow | `text-xs leading-4 font-medium uppercase tracking-[0.08em] text-muted-foreground` | |

Rules: Instrument Serif (400 only, plus italic) appears only in landing headlines, landing section titles, the BalanceCard number and title, and the wordmark. Never for UI labels or body. Numbers always `tabular-nums`. Max line length `max-w-[60ch]` for body.

**Wordmark:** "BetterBill" in Instrument Serif 24 px, `text-foreground`, with a hand-drawn mint tick (16 px SVG) after it. Drawn once in Paper, exported to `packages/ui/src/components/bb/wordmark.tsx` as inline SVG.

### 3.4 Iconography
lucide only, `size-5` (20 px), `strokeWidth={1.75}`, `aria-hidden` unless standalone. Fixed vocabulary: `Camera`, `Images`, `ClipboardPaste`, `FileText`, `BadgeCheck`, `BookOpen`, `Landmark`, `CircleDashed`, `CircleAlert` (flags), `ChevronRight`, `Phone`, `Mail`, `Lock` (privacy), `Copy`, `Check`, `Circle`, `LoaderCircle`, `X`, `ArrowRight`, `Pencil`, `Share2`. Do not use `ShieldCheck` (reads as a compliance badge) or `Sparkles` (reads as AI slop).

### 3.5 Illustration and imagery
- The product is the illustration. Landing visuals are built from real components rendering the synthetic demo bill, labelled "Sample bill. Synthetic data."
- Hand-drawn proofreader strokes (underline, tick, strike, margin bracket) are the only decorative marks. SVG files in `apps/web/public/marks/`, drawn in Paper.
- No photos, no people, no device chrome mockups, no stock, no AI-generated images, no logos of hospitals, insurers, press, or partners.
- Gradients: **none**, except (a) a `mask-image` fade at the bottom of the landing hero product visual and (b) nothing else.

### 3.6 Motion
- Durations 150 to 250 ms, `ease-out`. Sheets slide 250 ms. No spring bounce, no parallax, no scroll-jacking.
- Allowed: button press `active:translate-y-px`; FlagRow hover `hover:bg-muted/60`; sheet slide; the hero number counts up once on landing (600 ms, only if motion allowed); redline strike draws in (`stroke-dashoffset`, 400 ms) on D1.
- `motion-reduce:` disables all of the above: add to `globals.css`:
  `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`

### 3.7 Wireframes (390 px and 1280 px)

Legend: `[Btn]` primary, `(Btn)` secondary, `{..}` component, `|` column edge.

**W1 Consumer landing `/`**
```
390 px                                   1280 px (max-w-6xl, 12 col)
+--------------------------------+       +----------------------------------------------------------+
| BetterBill~  [Check my bill]   |       | BetterBill~   How it works  Evidence  Pricing  For plans  [Check my bill] |
|                                |       |                                                          |
| FREE HOSPITAL BILL CHECK       |       | FREE HOSPITAL BILL CHECK        | +--------------------+ |
| Your hospital bill,            |       | Your hospital bill,             | | {BalanceCard}      | |
| checked line by line.  (serif) |       | checked line by line.  (64px)   | | {FlagRow} x3       | |
| Snap a photo or paste...       |       | Snap a photo or paste...        | | Sample bill. Synth.| |
| [Check my bill]                |       | [Check my bill] (Try a sample)  | +--------------------+ |
| (Try a sample bill)            |       |  cols 1-6                       |  cols 8-12             |
| Free. No account needed...     |       +----------------------------------------------------------+
| +----------------------------+ |       | How it works: 3 steps in a row (cols 4 each)             |
| | {BalanceCard}              | |       | Contrast table: 2 columns, 4 rows                        |
| | {FlagRow} {FlagRow} {Flag} | |       | Evidence tiers: 4 cards in a row                         |
| +----- fade ----------------+ |        | Pricing: 2 cards (cols 6 each)                           |
| How it works 1 / 2 / 3 stack   |       | Privacy (cols 5) | FAQ accordion (cols 7)                |
| Contrast: stacked pairs        |       | Closing CTA band (bg-ink, serif, mint tick)              |
| Tiers: 4 stacked cards         |       | Footer                                                   |
| Pricing: 2 stacked cards       |       +----------------------------------------------------------+
| Privacy / FAQ / Closing / Foot |
+--------------------------------+
```

**W2 Plans landing `/for-plans`**
```
390 px                                   1280 px
+--------------------------------+       +----------------------------------------------------------+
| BetterBill~ for plans [Pilot]  |       | BetterBill~ for plans  Approach Evidence Results Integration Security [Book a pilot] |
| FOR SELF-FUNDED EMPLOYERS...   |       | eyebrow / serif H1 / lead / CTAs  | {BillTable excerpt 4 rows} |
| Bill review your members       |       |  cols 1-6                         | {event log strip}          |
| can see.                       |       +----------------------------------------------------------+
| [Book a pilot] (See a sample)  |       | Where it fits: 3 cards (pre-payment, post-payment, member) |
| {BillTable excerpt, 3 rows}    |       | Evidence you can audit: tiers list (cols 5) | event log (cols 7) |
| Where it fits x3 stacked       |       | Measured results: 3 stat cells or "Measured results coming" |
| Evidence + event log           |       | Integration: 3 columns (API, case events, intake)        |
| Results                        |       | Security, stated plainly: Today / Not yet (2 cols)       |
| Integration                    |       | Pilot form (cols 7) | what a pilot includes (cols 5)    |
| Security                       |       | Footer                                                   |
| Pilot form / Footer            |       +----------------------------------------------------------+
+--------------------------------+
```

**W3 Onboarding `/welcome` (three cards) and W4 Upload `/check`**
```
390 px                                   1280 px (centered max-w-md card stack, same content)
+--------------------------------+       +--------------------------------------------+
| BetterBill~             Skip   |       |              BetterBill~         Skip      |
|                                |       |      +------------------------------+      |
|   [Camera icon in mint-soft]   |       |      |  card 1 of 3 (same as mobile)|      |
|   Snap your bill               |       |      +------------------------------+      |
|   Take a photo of each page... |       |              o  .  .                       |
|   o . .                        |       |              [Next]                        |
|   [Next]                       |       +--------------------------------------------+
+--------------------------------+
/check
+--------------------------------+       +--------------------------------------------+
| <  Check a bill                |       | BetterBill~                                 |
| Check your bill                |       | Check your bill (H1)                        |
| {UploadPanel}                  |       | {UploadPanel} cols 3-8 | privacy note cols 9-11 |
|  [Take a photo]                |       |                                            |
|  (Choose from photos)          |       |                                            |
|  (Paste the text)              |       |                                            |
|  ---- or ----                  |       |                                            |
|  (Try a sample bill)           |       |                                            |
| Lock: We only use your bill... |       |                                            |
+--------------------------------+       +--------------------------------------------+
```

**W5 Line confirmation `/case/$id/confirm`**
```
390 px                                   1280 px
+--------------------------------+       +---------------------------------------------------------+
| <  Confirm lines        2 of 3 |       | Confirm lines                                           |
| Check what we read             |       | cols 1-7: page image with line highlight | cols 8-12: rows |
| 23 lines. Tap any line to fix. |       |  (source crop of selected line large)    | {LineConfirmRow}|
| {LineConfirmRow}               |       |                                          | {LineConfirmRow}|
| {LineConfirmRow} (low conf.)   |       |                                          | ...             |
| ...                            |       |                                          | totals check    |
| Totals: lines add up  check    |       |                                          | [Looks right]   |
| [Looks right] sticky bottom    |       +---------------------------------------------------------+
+--------------------------------+
```

**W6 Case page `/case/$id` with W7 evidence sheet**
```
390 px                                   1280 px "full insights"
+--------------------------------+       +---------------------------------------------------------+
| <  BetterBill~           ...   |       | BetterBill~                                   Account   |
| Sample General Hospital        |       | Sample General Hospital, Los Angeles, CA (H1)           |
| Los Angeles, CA                |       | cols 1-8                         | cols 9-12 sticky     |
| +----------------------------+ |       | Your bill (H2)                   | {BalanceCard}        |
| | Your fair balance  ESTIMATE| |       | {BillTable}                      | Savings breakdown    |
| | $10,216.00 (serif, mint)   | |       |  Item | Tier | Amount | Savings >| Confirmed  $84.00    |
| | [-$1,784 less than billed] | |       |  ...every line...                | Potential  range     |
| +----------------------------+ |       |                                  | [Send the letter]    |
| What looks wrong     3 flags   |       | Financial assistance card        | (Call for me)        |
| {FlagRow} duplicate  $84.00    |       |                                  | {ActivityTimeline}   |
| {FlagRow} published  up to ... |       |                                  |                      |
| {FlagRow} eob        $...      |       | footer disclaimer                |                      |
| (See all 4)                    |       +---------------------------------------------------------+
| Financial assistance card      |       Evidence opens as right side sheet (w-[440px])
| Activity  (link)               |
| disclaimer                     |
|================================|
| {SavingsBar} $84 confirmed     |
| +$1,700 to $2,400   [Send...]  |
+--------------------------------+
Evidence (bottom sheet, max-h-[85svh])
+--------------------------------+
| ---- (grabber)                 |
| {TierBadge} Confirmed          |
| Same lab test billed twice     |
| $84.00 at stake                |
| What we found / Why it matters |
| Source: your bill, page 1      |
| What to say to billing [Copy]  |
| [Close]                        |
+--------------------------------+
```

**W8 Approval sheet, W9 account prompt**
```
390 px (bottom sheet)                    1280 px (centered Dialog max-w-xl)
+--------------------------------+       +------------------------------------------+
| Review before we send          |       | Review before we send                    |
| To: Billing office, Sample ... |       | To / What we'll send (scroll, bg-muted)  |
| What we'll send                |       | What we'll share (list)                  |
| +----------------------------+ |       |            (Not now)  [Approve and send] |
| | letter text, scroll        | |       +------------------------------------------+
| +----------------------------+ |
| What we'll share: name, ...    |       Account prompt: same frame, title
| Nothing is sent until...       |       "Save your case to continue"
| [Approve and send]             |
| (Not now)                      |
+--------------------------------+
```

**W10 Activity `/case/$id/activity` and W11 call transcript card**
```
390 px                                   1280 px: timeline lives in right rail; transcript card in left column
+--------------------------------+
| <  Activity                    |
| Current step                   |
| +----------------------------+ |
| | Phone  Waiting for billing | |
| | to call back               | |
| +----------------------------+ |
| (v) Bill checked   Oct 17 4:02 |
|  |                             |
| (v) Letter approved  4:10 PM   |
|  |                             |
| (v) Letter sent      4:11 PM   |
| ( ) Call with billing (now)    |
| ( ) Reply received             |
| {CallTranscriptCard}           |
+--------------------------------+
```

**W12 States** (all centered in the content column, both sizes): icon in 48 px soft circle, H3, one sentence, one primary action, optional secondary.

---

## 4. Component specs (`packages/ui/src/components/bb/`)

Shared rules: every component accepts `className` (merged with `cn`), uses only tokens above, is a named export, has no data fetching (props in, callbacks out), and never computes savings (values come from B's core output). Copy below is final.

### 4.1 `Money` (`money.tsx`)
```ts
type MoneyProps = {
  cents: number;                         // integer
  sign?: "none" | "negative" | "auto";   // "negative" prefixes U+2212; "auto" uses the sign of cents
  cents_display?: "sup" | "inline" | "hide"; // default "sup"
  label?: string;                        // context for screen readers, e.g. "Duplicate charge"
  className?: string;
};
```
Anatomy: `<span aria-label>` > `<span aria-hidden>` sign, `$`, dollars with grouping, `<sup>` cents.
Classes: root `tabular-nums whitespace-nowrap`; sup `text-[0.55em] align-top ml-0.5 relative top-[0.15em]`.
Format examples: `125037` sup renders `$1,250.37` as `$1,250` + sup `.37`; `-102247` with sign auto renders `−$1,022.47` (true minus U+2212); `8400` with `cents_display="hide"` renders `$84`.
a11y: `aria-label` = `"{label}, 1,022 dollars and 47 cents"`; when negative, `"minus 1,022 dollars and 47 cents"`. Use `formatCents` from `@betterbill/core` if B ships it, else `Intl.NumberFormat("en-US")` on `Math.abs(cents)/100` inside this file only.

### 4.2 `TierBadge` (`tier-badge.tsx`)
```ts
type Tier = "confirmed" | "rule" | "published" | "estimate";
type TierBadgeProps = { tier: Tier; size?: "sm" | "md"; className?: string };
```
Classes: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium` plus per tier:
| Tier | Classes | Icon | Label |
|---|---|---|---|
| confirmed | `bg-mint-soft text-mint-ink` | `BadgeCheck` | Confirmed from your bill |
| rule | `bg-slate-soft text-slate-ink` | `BookOpen` | Billing rule |
| published | `bg-secondary text-secondary-foreground` | `Landmark` | Hospital's published price |
| estimate | `bg-amber-soft text-amber-ink` | `CircleDashed` | Estimate |
Icon `size-3.5` (14 px) here, `strokeWidth={2}`. a11y: text always visible; never color only.

### 4.3 `BalanceCard` (`balance-card.tsx`)
```ts
type BalanceCardProps = {
  hospitalName: string;
  billedCents: number;
  fairBalanceCents: number;      // from core: billed minus confirmed minus potentialLow
  fairBalanceLowCents?: number;  // billed minus confirmed minus potentialHigh
  lessThanBilledCents: number;   // billed minus fairBalance, positive number
  isEstimate: boolean;           // true when any potential savings are included
  className?: string;
};
```
Anatomy: ink card; row 1 title "Your fair balance" (serif 22 px) plus amber "Estimate" chip if `isEstimate`; big number; mint-soft chip; caption "Billed {Money billed}. As low as {Money low} if every flag holds."
Classes: root `rounded-2xl bg-ink p-5 text-white shadow-card lg:p-6`; title `font-serif text-[22px] leading-7 text-white/90`; number `font-serif text-[48px] leading-[52px] tracking-[-0.01em] text-mint tabular-nums mt-3 lg:text-[56px] lg:leading-[60px]`; chip `mt-3 inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-medium text-mint-ink`; caption `mt-4 text-xs leading-4 text-white/70`.
Chip copy: `<Money sign="negative"/> less than billed` (renders "−$1,784.00 less than billed").
States: loading (`Skeleton` blocks `bg-white/10`), no-savings (number equals billed, chip hidden, caption "We didn't find anything to lower yet.").
a11y: `role="group" aria-label="Your fair balance"`; the estimate chip reads "Estimate".

### 4.4 `FlagRow` (`flag-row.tsx`)
```ts
type FlagRowProps = {
  flag: { id: string; title: string; explanation: string; amountCents: number; tier: Tier; lever: string };
  amountPrefix?: "none" | "up_to";   // "up_to" for potential flags
  onOpen: (flagId: string) => void;
  className?: string;
};
```
Anatomy: full-width `button`: coral icon circle, title, one-line explanation, tier badge; right column amount and chevron.
Classes: root `group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[64px]`; icon wrap `mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-coral-soft text-destructive`; title `text-base leading-6 font-semibold text-foreground`; explanation `text-sm leading-5 text-muted-foreground line-clamp-2`; badge `mt-2`; amount `text-base leading-6 font-semibold text-coral-ink tabular-nums`; "Up to" `text-xs text-muted-foreground block text-right`; chevron `size-5 text-muted-foreground mt-0.5`.
a11y: `aria-label="{title}. {tier label}. {amount spoken}. Show evidence"`. Explanation is clamped visually but full text is in the sheet.

### 4.5 `SavingsBar` (`savings-bar.tsx`)
```ts
type SavingsBarProps = {
  confirmedCents: number; potentialLowCents: number; potentialHighCents: number;
  actionLabel: "Send the letter" | "Call for me" | "Looks right" | "Check my bill";
  onAction: () => void; actionDisabled?: boolean; className?: string;
};
```
Classes: root `fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden`; inner `mx-auto flex h-16 max-w-6xl items-center gap-3 px-5`; left text block `min-w-0 flex-1`; line 1 `text-sm leading-5 font-semibold text-mint-ink` "{Money confirmed} confirmed"; line 2 `text-xs leading-4 text-muted-foreground` "+ {low} to {high} possible (estimate)"; button `h-12 rounded-xl px-5`.
Page that uses it adds `pb-[calc(80px+env(safe-area-inset-bottom))]` to `<main>`.
a11y: `role="region" aria-label="Savings summary"`.

### 4.6 `EvidenceSheet` (`evidence-sheet.tsx`)
```ts
type EvidenceSheetProps = {
  open: boolean; onOpenChange: (o: boolean) => void;
  flag: Flag | null;               // from schemas.ts
  line?: { description: string; code: string | null; serviceDate: string | null; chargeCents: number };
  whatToSay: string;               // from A (letter snippet) or template from C
  compare?: { billedCents: number; publishedCents: number; sourceUrl: string; capturedAt: string };
};
```
Uses shadcn `Sheet`. `side` = `"bottom"` below 1024 px, `"right"` at `lg` (hook `useIsDesktop()` in `packages/ui/src/hooks/use-is-desktop.ts`, SSR default false).
Classes: bottom `max-h-[85svh] rounded-t-3xl p-0 shadow-sheet`; right `w-full sm:max-w-[440px] p-0`; grabber `mx-auto mt-3 h-1.5 w-10 rounded-full bg-border`; body `overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 space-y-5`.
Sections and copy:
- Header: `TierBadge`, then title (H2 class), then `{Money} at stake` (`text-lg font-semibold text-coral-ink`).
- "What we found" (H3) + `flag.explanation`.
- "The line on your bill": muted box `rounded-xl bg-muted p-4 text-sm` with description, code, date, charge.
- "Why we think so" (H3) + `flag.evidence.detail`; if `quote`, blockquote `border-l-2 border-primary pl-3 text-sm italic`.
- `ComparePriceBar` when `compare` is present.
- "Source": link text (`text-primary underline underline-offset-4`), then caption "Captured {Oct 17, 2026, 4:02 PM}". For confirmed tier: "Source: your bill, page {n}".
- "What to say to billing" (H3) + muted quote box + `(Copy)` button (`variant="secondary"`, icon `Copy`, toast "Copied").
- Footer caption: "This is an estimate based on public information. BetterBill is informational, not legal or medical advice." (estimate and published tiers); confirmed tier omits the first sentence.
a11y: Base UI Dialog focus trap; title is `SheetTitle`; Escape closes; close button `aria-label="Close evidence"`.

### 4.7 `ComparePriceBar` (`compare-price-bar.tsx`)
```ts
type ComparePriceBarProps = { billedCents: number; publishedCents: number; publishedLabel?: string; sourceName: string; sourceUrl: string; capturedAt: string };
```
Two rows. Row: label left `text-sm`, `Money` right `text-sm font-semibold tabular-nums`; bar below `mt-2 h-2 w-full rounded-full bg-muted` with fill `h-2 rounded-full`. Billed fill `bg-destructive` width 100%; published fill `bg-mint` width `published/billed*100%` (a display ratio, not a savings computation). Labels: "As billed", "Hospital's published cash price". Caption: "Source: {sourceName} price file, captured {date}." If no captured price: render only caption "Price capture pending. We only compare against prices we've captured with a date." a11y: bars `aria-hidden`; numbers are the text.

### 4.8 `LineConfirmRow` (`line-confirm-row.tsx`)
```ts
type LineConfirmRowProps = {
  line: Line; cropUrl?: string;         // B1 source crop if available
  onChange: (next: Line) => void;       // sets userEdited true
  editing: boolean; onEditToggle: () => void;
};
```
Anatomy: 56x40 crop thumbnail (`rounded-md border object-cover`) or `FileText` placeholder; description (2 lines), caption "{code} · {date} · {units} unit(s)"; amount right; confidence dot.
Confidence dot: `size-2 rounded-full` with `bg-mint` (>= 0.9, sr text "High confidence"), `bg-amber-ink` (0.7 to 0.9, "Check this line"), `bg-destructive` (< 0.7, "Low confidence, please check"). Tokens only; no Tailwind palette colors. Low-confidence rows show a caption `text-xs text-amber-ink` "Please check this line."
Edit mode: inline grid of `Input` fields: Description, Code, Units, Charge ($); buttons "Save" and "Cancel". Root `rounded-xl border bg-card p-3`; editing adds `ring-2 ring-ring`.
a11y: edit button `aria-label="Edit line: {description}"`; inputs labelled; charge input `inputMode="decimal"`.

### 4.9 `UploadPanel` (`upload-panel.tsx`)
```ts
type UploadPanelProps = {
  onPhotos: (files: File[]) => void; onText: (text: string) => void; onSample: () => void;
  busy?: boolean; error?: string | null;
};
```
Anatomy (card `rounded-2xl border bg-card p-5 shadow-card space-y-3`):
1. `[Take a photo]` primary full width, icon `Camera`, hidden `<input type="file" accept="image/*" capture="environment" multiple>`.
2. `(Choose from photos)` secondary, icon `Images`, input `accept="image/*,application/pdf" multiple`.
3. `(Paste the text)` secondary, icon `ClipboardPaste`, reveals `Textarea` (`min-h-40`, label "Bill text", placeholder "Paste the text from your bill or patient portal") plus `[Check my bill]`.
4. Divider: `flex items-center gap-3 text-xs text-muted-foreground` with hairlines, text "or".
5. `(Try a sample bill)` ghost button, caption "A synthetic $12,000 hospital bill with known errors."
Hint caption under photo button: "Lay the bill flat in good light. One photo per page."
busy: buttons disabled, `LoadingState` replaces panel. error: `Alert` with `ErrorState` copy (4.13).

### 4.10 `ApprovalSheet` (`approval-sheet.tsx`)
```ts
type ApprovalSheetProps = {
  open: boolean; onOpenChange: (o: boolean) => void;
  kind: "letter" | "itemized_request" | "call";
  recipient: string;            // "Billing office, Sample General Hospital"
  channelDetail: string;        // "test inbox: billing-test@..." or "(555) 010-0000, a test line"
  text: string;                 // exact letter or call script, from A
  dataShared: string[];         // ["Your name", "Account ending 4821", "2 disputed lines"]
  pending?: boolean; onApprove: () => void;
};
```
Sheet bottom on mobile, `Dialog` `max-w-xl` on desktop. Copy by kind: title "Review before we send" (letter, itemized_request) or "Review before we call" (call). Labels "To", "What we'll send" or "What we'll say", "What we'll share". Text box `max-h-[40svh] overflow-y-auto rounded-xl bg-muted p-4 text-sm leading-6 whitespace-pre-wrap font-sans`. Fine print `text-xs text-muted-foreground`: "Nothing is sent until you tap Approve. We save your approval with the time." For call add: "The call starts with: \"Hi, this is an automated assistant calling on behalf of a patient.\"" Buttons: primary "Approve and send" or "Approve and call" (`h-12 w-full lg:w-auto`), secondary "Not now". Pending label "Sending" with `LoaderCircle animate-spin`.
a11y: initial focus on the text box heading, not on Approve (prevents accidental approval).

### 4.11 `ActivityTimeline` (`activity-timeline.tsx`)
```ts
type ActivityTimelineProps = {
  current?: { title: string; detail: string; icon: "phone" | "mail" | "file" };
  events: { id: string; at: string; summary: string; actor: "user" | "agent" | "system"; done: boolean }[];
};
```
Current step card `rounded-2xl bg-muted p-4 flex gap-3`, icon circle `size-10 rounded-full bg-secondary text-secondary-foreground`. List `ol` with `relative`; each `li` `relative pl-10 pb-6`; connector `absolute left-[15px] top-8 bottom-0 w-px bg-mint` (done) or `bg-border`; done marker `size-8 rounded-full border-2 border-mint text-mint` with `Check`; pending `border-2 border-border`. Summary `text-base leading-6`; time `text-xs text-muted-foreground` formatted "Sat, Oct 17, 4:02 PM" (local). Actor caption: "by you", "by BetterBill", "automatic".
a11y: `ol` with `aria-label="Case activity"`; done state in text ("Done").

### 4.12 `BillTable` (`bill-table.tsx`)
```ts
type BillTableProps = { rows: { line: Line; flag?: Flag; savingsCents?: number; savingsRange?: [number, number] }[]; onOpen: (flagId: string) => void };
```
shadcn `Table`. Columns: Item, Tier, Amount, Possible savings, chevron. Header `bg-muted text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground h-11`. Rows `h-16 border-b`; flagged rows clickable (`cursor-pointer hover:bg-muted/60`, whole row is a `button` in the first cell with `after:absolute after:inset-0` for a full-row hit area). Item cell: description `text-sm font-medium` plus caption code and date. Amount `text-right tabular-nums text-sm`. Savings `text-right text-sm font-semibold text-mint-ink` with `Money sign="negative"`; unflagged rows show "No issues found" `text-xs text-muted-foreground`. Ranges render "{low} to {high}". Footer row: "Total billed" and sum (from B's totals, not summed in UI).
a11y: real `<table>` with `scope="col"`; row buttons labelled like FlagRow.

### 4.13 `EmptyState`, `ErrorState`, `LoadingState` (`states.tsx`)
```ts
type StateProps = { title: string; body: string; action?: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void } };
```
Layout `mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center`; icon circle `size-12 rounded-full` (`bg-mint-soft text-mint-ink` empty, `bg-coral-soft text-coral-ink` error, `bg-secondary text-secondary-foreground` loading). Canonical copy:
- Reading: title "Reading your bill", body "We'll show you every line before checking anything." (Add "This usually takes under a minute." only after B measures p50 under 60 s.) Steps list with check marks: "Finding line items", "Checking the totals", "Getting lines ready for you".
- Auditing: "Checking your lines", "Looking for duplicates, unit errors, and mismatches."
- Unreadable photo: "We couldn't read this photo", "Try a flatter, brighter photo, or paste the text instead." Actions "Retake photo", "Paste the text".
- Totals mismatch: "Your lines don't add up to the total", "The lines add up to {a}, but the bill says {b}. Check the lines marked below."
- No flags: "Nothing looks wrong", "We checked {n} lines and found nothing to flag. You can still ask for an itemized bill." Action "Ask for an itemized bill".
- Network: "Something went wrong on our side", "Your bill is safe. Try again in a moment." Action "Try again".
- Not found: "We can't find that case", "It may have been removed." Action "Check a bill".
`LoadingState` also exports `CaseSkeleton` (BalanceCard plus 3 FlagRow skeletons).

### 4.14 `CallTranscriptCard` (`call-transcript-card.tsx`)
```ts
type CallTranscriptCardProps = {
  status: "ringing" | "in_progress" | "ended" | "failed";
  recorded?: boolean;   // true when a labelled recording is shown instead of a live call
  turns: { speaker: "agent" | "billing"; text: string; at?: string }[];
  outcome?: { referenceNumber?: string; nextStep?: string; followUpBy?: string };
};
```
Card `rounded-2xl border bg-card p-5 shadow-card`. Header "Call with the billing office" plus status chip ("Calling", "On the call", "Call ended", "Call didn't connect"); `recorded` adds amber chip "Recorded call, labelled". Turns: speaker label `text-xs font-medium text-muted-foreground` ("BetterBill assistant", "Billing office"), text `text-sm leading-6`. Outcome box `rounded-xl bg-mint-soft p-4 text-mint-ink` with rows "Reference number", "Next step", "Follow up by". a11y: transcript `aria-live="polite"` while in progress.

### 4.15 `AccountPrompt` (`account-prompt.tsx`), `Wordmark`, `SiteFooter`
- AccountPrompt: Sheet/Dialog. Title "Save your case to continue". Body "Create a free account to send letters, place calls, and keep track of replies. Your results stay the same." Buttons "Create account" (primary, A or B wires Better Auth), "I have an account" (secondary), "Not now" (ghost).
- Wordmark: props `{ suffix?: "for plans" }`; suffix `ml-2 text-sm text-muted-foreground font-sans`.
- SiteFooter: shared by both landings (5.12).

---

## 5. Screen specs

Routes (TanStack file routes in `apps/web/src/routes/`; confirm with A at 16:00): `index.tsx` (`/`), `for-plans.tsx`, `welcome.tsx`, `check.tsx`, `case/$id/index.tsx`, `case/$id/confirm.tsx`, `case/$id/activity.tsx`, `case/$id/redline.tsx` (D1), `pricing.tsx` (D2), `design.tsx` (component gallery, `noindex`). Replace the scaffold `Header` and the root `grid h-svh` wrapper; each page renders its own top bar.

App top bar (all app screens): `sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur` inner `mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8`; back button `size-11` ghost with `ChevronLeft` and `aria-label="Back"`; title `text-base font-semibold`.

Result screen footer (case, activity, redline): `mt-10 pb-6 text-center text-xs text-muted-foreground`: "BetterBill is informational, not legal or medical advice."

### 5.1 Onboarding `/welcome`
Shown on first visit to `/check` (localStorage `bb_onboarded`); "Skip" sets it. Three cards, swipe or Next, dots (`size-2 rounded-full`, active `bg-primary w-6`).
1. Icon `Camera`. "Snap your bill" / "Take a photo of each page, or paste the text from your patient portal."
2. Icon `CircleAlert`. "See what looks wrong, with proof" / "Every flag shows the line, the rule or price behind it, and where it came from."
3. Icon `BadgeCheck`. "You approve everything we send" / "We draft the letter or the call. Nothing goes out until you say yes."
Under card 3: privacy line with `Lock`: "We only use your bill to check it. We never sell your data." Buttons: "Next", last card "Check my bill". Desktop: same, centered `max-w-md`. Components: Button, Wordmark.

### 5.2 Upload `/check`
H1 "Check your bill". Lead `text-muted-foreground`: "Itemized bills work best. If you only have a summary, we'll help you ask for the details." `UploadPanel`. Privacy row (`Lock`): "We only use your bill to check it. We never sell your data. No account needed to see results." Sample button calls `case.create` with the sample (B's fixture) and routes to `/case/$id/confirm`. Desktop: panel `lg:col-span-6 lg:col-start-3`, privacy aside `lg:col-span-3`.

### 5.3 Line confirmation `/case/$id/confirm`
H1 "Check what we read". Lead "{n} lines from {hospital}. Tap a line to fix it." Low-confidence lines float to the top with a caption "{k} lines need a look". Totals row: success `text-mint-ink` with `Check` "Lines add up to the bill total, {Money}" or the totals-mismatch ErrorState inline. Sticky bottom primary "Looks right" (calls `bill.confirmLines` then `audit.run`, shows Auditing state, routes to case). Desktop: left 7 columns show the page image (`rounded-2xl border bg-muted`) with a cobalt rectangle on the selected line's `bbox`; right 5 columns list rows and the button. Components: LineConfirmRow, Button, states.

### 5.4 Case page `/case/$id` (mobile)
Order: hospital name H1 plus city caption; `BalanceCard`; section "What looks wrong" (H2) with count chip `rounded-full bg-muted px-2.5 py-1 text-xs` "{n} flags"; up to 3 `FlagRow`s sorted by tier (confirmed first) then amount; `(See all {n})`; "Financial assistance" card (title "You might qualify for help", status chip likely/possible/unlikely/unknown with estimate badge, policy quote blockquote, source caption, button "Check if I qualify" to A's flow); "How we estimated this" Accordion listing `savings.method` lines; activity link row "Activity" with chevron; footer disclaimer; `SavingsBar` with "Send the letter" (before sending) or "Call for me" (after letter sent). Tapping a FlagRow opens `EvidenceSheet`. Primary action opens `ApprovalSheet` (or `AccountPrompt` first if signed out).

### 5.5 Case page desktop "full insights" (`lg:`)
`main` `mx-auto max-w-6xl px-8 py-8 lg:grid lg:grid-cols-12 lg:gap-8`. Left `lg:col-span-8 space-y-8`: H1, "Your bill" H2 with `BillTable` (every line), financial assistance card, method accordion, transcript card if any. Right `lg:col-span-4 lg:sticky lg:top-20 lg:self-start space-y-4`: `BalanceCard`, savings breakdown card ("Confirmed" `Money` mint-ink, "Possible" range, "Financial assistance" status, caption "Estimates depend on the hospital. Not guaranteed."), actions card (primary "Send the letter", secondary "Call for me"), `ActivityTimeline` (last 4 events plus "See all"). SavingsBar hidden (`lg:hidden`). Evidence opens as right sheet.

### 5.6 Activity `/case/$id/activity`
H1 "Your case activity". `ActivityTimeline` from `event.list`, current step from latest pending `Action`. `CallTranscriptCard` below when a call exists. Desktop: timeline in a `max-w-2xl` column.

### 5.7 Approval, account prompt, call transcript
As specified in 4.10, 4.15, 4.14. After approve: toast "Letter sent to the test inbox" or "Calling now"; timeline gets the new event (A writes it).

### 5.8 Consumer landing `/` (full final copy)

Page shell: `<main>`; sections `px-5 md:px-8`, inner `mx-auto max-w-6xl`; vertical rhythm `py-16 lg:py-28`; alternate bands `bg-muted` for Tiers and FAQ.

**Nav** (`h-16`, sticky, `bg-background/90 backdrop-blur border-b border-transparent` turning `border-border` after scroll 8 px): Wordmark; desktop links `text-sm text-muted-foreground hover:text-foreground` "How it works", "Evidence", "Pricing", "For plans", "FAQ"; button "Check my bill" (`h-10 rounded-xl` on mobile in nav, `lg:h-11`). Mobile: no hamburger; links are in the footer.

**Hero** (`pt-10 pb-16 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-20 lg:pb-28 lg:items-center`). Left `lg:col-span-6`:
- Eyebrow: "Free hospital bill check"
- H1 (display): "Your hospital bill, checked line by line."  The words "line by line" carry the hand-drawn cobalt underline SVG (`absolute -bottom-1 left-0 w-full`, `aria-hidden`).
- Lead `mt-5 text-base leading-6 lg:text-lg lg:leading-7 text-muted-foreground max-w-[52ch]`: "Snap a photo or paste the text. BetterBill reads every charge, shows what looks wrong with the proof, and drafts the letter. Nothing is sent until you approve it."
- CTAs `mt-8 flex flex-col gap-3 sm:flex-row`: primary "Check my bill" to `/check`; secondary "Try a sample bill" (starts the sample case).
- Micro `mt-4 text-xs text-muted-foreground`: "Free. No account needed to see your results."
Right `lg:col-span-5 lg:col-start-8`, product visual: frame `relative mt-12 rounded-3xl border bg-muted p-4 lg:mt-0 lg:p-6`, inside `BalanceCard` (hospital "Sample General Hospital", billed $12,000.00, fair $10,216.00, less than billed $1,784.00, estimate) then a white card `mt-4 rounded-2xl border bg-card p-2 shadow-card` with 3 `FlagRow`s (non-interactive, `pointer-events-none`, `aria-hidden` group with an `sr-only` summary). Bottom `mask-image:linear-gradient(to bottom,black 80%,transparent)` on the flag card only. Caption below frame: "Sample bill. Synthetic data." Values come from C's fixture via a static import of `data/synthetic/sample-01.json` processed by `@betterbill/core` at build time (UI does not compute). Flag copy (placeholders until the fixture lands; replace with fixture titles):
  1. "Same lab test billed twice" / "CBC with differential (85025), same date, $84.00 each." / confirmed / $84.00
  2. "Higher than the hospital's published price" / "MRI lumbar, no contrast (72148) billed $6,900.00." / published / up to {fixture}
  3. "Bill asks for more than your insurer says" / "Your EOB lists a lower amount you owe." / confirmed / {fixture}
  If C's captured price is not ready, flag 2 is replaced by the units flag from the fixture. Never show a published price without a captured file and date.

**How it works** (`id="how"`). Section title (serif): "Three steps. You stay in charge." Three steps, each with a numeral in serif `text-[40px] text-primary` and hairline above:
1. "Snap or paste your bill" / "Take a photo of each page, or paste the text. You check every line we read before anything else happens."
2. "See what looks wrong, with proof" / "Each flag shows the line, the rule or price it's based on, where that came from, and the date."
3. "Approve what we send" / "We draft the letter or the call script. You read the exact words. Nothing goes out until you approve it."
Then contrast block, title (H3): "A different way to fix a bill". Two-column definition list (mobile: stacked pairs with labels):
| | Expert negotiation services | BetterBill |
|---|---|---|
| Who reviews | Coders and negotiators review your records | You see every check, with its source |
| When you see findings | After your records are collected and reviewed | Right after you confirm your lines |
| What you pay | Often a share of what they save | Free to check. Optional paid call |
| Who decides | You authorize them to negotiate | You approve each letter and call |
Note under table `text-sm text-muted-foreground`: "Expert services have hospital relationships we don't have. If you want someone to handle everything, they can be a good choice. BetterBill is for people who want to see the proof and act now."

**Evidence tiers** (`id="evidence"`, `bg-muted`). Title: "Every flag tells you how sure we are." Lead: "Some problems are simple math. Others depend on a rule or a price list. We label each one so you know what you're looking at." Four cards (`rounded-2xl bg-card border p-5`), each `TierBadge` then text:
- Confirmed from your bill: "Math on your own documents. Example: the same test on the same day, billed twice."
- Billing rule: "A published billing rule, with its source. Example: more units of a drug than one visit allows."
- Hospital's published price: "The hospital's own price list, with the date we read it. Example: an MRI billed above its listed cash price."
- Estimate: "Our best estimate, clearly labeled. Example: whether you might qualify for financial assistance."
Footnote: "We never call a charge illegal or fraud. We show you what doesn't match, and you decide what to do."

**Pricing** (`id="pricing"`). Title: "What it costs". Two cards `lg:grid-cols-2 gap-4`:
- "Bill check" / big "Free" (serif 40 px) / list with `Check` icons in `text-mint-ink`: "Reads every line on your bill", "Flags with evidence and sources", "Savings estimate with the math shown", "Dispute letter you can edit and send", "Financial assistance check" / button "Check my bill".
- "Assisted call" / "Optional" (serif 40 px) / "We call the billing office for you, using a script you approve. You see the transcript and what they said." / list: "You approve the script first", "The call says it's an automated assistant", "Transcript and reference number saved to your case" / caption "One flat price per call, shown before you pay. Payments run in Polar test mode during LA Hacks; no real charges." / button secondary "See pricing" (to `/pricing` if D2, else `#pricing`).

**Privacy** (`lg:col-span-5`). Title: "Your bill stays your business." Body: "We only use your bill to check it. We never sell your data." List with `Lock`: "No account needed to see your results", "You choose what goes in each letter or call", "Calls share only your name, account ending, and the disputed lines", "This demo runs on synthetic bills only". Honest caption: "BetterBill is a hackathon project. We have not had a security audit yet, so please don't upload real bills today."

**FAQ** (`lg:col-span-7`, shadcn `Accordion`, `bg-muted` band shared with Privacy on desktop): 
- "Is this legal or medical advice?" / "No. BetterBill is informational. It points out lines that don't match and shows you why. You decide what to do."
- "What kind of bill works best?" / "An itemized hospital bill, with a line for each charge. If you only have a summary, we'll draft a request for the itemized version."
- "Do I need an account?" / "Not to check a bill. You'll need a free account to save your case, send a letter, or have us call."
- "Will you contact the hospital without asking me?" / "Never. You see the exact letter or call script first. Nothing goes out until you approve it, and we save the time you approved."
- "How do you know a price is too high?" / "Hospitals publish price lists. When we compare your charge to one, we show the hospital's own number, the file it came from, and the date we read it."
- "What does \"estimate\" mean here?" / "It's our best guess, not a promise. What you end up paying depends on the hospital."
- "What if I already paid, or the bill is in collections?" / "You can still check it. Getting money back or handling collections is a separate process we don't handle yet."
- "Who made this?" / "A team of four at LA Hacks 2026, in Los Angeles."

**Closing CTA** (`bg-ink text-white rounded-3xl mx-5 md:mx-8 p-8 lg:p-16 text-center`): serif display "Check your bill before you pay it." with the mint tick mark; lead `text-white/75` "It's free, and nothing is sent without you."; buttons "Check my bill" (primary) and "Try a sample bill" (`variant="secondary"`).

**Footer** (5.12).

Responsive: hero stacks with visual below CTAs on mobile; tiers 1 column mobile, 2 at `md`, 4 at `lg`; steps 1 column mobile, 3 at `lg`; contrast table becomes stacked definition pairs below `md`.

### 5.9 Plans landing `/for-plans` (full final copy)

Tone: calmer, denser, no serif in body, serif only for H1 and section titles. Same tokens. No pricing.

**Nav:** Wordmark with suffix "for plans"; links "Approach", "Evidence", "Results", "Integration", "Security"; button "Book a pilot" (scrolls to `#pilot`). Link back "For patients" in footer.

**Hero:** eyebrow "For self-funded employers, TPAs, and health plans". H1 (display): "Bill review your members can see." Lead: "BetterBill checks hospital bills line by line and shows the evidence behind every flag. Use it before you pay a claim, after you pay, or give it to members as a self-serve tool." CTAs "Book a pilot", "See a sample review" (opens the sample case desktop view). Visual (right 6 cols): `BillTable` excerpt (4 rows of the sample, non-interactive) above an event strip in Geist with tabular numbers: three rows `text-xs` with time, actor, summary ("4:02 PM  system  Audit ran: 4 checks, 3 flags", "4:10 PM  member  Approved dispute letter", "4:11 PM  agent  Letter sent to billing test inbox"). Caption "Sample review. Synthetic data."

**Where it fits** (`id="approach"`). Title: "One review, three places to use it." Cards:
- "Pre-payment review" / "Check itemized hospital bills before a claim is paid. Flags come with the line, the rule or price, and the source."
- "Post-payment review" / "Look back at paid claims to find duplicates, unit errors, and prices above the hospital's own published rates."
- "Member self-serve" / "Members snap their bill and see what looks wrong. They approve every letter and call, so nothing happens behind their back."

**Evidence you can audit** (`id="evidence"`, `bg-muted`). Title: "Evidence you can audit." Left: four tier rows (`TierBadge` plus one line each, same definitions as consumer, written for reviewers: "Arithmetic on the submitted documents", "A cited billing rule with its source and date", "The hospital's published price file, with capture date", "A labeled estimate, never counted as confirmed"). Right: "Every action is an event" with a small card listing a CaseEvent example (`text-xs` rows, `font-sans tabular-nums`): `at`, `actor`, `type`, `summary`. Body: "Events are append-only. Corrections are new entries, so you can see who changed what and when."

**Measured results** (`id="results"`). Title: "Measured, not promised." Data: `eval.results` oRPC (B) reading `data/eval/results.json` (C) in the route loader. If present, three stat cells (`text-[40px] font-serif tabular-nums`) with captions taken verbatim from the file:
- "{recall}% of seeded errors found" / "Measured on {n} synthetic bills, {date}."
- "{falseFlags} false flags on clean bills" / "Measured on {m} clean synthetic bills, {date}."
- "{caught} of {total} reporter findings matched" / "Recreated KFF Health News \"Bill of the Month\" cases, {date}." (only if C1 ran)
If absent or a field is missing: single card "Measured results coming. We publish recall and false-flag rates with the bill count and date. We never show targets as results." Expected file shape (agree with C by 01:00): `{ generatedAt, seeded: { bills, recall, falseFlagsOnClean, cleanBills }, benchmark?: { cases, matched, total } }`.

**Integration** (`id="integration"`). Title: "Built to plug in." Three columns:
- "Typed API" / "Every step is an API call: create a case, read a bill, run the audit, draft a letter. An OpenAPI description is available."
- "Case events" / "Each case keeps an append-only event log you can read back. Webhooks are on the roadmap."
- "Intake today" / "Photos, PDFs, and pasted text. Claim file intake is on the roadmap, not built."

**Security, stated plainly** (`id="security"`). Two columns. "Today": "Synthetic data only", "Model and phone keys stay on the server", "Every letter or call needs a recorded member approval", "Calls identify themselves as an automated assistant". "Not yet": "No HIPAA program or business associate agreements", "No SOC 2 report", "No real member data until those are in place". Caption: "We'd rather tell you what's missing than show a badge we haven't earned."

**Pilot** (`id="pilot"`). Left: title "Pilot partners wanted." Body "We're looking for one or two self-funded employers, TPAs, or plans to shape a pilot on synthetic or de-identified data." List "A pilot includes": "A review of sample bills you choose", "Evidence reports for every flag", "A member flow your team can try". Right: form card. Fields (all with visible `Label`): "Name" (required), "Work email" (required, `type="email"`), "Organization" (required), "Your role" (select: "Self-funded employer", "TPA", "Health plan", "Broker or consultant", "Other"), "What would you like to test?" (Textarea, optional). Button "Book a pilot". Success: replace form with "Thanks. We'll reply by email." Error: "That didn't send. Email us instead at {address}." Implementation: mailto fallback first (builds `mailto:` with subject "BetterBill pilot" and body), optional `lead.create` oRPC (needs B and a `contract` PR). Fine print: "We'll only use this to reply to you."

### 5.10 `/design` gallery
Every bb component in every state on the fixture, plus the token swatches and type scale. `noindex`. Used for screenshots, Playwright visual checks, and Paper judges.

### 5.11 Meta, OG, favicon
- Titles: `/` "BetterBill: check your hospital bill, line by line"; `/for-plans` "BetterBill for plans: evidence-first bill review"; case pages "Your bill check, BetterBill" with `noindex`.
- Descriptions: `/` "Snap or paste a hospital bill. See what looks wrong with the proof, and approve every letter before it's sent. Free to check." `/for-plans` "Line-by-line hospital bill review with evidence tiers and an audit trail, for self-funded employers, TPAs, and plans."
- OG images 1200x630 PNG, hand-made in Paper frames `og-consumer`, `og-plans`, exported to `apps/web/public/og/consumer.png`, `apps/web/public/og/plans.png`: white background, serif headline, the BalanceCard on the right, wordmark bottom left.
- Favicon: the mint tick on ink, `apps/web/public/favicon.svg` plus `favicon.ico` 32 px, `apple-touch-icon.png` 180 px; `manifest.webmanifest` (`theme_color` `#0B1B2B`, `background_color` `#FFFFFF`).
- Viewport `width=device-width, initial-scale=1, viewport-fit=cover`; `theme-color` `#FFFFFF`.

### 5.12 Shared footer (both landings)
`border-t py-10 text-sm`. Row 1: Wordmark; links "How it works", "Pricing", "For plans" (or "For patients" on `/for-plans`), "FAQ", "GitHub" (repo URL). Row 2 `text-xs text-muted-foreground space-y-1`: "BetterBill is informational, not legal or medical advice." / "Demo data is synthetic." / "Made at LA Hacks 2026." No badges, no social proof.

---

## 6. Interfaces and handoffs

| When | With | D gives | D needs |
|---|---|---|---|
| 15:30 | B | Token PR plan; request to remove `dark` class and default Header in root | Repo access, final package alias (`@betterbill/ui`), Vercel preview URL |
| 16:00 G0 | A | Route map (section 5), component prop signatures (section 4) | A's flow: which route owns chat vs case page, when ApprovalSheet opens, what `onApprove` calls |
| 16:00 | B | `Money` formatting expectations | `packages/core/src/schemas.ts` merged; `formatCents` location; `SAMPLE_CASE_ID` seeded |
| 17:00 | C | Copy rules check on flag titles | First synthetic bill JSON plus rendered PNG at `data/synthetic/sample-01.*` with expected flags |
| 18:00 | B | Request (contract PR, B owns): a core function returning `{ billedCents, fairBalanceCents, fairBalanceLowCents, lessThanBilledCents, isEstimate }` so the UI never computes savings | Agreement on the shape |
| 20:00 G1 | A, B | Case page with real `case.get` and `audit.get` data on a phone | Real flags from the rules engine |
| 21:00 | A | ApprovalSheet and AccountPrompt components merged | Letter text and `action.approve` wiring by A |
| 22:00 | C | ComparePriceBar ready | Captured price, source URL, `capturedAt` (or "pending") |
| 00:00 G2 | All | Photo-in to letter-sent path styled | |
| 01:00 | C | Results section ready | `data/eval/results.json` with the agreed shape; `eval.results` from B |
| 01:00 | A | CallTranscriptCard merged | Transcript turns and outcome shape from `call.status` |
| 02:00 | C | Paper frame exports (`design/frames/*.png`) and Paper file link for Devpost | |
| 08:00 | C | Domain live; final screenshots (390 and 1280) in `design/screens/`; Lighthouse numbers | |
| 08:30 | C | Final copy check pass on both landings | Any wording fixes from C's rules |

Rule: D never edits `packages/core`, `packages/api`, or `packages/db`. Data shape gaps go to B as a request.

---

## 7. Timeline (Sat Oct 17 to Sun Oct 18, PDT)

| Time | D does |
|---|---|
| 15:00 to 15:40 | Onboarding; Paper tokens page; hand-draw wordmark, tick, underline, strike marks |
| 15:40 to 16:00 | D-01 tokens and fonts PR |
| **16:00 G0** | |
| 16:00 to 16:45 | Paper: mobile frames `case-audit`, `evidence-sheet`, `balance-card` by hand. D-02 primitives |
| 16:45 to 17:15 | D-03 test harness and `/design` |
| 17:15 to 18:30 | D-04 Money, TierBadge; D-05 BalanceCard, FlagRow, SavingsBar |
| 18:30 to 20:00 | D-06 case page mobile on fixture, then on `case.get` |
| **20:00 G1** | Show at 2 to 3 booths; collect 3 notes |
| 20:00 to 21:00 | D-07 EvidenceSheet and ComparePriceBar |
| 21:00 to 22:00 | D-08 UploadPanel, onboarding, upload screen |
| 22:00 to 22:45 | D-09 line confirmation |
| 22:45 to 23:30 | D-10 ApprovalSheet and AccountPrompt |
| 23:30 to 00:00 | D-11 desktop full insights (BillTable, grid) |
| **00:00 G2** | Pick strengthening option |
| 00:00 to 00:45 | D-12 timeline, transcript card, states |
| 00:45 to 02:00 | D-13 consumer landing |
| 02:00 to 02:50 | D-14 plans landing and pilot form |
| 02:50 to 05:00 | D-17 (D1 redline view), or D-18 if D1 is cut |
| 05:00 to 07:00 | Sleep (second shift; confirm with team) |
| 07:00 to 08:00 | D-15 OG, favicon, meta, Lighthouse fixes; D-16 domain |
| 08:00 to 09:00 | D-19 polish pass, screenshots to C |
| **09:00 Freeze** | Fixes only, through PRs with smoke passing |

Gate checklists:
- **G0 (16:00):** [ ] tokens and fonts merged; [ ] phone shows Geist body and serif test heading on the preview; [ ] `dark` class removed; [ ] Paper file exists with tokens page and wordmark; [ ] route map agreed with A.
- **G1 (20:00):** [ ] case page renders real flags on a phone; [ ] BalanceCard, FlagRow, TierBadge, SavingsBar merged; [ ] Playwright mobile and desktop smoke green in CI; [ ] axe has zero serious violations on `/case/$id`; [ ] 3 Paper frames hand-designed.
- **G2 (00:00):** [ ] upload with camera capture and sample bill; [ ] line confirmation with edit; [ ] evidence sheet opens with source and date; [ ] approval sheet shows exact text; [ ] desktop 8/4 grid; [ ] strengthening option chosen and announced.
- **Freeze (09:00):** [ ] both landings live; [ ] Lighthouse mobile performance and accessibility 95+ on `/` and `/for-plans` (or numbers recorded honestly); [ ] OG images and favicon; [ ] domain resolves with HTTPS; [ ] screenshots and Paper link handed to C; [ ] no lorem, no fake logos, no dashes in copy.

---

## 8. Tickets (PR by PR)

Order: D-01 to D-16 build in sequence, D-17 and D-18 are the strengthening options (section 10, after G2), D-19 is the final polish pass.

### 8.0 BB-RULES (paste this block first, above every ticket prompt)
```
You are implementing UI for BetterBill in a Turborepo (TanStack Start app in apps/web, shared UI in packages/ui, shadcn style "base-lyra" built on @base-ui/react, Tailwind 4, lucide-react). Read AGENTS.md and plans/00-shared-context.md section 8 and plans/D-experience-landing.md sections 3 to 5 before coding.
Hard rules:
- Use only tokens: bg-background, text-foreground, bg-card, bg-muted, text-muted-foreground, border-border, bg-primary, text-primary, bg-secondary, text-secondary-foreground, bg-destructive, text-destructive, ring-ring, bg-ink, text-mint, bg-mint, bg-mint-soft, text-mint-ink, bg-coral-soft, text-coral-ink, bg-amber-soft, text-amber-ink, bg-slate-soft, text-slate-ink, shadow-card, shadow-sheet. No raw hex in components. No other Tailwind palette colors (no blue-500, gray-100, etc.).
- Fonts: font-sans (Geist) for UI, font-serif (Instrument Serif) only where the ticket says. Numbers use tabular-nums. Money is integer cents rendered with <Money/> from packages/ui/src/components/bb/money.tsx. Never compute savings in UI.
- Spacing on a 4 px grid. Screen padding px-5 md:px-8, content mx-auto max-w-6xl. Card: rounded-2xl border bg-card p-5 shadow-card. Buttons: h-12 lg:h-11 rounded-xl; primary actions full width on mobile (w-full sm:w-auto). Chips: rounded-full px-2.5 py-1 text-xs font-medium.
- Icons: lucide only, size-5, strokeWidth={1.75}, aria-hidden unless standalone.
- Base UI: no asChild. Use the render prop, e.g. <Button render={<Link to="/check" />}>Check my bill</Button>.
- Mobile first at 390 px, then md: and lg: (1024 px) changes. No horizontal scroll at 360 px. Targets at least 44 px. Visible focus: focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2.
- Motion 150 to 250 ms ease-out only; everything must work with prefers-reduced-motion.
- Copy: use the exact strings in the ticket. Second person, plain words. Never "illegal", "fraud", or "overcharge". No em dashes or en dashes in any copy. Negative money uses the U+2212 minus via <Money/>.
DO NOT: add UI libraries (no framer-motion, no Radix, no MUI, no chart libs, no icon packs), add gradients (only exception: the hero mask fade in D-13), use emojis in UI, use lorem ipsum, invent testimonials, logos, press, customer counts, partner names, statistics, or compliance badges, edit packages/core, packages/api, or packages/db, or change data contracts.
Verify before opening the PR: bun x biome check --write . && bun run check-types && bun run build && bunx playwright test --project=mobile --project=desktop. Attach screenshots at 390 px and 1280 px (from test-results or /design). Open a PR from the named branch with the PR template filled in (What, Why, Screens, Tests, Contract changes: no, Checklist).
```

### D-01 Tokens, fonts, root cleanup
- Branch `d/tokens-fonts`. Goal: BetterBill tokens and fonts live; scaffold dark defaults removed. Time 30 min. Depends on B's scaffold.
- Files: `packages/ui/src/styles/globals.css`, `packages/ui/package.json`, `apps/web/src/routes/__root.tsx`, `apps/web/src/components/header.tsx` (delete or stop rendering).
- Acceptance: page is white with ink text in Geist; a `font-serif` heading renders Instrument Serif; `bg-ink text-mint` and all soft tokens compile; no `dark` class; viewport includes `viewport-fit=cover`.
- Tests: Playwright: `/` loads, `getComputedStyle(body).fontFamily` contains "Geist". Screenshot.
- Prompt:
```
[Paste BB-RULES]
Ticket D-01, branch d/tokens-fonts.
1. bun add -F @betterbill/ui @fontsource-variable/geist @fontsource/instrument-serif (if the filter flag fails, cd packages/ui && bun add ...). If either package name does not exist on npm, use a Google Fonts <link> in __root.tsx head for "Geist" and "Instrument Serif" instead, and report it.
2. In packages/ui/src/styles/globals.css: after the existing @import lines add
   @import "@fontsource-variable/geist";
   @import "@fontsource/instrument-serif/400.css";
   @import "@fontsource/instrument-serif/400-italic.css";
   Replace the :root block values with: --background:#FFFFFF; --foreground:#0B1B2B; --card:#FFFFFF; --card-foreground:#0B1B2B; --popover:#FFFFFF; --popover-foreground:#0B1B2B; --primary:#1E4ED8; --primary-foreground:#FFFFFF; --secondary:#EEF2FF; --secondary-foreground:#1E3A8A; --muted:#F4F6FA; --muted-foreground:#5B6B7C; --accent:#F4F6FA; --accent-foreground:#0B1B2B; --destructive:#E5484D; --border:#E3E8EF; --input:#E3E8EF; --ring:#1E4ED8; --radius:16px; --ink:#0B1B2B; --mint:#0F9D76; --mint-soft:#D1FAE5; --mint-ink:#065F46; --coral-soft:#FDECEC; --coral-ink:#B4232A; --amber-soft:#FEF3C7; --amber-ink:#92400E; --slate-soft:#EEF2F6; --slate-ink:#334155. Keep chart and sidebar vars but set them to these colors (sidebar = background/foreground/primary). Leave the .dark block but do not use it.
   In @theme inline: set --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif; add --font-serif: "Instrument Serif", ui-serif, Georgia, serif; add --color-ink, --color-mint, --color-mint-soft, --color-mint-ink, --color-coral-soft, --color-coral-ink, --color-amber-soft, --color-amber-ink, --color-slate-soft, --color-slate-ink mapped to the vars; replace the radius calc lines with --radius-sm:6px; --radius-md:8px; --radius-lg:10px; --radius-xl:12px; --radius-2xl:var(--radius); --radius-3xl:24px; add --shadow-card: 0 1px 2px rgba(11,27,43,0.06), 0 8px 24px rgba(11,27,43,0.06); --shadow-sheet: 0 -8px 32px rgba(11,27,43,0.12).
   In @layer base add: html { -webkit-text-size-adjust:100%; } body { @apply antialiased; font-feature-settings:"ss01"; } and the prefers-reduced-motion block from plan section 3.6.
3. apps/web/src/routes/__root.tsx: remove className="dark" from <html>; remove the Header import and the grid h-svh wrapper (render <Outlet/> directly); remove the devtools in production (render only when import.meta.env.DEV); set viewport content "width=device-width, initial-scale=1, viewport-fit=cover"; add meta theme-color #FFFFFF; title "BetterBill".
4. Add a temporary block to apps/web/src/routes/index.tsx: <main className="px-5 py-16"><h1 className="font-serif text-[40px] leading-[44px]">Your hospital bill, checked line by line.</h1><p className="mt-4 text-muted-foreground">Tokens check.</p><div className="mt-6 inline-flex rounded-2xl bg-ink p-5 font-serif text-[48px] text-mint tabular-nums">$10,216</div></main>
Definition of done: preview shows serif heading, ink card with mint number, Geist body, no dark theme. Open a PR.
```

### D-02 shadcn primitives restyled
- Branch `d/primitives`. Goal: add and restyle primitives to the BetterBill look. Time 45 min. Depends D-01.
- Files: `packages/ui/src/components/{button,card,badge,sheet,dialog,tabs,table,accordion,progress,separator,alert,avatar,popover,input,textarea,label,checkbox,skeleton,sonner,tooltip}.tsx`, `packages/ui/src/hooks/use-is-desktop.ts`.
- Acceptance: Button sizes default `h-12 lg:h-11 rounded-xl px-5 text-base font-medium`; Card `rounded-2xl border bg-card p-5 shadow-card`; Input `h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2`; Sheet bottom variant `rounded-t-3xl`; no `rounded-none` left in primitives.
- Tests: `/design` primitives section screenshot (after D-03); axe on it.
- Prompt:
```
[Paste BB-RULES]
Ticket D-02, branch d/primitives.
1. cd packages/ui && bunx shadcn@latest add sheet dialog tabs table accordion progress badge separator alert avatar popover. Keep existing button, card, input, textarea, label, checkbox, skeleton, sonner, tooltip.
2. Restyle (edit cva strings, keep APIs):
   Button base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-base font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0".
   Variants: default "bg-primary text-primary-foreground hover:bg-primary/90"; secondary "bg-secondary text-secondary-foreground hover:bg-secondary/70"; outline "border border-border bg-background hover:bg-muted"; ghost "hover:bg-muted"; destructive "bg-coral-soft text-coral-ink hover:bg-coral-soft/70"; link "text-primary underline-offset-4 hover:underline h-auto px-0".
   Sizes: default "h-12 px-5 lg:h-11"; sm "h-10 px-4 text-sm rounded-lg"; lg "h-14 px-6 text-lg"; icon "size-11 rounded-xl".
   Card: "rounded-2xl border bg-card text-card-foreground p-5 shadow-card". CardTitle "text-lg leading-6 font-semibold". CardDescription "text-sm text-muted-foreground".
   Badge base: "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium".
   Input: "h-12 w-full rounded-xl border border-transparent bg-muted px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive". Textarea same with "min-h-32 py-3".
   Sheet: overlay "bg-ink/40"; side bottom "inset-x-0 bottom-0 max-h-[85svh] rounded-t-3xl border-t bg-background shadow-sheet"; side right "inset-y-0 right-0 h-full w-full border-l bg-background sm:max-w-[440px]"; transitions 250 ms ease-out. Dialog content "rounded-2xl bg-background p-6 shadow-card max-w-xl".
   Table header cell "h-11 bg-muted px-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"; cell "px-4 py-3 text-sm"; row "border-b".
   Accordion trigger "flex w-full items-center justify-between py-4 text-left text-base font-medium min-h-[56px]"; content "pb-4 text-base leading-6 text-muted-foreground".
   Remove every remaining "rounded-none".
3. Create packages/ui/src/hooks/use-is-desktop.ts: returns boolean from matchMedia("(min-width: 1024px)"), false during SSR, updates on change.
Definition of done: no rounded-none in packages/ui/src/components, types clean, existing pages still build. Open a PR.
```

### D-03 Test harness and `/design` gallery
- Branch `d/e2e-design`. Goal: Playwright projects, axe helper, gallery route. Time 30 min. Depends D-02.
- Files: `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/a11y.ts`, `apps/web/src/routes/design.tsx`, root `package.json` (script `e2e`).
- Acceptance: `bunx playwright test` runs `mobile` (iPhone 14) and `desktop` (1280x800) projects; axe helper fails on serious or critical violations; `/design` shows swatches, type scale, primitives.
- Prompt:
```
[Paste BB-RULES]
Ticket D-03, branch d/e2e-design.
1. bun add -d @playwright/test @axe-core/playwright at the repo root. playwright.config.ts: testDir "e2e"; use.baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001" (check the port apps/web dev prints and use it); webServer { command: "bun run build && bun run --filter web serve", url: baseURL, reuseExistingServer: true, timeout: 180000 } only when E2E_BASE_URL is unset; projects: { name: "mobile", use: { ...devices["iPhone 14"] } }, { name: "desktop", use: { viewport: { width: 1280, height: 800 } } }. Add "e2e": "playwright test" to root package.json.
2. e2e/a11y.ts exports async function expectNoA11yViolations(page) using AxeBuilder with tags wcag2a, wcag2aa; fail if any violation has impact "serious" or "critical"; print ids.
3. e2e/smoke.spec.ts: test "landing loads" (goto "/", expect heading level 1 visible, run a11y); test "design gallery" (goto "/design", screenshot fullPage to test-results/design-{project}.png).
4. apps/web/src/routes/design.tsx: head meta robots noindex. Sections with H2 (text-[22px] leading-[28px] font-semibold): "Color" (grid of 64 px swatches rounded-xl border with token name text-xs and hex for every token in plan 3.2), "Type" (each row of plan 3.3 rendered with its own classes and the label), "Buttons" (each variant and size, disabled), "Inputs", "Card", "Badges", "Sheet" (button opens bottom sheet with sample text). Page wrapper "mx-auto max-w-6xl px-5 py-10 md:px-8 space-y-12". Later tickets append their components here.
Definition of done: bun run e2e passes locally on both projects. Open a PR.
```

### D-04 Money and TierBadge
- Branch `d/money-tier`. Time 30 min. Depends D-03. Files: `packages/ui/src/components/bb/money.tsx`, `packages/ui/src/components/bb/tier-badge.tsx`, `packages/ui/src/components/bb/index.ts`, `apps/web/src/routes/design.tsx`, `packages/ui/src/components/bb/money.test.tsx` (Vitest if configured in ui, else `e2e/components.spec.ts`).
- Acceptance: spec 4.1 and 4.2; `-102247` renders text "−$1,022.47" with U+2212; aria-labels per spec.
- Prompt:
```
[Paste BB-RULES]
Ticket D-04, branch d/money-tier. Implement exactly plan sections 4.1 (Money) and 4.2 (TierBadge) in packages/ui/src/components/bb/money.tsx and tier-badge.tsx, export both from packages/ui/src/components/bb/index.ts, and add package.json export "./components/bb/*": "./src/components/bb/*.tsx" if missing.
Money: if @betterbill/core exports formatCents use it; otherwise format inside money.tsx with Intl.NumberFormat("en-US",{maximumFractionDigits:0}) on Math.trunc(Math.abs(cents)/100) and pad cents to 2 digits. Minus sign is "−". Sup classes "text-[0.55em] align-top ml-0.5 relative top-[0.15em]". Root "tabular-nums whitespace-nowrap". aria-label "{label}, {dollars} dollars and {cents} cents" (prefix "minus " when negative; omit "and 0 cents").
TierBadge: classes, icons (BadgeCheck, BookOpen, Landmark, CircleDashed at size-3.5 strokeWidth 2), and labels exactly as the 4.2 table.
Add to /design a "Money" section (examples 125037, -102247, 8400 hide, 1200000) and a "Tiers" section (all four).
Test: render Money cents={-102247} sign="auto" and assert text "−$1,022" plus ".47" and the aria-label. Definition of done: tests green, /design screenshot attached. Open a PR.
```

### D-05 BalanceCard, FlagRow, SavingsBar
- Branch `d/core-cards`. Time 60 min. Depends D-04. Files: `packages/ui/src/components/bb/balance-card.tsx`, `flag-row.tsx`, `savings-bar.tsx`, `index.ts`, `apps/web/src/routes/design.tsx`, `apps/web/src/fixtures/sample-case.ts` (static fixture copied from C's JSON shape, labelled synthetic).
- Acceptance: specs 4.3 to 4.5 exactly; BalanceCard at 390 px fits without wrapping the number; FlagRow is a button with full aria-label; SavingsBar hidden at `lg`.
- Prompt:
```
[Paste BB-RULES]
Ticket D-05, branch d/core-cards. Implement plan sections 4.3 BalanceCard, 4.4 FlagRow, 4.5 SavingsBar exactly (props, classes, copy, a11y). FlagRow amount uses text-coral-ink (not text-destructive). BalanceCard number uses font-serif text-mint and <Money/>; chip text "<Money sign=negative/> less than billed"; caption "Billed <Money/>. As low as <Money/> if every flag holds." Estimate chip "Estimate" with classes "rounded-full bg-amber-soft px-2.5 py-1 text-xs font-medium text-amber-ink".
Create apps/web/src/fixtures/sample-case.ts exporting a typed sample (hospital "Sample General Hospital", Los Angeles, CA; billedCents 1200000; fairBalanceCents 1021600; fairBalanceLowCents 951600; lessThanBilledCents 178400; isEstimate true; confirmedCents 8400; potentialLowCents 170000; potentialHighCents 240000; flags: duplicate 85025 confirmed 8400 title "Same lab test billed twice" explanation "CBC with differential (85025), same date, $84.00 each."; published 72148 title "Higher than the hospital's published price" explanation "MRI lumbar, no contrast (72148) billed $6,900.00."; eob confirmed title "Bill asks for more than your insurer says" explanation "Your EOB lists a lower amount you owe."). Add a top comment: "Synthetic. Replace values with data/synthetic fixture from C. Illustrative until the price is captured."
Add all three to /design with states (loading, no savings). Definition of done: /design screenshots at 390 and 1280; axe clean. Open a PR.
```

### D-06 Case page (mobile) on real data
- Branch `d/case-page`. Time 90 min. Depends D-05, B's `case.get` and `audit.get`. Files: `apps/web/src/routes/case/$id/index.tsx`, `apps/web/src/components/app-bar.tsx`, `apps/web/src/components/assistance-card.tsx`, `e2e/case.spec.ts`.
- Acceptance: spec 5.4; max 3 flags then "See all {n}"; disclaimer footer; SavingsBar fixed with safe-area padding; loads `SAMPLE_CASE_ID`.
- Tests: mobile: BalanceCard, 3 FlagRows, SavingsBar visible; axe; screenshot.
- Prompt:
```
[Paste BB-RULES]
Ticket D-06, branch d/case-page. Build apps/web/src/routes/case/$id/index.tsx per plan 5.4. Data: use the oRPC client in apps/web/src/utils/orpc.ts with TanStack Query: case.get({id}), audit.get({caseId}). Map to component props without computing savings: use the summary object B exposes (ask in the PR if missing; until then read from apps/web/src/fixtures/sample-case.ts when id === "sample").
Layout: <AppBar title="Your bill check" back="/check"/> (apps/web/src/components/app-bar.tsx, classes from plan section 5 intro); <main className="mx-auto max-w-6xl px-5 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] md:px-8 space-y-6">; H1 hospital name (text-[28px] leading-[34px] font-semibold tracking-[-0.01em]) with caption city, state; BalanceCard; section header row "What looks wrong" (H2 classes) plus chip "{n} flags"; Card with p-2 containing up to 3 FlagRow (sort: confirmed, published, rule, estimate, then amount desc); button variant ghost "See all {n}" expanding the rest; AssistanceCard (plan 5.4 copy; status chip plus TierBadge tier="estimate"); Accordion "How we estimated this" listing savings.method; link row "Activity" to /case/$id/activity; footer disclaimer "BetterBill is informational, not legal or medical advice." SavingsBar actionLabel "Send the letter" calling an onAction prop that A wires (for now console.info and toast "Coming soon").
Loading: CaseSkeleton from states (if not yet built, use Skeleton blocks sized like the components). Error: "Something went wrong on our side" copy from 4.13.
e2e/case.spec.ts (mobile + desktop): goto /case/sample, expect text "Your fair balance", expect 3 FlagRow buttons, expect "BetterBill is informational, not legal or medical advice.", a11y check, screenshot. Open a PR.
```

### D-07 EvidenceSheet and ComparePriceBar
- Branch `d/evidence-sheet`. Time 60 min. Depends D-06, C's capture for real values. Files: `packages/ui/src/components/bb/evidence-sheet.tsx`, `compare-price-bar.tsx`, `apps/web/src/routes/case/$id/index.tsx`, `e2e/case.spec.ts`.
- Acceptance: specs 4.6, 4.7; bottom sheet on mobile, right sheet at `lg`; Copy works; "Price capture pending" when no capture.
- Prompt:
```
[Paste BB-RULES]
Ticket D-07, branch d/evidence-sheet. Implement plan 4.6 EvidenceSheet and 4.7 ComparePriceBar exactly, using the shadcn Sheet from D-02 and useIsDesktop for side ("bottom" | "right"). Section headings are H3 (text-lg leading-6 font-semibold). Copy button uses navigator.clipboard.writeText and sonner toast "Copied". Source captions format dates with Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}). ComparePriceBar width style for the published bar: style={{width: `${Math.min(100, Math.round(published/billed*100))}%`}}. If compare is undefined for a published-tier flag, show "Price capture pending. We only compare against prices we've captured with a date."
Wire FlagRow onOpen in the case page to open the sheet with that flag. Add to /design.
Tests: tap first FlagRow, expect dialog with "What we found", "What to say to billing"; press Escape closes; desktop: sheet is on the right (bounding box x > 800). a11y with sheet open. Open a PR.
```

### D-08 UploadPanel, onboarding, upload screen
- Branch `d/upload-onboarding`. Time 60 min. Depends D-05, B's `bill.parsePhoto`, `bill.parseText`, `case.create`. Files: `packages/ui/src/components/bb/upload-panel.tsx`, `packages/ui/src/components/bb/states.tsx`, `apps/web/src/routes/check.tsx`, `apps/web/src/routes/welcome.tsx`, `e2e/upload.spec.ts`.
- Acceptance: specs 4.9, 4.13, 5.1, 5.2; camera input has `capture="environment"`; sample button reaches confirm screen.
- Prompt:
```
[Paste BB-RULES]
Ticket D-08, branch d/upload-onboarding. Implement plan 4.9 UploadPanel and 4.13 states (EmptyState, ErrorState, LoadingState, CaseSkeleton) with the exact copy, then routes /welcome (plan 5.1) and /check (plan 5.2).
Upload: hidden inputs triggered by buttons (do not use label-wrapped inputs). Photo input: <input type="file" accept="image/*" capture="environment" multiple className="sr-only" />. Downscale images client-side to max 2000 px long edge as JPEG quality 0.85 using a canvas before calling onPhotos. Paste flow reveals Textarea with Label "Bill text".
/check: on first visit (localStorage key bb_onboarded absent, wrapped in try/catch) redirect to /welcome. Handlers: onPhotos -> case.create then bill.parsePhoto; onText -> case.create then bill.parseText; onSample -> case.create({sample:true}) or the sample id B provides; then navigate to /case/$id/confirm. Show LoadingState "Reading your bill" while pending; ErrorState "We couldn't read this photo" on failure with actions "Retake photo" and "Paste the text".
/welcome: three cards with icons in size-14 rounded-full bg-mint-soft text-mint-ink, title H1 class, body text-muted-foreground; dots; "Skip" ghost top right; last button "Check my bill" sets bb_onboarded=1 and goes to /check. Swipe is optional; Next is required.
Tests: /check shows "Take a photo", "Try a sample bill"; input[capture=environment] exists; clicking sample lands on a URL matching /case/.+/confirm (mock if backend unavailable using page.route). a11y on both routes. Open a PR.
```

### D-09 Line confirmation
- Branch `d/line-confirm`. Time 45 min. Depends D-08, B's `bill.confirmLines`, `audit.run`. Files: `packages/ui/src/components/bb/line-confirm-row.tsx`, `apps/web/src/routes/case/$id/confirm.tsx`, `e2e/confirm.spec.ts`.
- Acceptance: spec 4.8, 5.3; editing a line sets `userEdited`; "Looks right" runs audit and navigates.
- Prompt:
```
[Paste BB-RULES]
Ticket D-09, branch d/line-confirm. Implement plan 4.8 LineConfirmRow and the route in plan 5.3. Confidence dot colors: >=0.9 bg-mint (sr-only "High confidence"), 0.7 to 0.9 bg-amber-ink ("Check this line"), <0.7 bg-destructive ("Low confidence, please check"). Charge input shows dollars; convert to integer cents with Math.round(parseFloat(v)*100) only for the edited field (this is input parsing, not savings math). Totals row shows B's totals check result; if B returns a mismatch, render the "Your lines don't add up to the total" ErrorState inline. Sticky bottom bar: same container classes as SavingsBar but content is only <Button className="w-full">Looks right</Button>; on lg the button sits under the list. Desktop: lg:grid lg:grid-cols-12 lg:gap-8, page image lg:col-span-7 with an absolutely positioned div "absolute rounded-md ring-2 ring-primary" placed from line.source.bbox (percent units), rows lg:col-span-5.
Tests: edit first line description, Save, expect new text; click Looks right, expect navigation to /case/$id. a11y. Open a PR.
```

### D-10 ApprovalSheet and AccountPrompt
- Branch `d/approval`. Time 45 min. Depends D-07; A wires `action.approve`. Files: `packages/ui/src/components/bb/approval-sheet.tsx`, `account-prompt.tsx`, `apps/web/src/routes/design.tsx`, `e2e/approval.spec.ts`.
- Acceptance: specs 4.10, 4.15; initial focus is not the Approve button; shows exact text passed in.
- Prompt:
```
[Paste BB-RULES]
Ticket D-10, branch d/approval. Implement plan 4.10 ApprovalSheet and 4.15 AccountPrompt as presentational components (A wires data and callbacks). Mobile: Sheet side bottom; desktop (useIsDesktop): Dialog max-w-xl. Use initialFocus on the "What we'll send" heading (Base UI Dialog initialFocus prop; if unavailable, focus it in an effect). Buttons order on mobile: primary "Approve and send" or "Approve and call" (w-full), then secondary "Not now". Desktop: right-aligned row, secondary first. Pending shows LoaderCircle animate-spin motion-reduce:animate-none and label "Sending" or "Calling".
Add both to /design with a sample letter (3 short paragraphs referencing the two sample flags; label "Sample letter text"). Tests: open from /design, expect the exact sample text and "Nothing is sent until you tap Approve."; Approve is not document.activeElement on open. a11y. Open a PR and tag A.
```

### D-11 Desktop full insights (BillTable and 8/4 grid)
- Branch `d/desktop-insights`. Time 45 min. Depends D-06, D-07. Files: `packages/ui/src/components/bb/bill-table.tsx`, `apps/web/src/routes/case/$id/index.tsx`, `e2e/case.spec.ts`.
- Acceptance: spec 4.12, 5.5; at 1280 px the right rail is sticky; table rows open the right sheet; no mobile layout regressions.
- Prompt:
```
[Paste BB-RULES]
Ticket D-11, branch d/desktop-insights. Implement plan 4.12 BillTable and the desktop composition in plan 5.5 in the existing case route. Wrap content: <main className="mx-auto max-w-6xl px-5 md:px-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:py-8">. Left: lg:col-span-8. Right: <aside className="hidden lg:col-span-4 lg:block lg:sticky lg:top-20 lg:self-start space-y-4">. On mobile keep the D-06 FlagRow list and hide BillTable (hidden lg:block); on desktop hide the FlagRow list (lg:hidden). Savings breakdown card rows: "Confirmed" (Money, text-mint-ink font-semibold), "Possible" ("{low} to {high}", label "Estimate" chip), "Financial assistance" (status text). Caption "Estimates depend on the hospital. Not guaranteed." Actions card: Button "Send the letter" w-full, Button variant secondary "Call for me" w-full. Timeline slot: render ActivityTimeline if merged, else a Card "Activity" with "No activity yet".
Tests (desktop): table has a row for every line; clicking a flagged row opens a dialog positioned right; aside is visible and remains in viewport after scrolling 1200 px. Mobile: table not visible. Open a PR.
```

### D-12 ActivityTimeline, CallTranscriptCard, states page
- Branch `d/timeline-transcript`. Time 45 min. Depends D-06; A's `call.status` shape; B's `event.list`. Files: `packages/ui/src/components/bb/activity-timeline.tsx`, `call-transcript-card.tsx`, `apps/web/src/routes/case/$id/activity.tsx`, `e2e/activity.spec.ts`.
- Prompt:
```
[Paste BB-RULES]
Ticket D-12, branch d/timeline-transcript. Implement plan 4.11 ActivityTimeline and 4.14 CallTranscriptCard exactly, then route /case/$id/activity per plan 5.6 using event.list({caseId}) and call.status (A). Timeline markers: done "flex size-8 items-center justify-center rounded-full border-2 border-mint bg-background text-mint" with <Check className="size-4" strokeWidth={2}/>; pending "size-8 rounded-full border-2 border-border bg-background". Connector "absolute left-[15px] top-8 bottom-0 w-px" with bg-mint when the item is done, else bg-border; omit on last item. Times via Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}). Transcript: aria-live polite while status is in_progress; recorded prop shows chip "Recorded call, labelled" (bg-amber-soft text-amber-ink). Add both to /design with sample events (labelled sample). Tests: 3 done items render with "Done" sr text; transcript shows outcome "Reference number". a11y. Open a PR.
```

### D-13 Consumer landing `/`
- Branch `d/landing-consumer`. Time 75 min. Depends D-05; fixture values from C. Files: `apps/web/src/routes/index.tsx`, `apps/web/src/components/landing/{nav,hero,how,tiers,pricing,privacy-faq,closing,site-footer}.tsx`, `packages/ui/src/components/bb/wordmark.tsx`, `apps/web/public/marks/{underline,tick,strike}.svg`, `e2e/landing.spec.ts`.
- Acceptance: every section and string in plan 5.8; Lighthouse mobile performance and accessibility 95+; LCP element is the H1 text (not an image); no layout shift from fonts beyond 0.05 CLS.
- Prompt:
```
[Paste BB-RULES]
Ticket D-13, branch d/landing-consumer. Build the consumer landing exactly as plan section 5.8: same section order, same strings (copy them verbatim from the plan, do not rewrite), same classes. Split into components under apps/web/src/components/landing/. Shared footer per plan 5.12 in site-footer.tsx (export for D-14).
Specifics:
- Section wrapper: <section id=... className="px-5 py-16 md:px-8 lg:py-28"><div className="mx-auto max-w-6xl">. Section titles: "font-serif text-[32px] leading-[36px] lg:text-[44px] lg:leading-[48px]". Tiers and FAQ bands add bg-muted.
- Hero H1: "font-serif text-[40px] leading-[44px] tracking-[-0.01em] lg:text-[64px] lg:leading-[68px] text-balance". Wrap "line by line." in <span className="relative inline-block"> with <img src="/marks/underline.svg" alt="" aria-hidden className="pointer-events-none absolute -bottom-1 left-0 w-full" />. If the SVG from Paper is not in the repo yet, create a simple placeholder path (single quadratic curve, stroke #1E4ED8, width 2, round caps) and note it in the PR.
- Hero visual: frame "relative mt-12 rounded-3xl border bg-muted p-4 lg:mt-0 lg:p-6"; BalanceCard from the sample fixture; flags card "mt-4 rounded-2xl border bg-card p-2 shadow-card [mask-image:linear-gradient(to_bottom,black_80%,transparent)]" containing three FlagRows wrapped in a div aria-hidden="true" with className "pointer-events-none"; an sr-only paragraph: "Sample result: three flags, 84 dollars confirmed, and an estimated 1,700 to 2,400 dollars more." Caption "Sample bill. Synthetic data." (text-xs text-muted-foreground mt-3).
- Hero number count-up: optional; if added, use requestAnimationFrame over 600 ms and skip when matchMedia("(prefers-reduced-motion: reduce)").matches. Server render shows the final number.
- "Try a sample bill" uses the same handler as /check's sample button (import from a shared hook apps/web/src/hooks/use-start-sample.ts; create it if missing).
- Contrast table: on md+ a 3-column grid with header row; below md, each row is a dl with dt label (text-xs uppercase tracking-[0.08em] text-muted-foreground) and two dd blocks labelled "Expert services" and "BetterBill".
- Pricing cards use Card; check icons Check size-5 text-mint-ink.
- FAQ uses shadcn Accordion (type single, collapsible).
- Closing band: "mx-5 rounded-3xl bg-ink px-6 py-14 text-center text-white md:mx-8 lg:px-16 lg:py-20"; primary Button and secondary Button.
- Head: title, description, og:image /og/consumer.png, twitter:card summary_large_image (plan 5.11).
- Images: none besides SVG marks. No fonts beyond the two families.
Tests: mobile and desktop: H1 text "Your hospital bill, checked line by line." visible; buttons "Check my bill" and "Try a sample bill" visible above the fold at 390x664 (iPhone 14 viewport); footer contains "BetterBill is informational, not legal or medical advice."; page has no horizontal overflow (document.documentElement.scrollWidth <= innerWidth); a11y; full-page screenshots. Run: bunx lighthouse <preview-url> --only-categories=performance,accessibility --form-factor=mobile --screenEmulation.mobile --quiet --output=json --output-path=./lh-home.json and paste scores in the PR. Open a PR.
```

### D-14 Plans landing `/for-plans` and pilot form
- Branch `d/landing-plans`. Time 50 min. Depends D-13, D-11 (BillTable), B's `eval.results` (optional), C's results file (optional). Files: `apps/web/src/routes/for-plans.tsx`, `apps/web/src/components/landing/plans/{hero,fit,evidence,results,integration,security,pilot-form}.tsx`, `e2e/landing.spec.ts`.
- Acceptance: plan 5.9 verbatim; results section shows real numbers with N and date or the "Measured results coming" card; form has labels and works with mailto.
- Prompt:
```
[Paste BB-RULES]
Ticket D-14, branch d/landing-plans. Build /for-plans exactly as plan 5.9 with verbatim strings, reusing landing section wrappers and site-footer from D-13 (footer link "For patients" to "/").
Results: in the route loader call orpc eval.results (server side). Render stats only when the response has numeric fields; caption strings must include bill counts and dates from the response. Any error, null, or missing field renders the single card "Measured results coming. We publish recall and false-flag rates with the bill count and date. We never show targets as results." Never hardcode a number.
Hero visual: BillTable with 4 rows from the sample fixture (non-interactive: pass onOpen noop and wrap aria-hidden with an sr-only summary), then the event strip (three rows, text-xs, grid grid-cols-[64px_64px_1fr] gap-2, tabular-nums). Caption "Sample review. Synthetic data."
Security section: two Cards, titles "Today" and "Not yet"; list items with Check (text-mint-ink) for Today and Circle (text-muted-foreground) for Not yet. No badges.
Pilot form: native form with Label/Input/Textarea and a native <select> styled like Input (h-12 rounded-xl bg-muted px-4). Validate required fields and email type; on submit build mailto:${import.meta.env.VITE_PILOT_EMAIL} with encodeURIComponent subject "BetterBill pilot" and a body listing the fields, then set window.location.href and show the success state "Thanks. We'll reply by email." If VITE_PILOT_EMAIL is unset, disable submit and show "Pilot email not configured" (dev only). If B has merged lead.create, call it first and fall back to mailto on error.
Head: title, description, og:image /og/plans.png.
Tests: H1 "Bill review your members can see." visible; results section shows either a stat with "Measured on" or the "Measured results coming." text; form fields have accessible names; a11y; screenshots. Lighthouse as in D-13. Open a PR.
```

### D-15 OG images, favicon, manifest, Lighthouse pass
- Branch `d/meta-perf`. Time 40 min. Depends D-13, D-14. Files: `apps/web/public/{favicon.svg,favicon.ico,apple-touch-icon.png,manifest.webmanifest}`, `apps/web/public/og/{consumer,plans}.png`, `apps/web/src/routes/__root.tsx`.
- Prompt:
```
[Paste BB-RULES]
Ticket D-15, branch d/meta-perf. Add the exported Paper assets (D provides PNG and SVG files in design/exports/) to apps/web/public as listed in plan 5.11. If an export is missing, generate a placeholder favicon.svg: 32x32 rect rx 8 fill #0B1B2B with a tick path stroke #0F9D76 width 3 round caps; never use a placeholder OG image, omit og:image instead. In __root.tsx head add links: icon svg, icon ico sizes 32x32, apple-touch-icon, manifest; meta og:site_name "BetterBill". manifest: name "BetterBill", short_name "BetterBill", display standalone, theme_color "#0B1B2B", background_color "#FFFFFF", icons 192 and 512 (export from Paper).
Performance: preload the Geist and Instrument Serif woff2 files used above the fold (find hashed URLs in the build output; if preloading hashed fontsource files is not practical, document why). Make sure landing pages load no client JS beyond hydration (devtools only in DEV). Run Lighthouse mobile and desktop on / and /for-plans; fix any accessibility issue below 100 and any performance issue that is cheap (image sizes, unused JS from devtools). Paste the four score pairs in the PR. Open a PR.
```

### D-16 Domain (GoDaddy)
- Branch `d/domain` (only `docs/DOMAIN.md` or README line; DNS work is outside the repo). Time 20 min plus DNS wait. Depends on Vercel project (B).
- Name check done Sat 15:00 by DNS lookup (not a registrar check, so **UNVERIFIED**): `betterbill.com` (Hetzner nameservers), `betterbill.app`, `betterbill.co`, `betterbill.org` (Porkbun), `betterbill.ai` (Cloudflare), `getbetterbill.com` (name.com), `betterbill.io` (parked), `betterbill.xyz` (Afternic, likely for sale) all have nameservers, so they are registered. No nameservers found for `betterbill.health`, `betterbill.us`, `betterbill.dev`, `betterbill.site`, `trybetterbill.com`, `usebetterbill.com`, `fairbalance.health`. A web search found no product named "BetterBill"; it did find "Better", a 2017 app for out-of-network claims (similar name, different product). Not a trademark search.
- Pick order on GoDaddy: 1 `trybetterbill.com`, 2 `betterbill.health`, 3 `usebetterbill.com`, 4 `betterbill.us`. Fallback names if the team renames: "Fair Balance" (`fairbalance.health`), "Billproof", "LineCheck" (both unchecked). Check MLH's GoDaddy offer terms (free domain code, eligible TLDs) at the MLH booth before paying.
- Steps: buy on GoDaddy; Vercel project, Settings, Domains, add the apex and `www`; at GoDaddy DNS set the records Vercel shows (typically an A record for the apex and a CNAME for `www`; use exactly what Vercel displays); wait for the HTTPS certificate; set `www` to redirect to the apex.
- Acceptance: `curl -sI https://<domain>` returns 200 from Vercel. Prompt: none (manual task).

### D-19 Final polish pass (07:00 to 09:00)
- Branch `d/polish`. Time 60 min. Files: any D-owned file.
- Prompt:
```
[Paste BB-RULES]
Ticket D-19, branch d/polish. Do a consistency pass only (no new features): 1) grep the repo for the em dash (U+2014) and en dash (U+2013) characters, "lorem", "illegal", "fraud", "overcharge", "rounded-none", "text-destructive" on amounts, raw hex in apps/web/src and packages/ui/src/components/bb, and fix each; 2) check every screen at 360, 390, 768, 1024, 1280 for horizontal overflow and 44 px targets; 3) confirm every result screen shows the disclaimer; 4) run the full Playwright suite and Lighthouse; 5) export screenshots of every route at 390 and 1280 to design/screens/. Open a PR with the list of fixes.
```

---

## 9. Testing

- **Playwright projects:** `mobile` = `devices["iPhone 14"]` (390x664 viewport, WebKit), `desktop` = 1280x800 Chromium. Run locally against `build && serve`, in CI against the Vercel preview (`E2E_BASE_URL`).
- **Smoke set (D owns, must pass before every merge after G1):** landing loads with H1 and both CTAs; `/for-plans` loads with results or the honest placeholder; `/check` shows camera input and sample button; sample bill reaches confirm; confirm to case page; case page shows BalanceCard and flags; evidence sheet opens and closes with Escape; approval sheet shows exact text; desktop table renders with sticky aside; no horizontal overflow at 360 px (`page.setViewportSize({width:360,height:740})`).
- **Accessibility:** `@axe-core/playwright` on every route and with each sheet open; zero serious or critical. Manual: tab through landing and case page, focus ring visible on every control, VoiceOver reads a FlagRow as one sentence with the amount.
- **Contrast:** amounts use `text-coral-ink` and `text-mint-ink`; `text-mint` only on ink or at 24 px+.
- **Lighthouse:** `bunx lighthouse <url> --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile --quiet --output=json` for `/`, `/for-plans`, `/case/sample`; desktop with `--preset=desktop`. Target 95+ performance and accessibility on landings; record real numbers in the PR and in `design/LIGHTHOUSE.md` only if C wants them for Devpost (never round up).
- **Reduced motion:** Playwright `test.use({ reducedMotion: "reduce" })` run of the landing and case spec; assert the hero number shows its final value immediately and the sheet opens without transition.
- **Visual check:** full-page screenshots attached to every PR; `/design` screenshot compared by eye against Paper frames.

---

## 10. Strengthening options (pick one at G2)

**Recommendation:** D1 first. It is the Paper prize hero and the most memorable screen. D2 is feasible in addition only if D is at least 60 minutes ahead at G2 (landing pages already merged). Time math: after G2, D has about 5 hours before sleep (00:00 to 05:00). Landings take 2 hours, D1 2.5 hours, D2 1.5 hours: 6 hours total, so both do not fit unless D2 shrinks to the share card only (45 minutes) and the pricing section on `/` stands in for a pricing page.

### D-17 (D1) The redline view `/case/$id/redline`
- Branch `d/redline-view`. Time 2.5 h. Depends D-07, real flags. Files: `apps/web/src/routes/case/$id/redline.tsx`, `packages/ui/src/components/bb/redline-document.tsx`, `packages/ui/src/components/bb/margin-note.tsx`, `apps/web/public/marks/*.svg`, `e2e/redline.spec.ts`.
- Design (hand-designed in Paper frame `redline-viewer` before any code): the bill rendered as a typeset document on paper (`bg-card`, `max-w-[720px]`, thin `border`, generous `p-8 lg:p-12`), lines as a ledger (`grid grid-cols-[80px_1fr_80px_100px]` date, description, code, amount, hairline rows). Flagged amounts get the hand-drawn strike in `--destructive` with the corrected or at-stake amount written beside in `text-coral-ink` (for confirmed) or a cobalt underline with "check" note (for published or rule). Margin notes on desktop sit in a right gutter (`lg:grid-cols-[1fr_280px]`), connected by a 1 px cobalt leader line; each note: TierBadge, one-sentence evidence, source and date. Mobile: notes appear inline under the line as indented cards with a left cobalt rule. Running savings total pinned at the bottom of the document: "Confirmed so far {Money}" plus "Possible {low} to {high} (estimate)". Strike lines draw in over 400 ms in sequence when scrolled into view, disabled under reduced motion.
- Acceptance: works on the sample and on a real audit; every mark has a text equivalent (`<del>` for struck amounts with `aria-label`); no new libraries; disclaimer footer.
- Prompt:
```
[Paste BB-RULES]
Ticket D-17 (D1), branch d/redline-view. Implement the redline view described in plan section 10 D-17, matching the Paper frame "redline-viewer" (use Paper MCP to read the selected frame if available; otherwise follow this spec). Route /case/$id/redline loads case.get and audit.get. Component RedlineDocument props: { hospital: {name; city; state}; statementDate; lines: Line[]; flags: Flag[]; summary: { confirmedCents; potentialLowCents; potentialHighCents } ; onOpen(flagId) }.
Document: <article className="mx-auto max-w-[720px] rounded-2xl border bg-card p-6 shadow-card lg:p-12">. Header: hospital name in font-serif text-[28px], statement date caption, hairline. Ledger rows: grid grid-cols-[1fr_auto] gap-x-4 on mobile (description with code and date caption; amount right), lg:grid-cols-[88px_1fr_88px_112px]; border-b py-3 text-sm tabular-nums.
Flagged amount: <del aria-label="Flagged amount ..."> rendered with an absolutely positioned inline SVG strike (from /marks/strike.svg as an inline React component so stroke can be currentColor) colored text-destructive; next to it the at-stake amount in text-coral-ink font-semibold. Published or rule flags: cobalt underline mark instead of strike.
Margin notes: on lg the article sits in lg:grid lg:grid-cols-[1fr_280px] lg:gap-8; notes are absolutely aligned to their line's offsetTop (measure with refs and ResizeObserver; fall back to stacking in order). Each MarginNote: TierBadge, text-sm explanation, caption source and date, button link "See evidence" calling onOpen (opens EvidenceSheet). Mobile: note renders under its line: ml-4 border-l-2 border-primary pl-3 py-2.
Running total footer inside article: border-t pt-6 flex justify-between; "Confirmed so far" Money text-mint-ink text-lg font-semibold; "Possible" range caption with Estimate chip.
Animation: IntersectionObserver adds data-drawn to each strike; CSS transition stroke-dashoffset 400 ms ease-out with 120 ms stagger; motion-reduce shows final state. Add a link "See it as a marked-up bill" on the case page under the flags list.
Tests: /case/sample/redline shows a del element for each confirmed flag; notes count equals flags count; reduced-motion run; a11y; screenshots. Open a PR.
```

### D-18 (D2) Share card and Polar pricing page
- Branch `d/share-pricing`. Time 1.5 h (share card only: 45 min). Depends D-06; Polar sandbox product created by D in the Polar dashboard; Better-T-Stack Polar wiring from B. Files: `packages/ui/src/components/bb/share-card.tsx`, `apps/web/src/routes/case/$id/share.tsx`, `apps/web/src/routes/pricing.tsx`, `e2e/share-pricing.spec.ts`.
- Share card copy (honest): title "I checked my hospital bill with BetterBill." Number: "Found {Money confirmed} confirmed" and, if any, "plus {low} to {high} worth asking about (estimate)". Footer "Results depend on the hospital. Sample bill." when the case is the sample. Never "saved". No hospital name, no account details. Actions: "Share" (Web Share API with URL to `/`), "Copy link", "Download image" (render the card in an SVG and export PNG via canvas; no new library).
- Pricing page copy: H1 (serif) "Simple pricing." Cards as in 5.8 Pricing, plus Assisted call price set to the Polar sandbox product price, button "Get an assisted call" to Polar checkout. Banner `bg-amber-soft text-amber-ink rounded-xl p-4 text-sm`: "Test mode. Payments use Polar's sandbox, so no real money moves."
- Prompt:
```
[Paste BB-RULES]
Ticket D-18 (D2), branch d/share-pricing. Part 1 ShareCard (packages/ui/src/components/bb/share-card.tsx): 1200x630 aspect box (aspect-[1200/630]) rounded-3xl bg-ink p-10 text-white; wordmark top left (white variant); main line font-serif text-[44px] leading-[48px]; Money in text-mint; secondary line text-white/75; footer caption text-white/60. Use exact copy from plan section 10 D-18. Route /case/$id/share shows the card and buttons Share (navigator.share if available, else hidden), Copy link, Download image (draw the same layout in an SVG string, load into an Image, draw to canvas, toBlob png). Fonts in the export may fall back to system fonts; note it in the PR.
Part 2 (skip if time box hit) /pricing: copy from plan section 10 D-18 and 5.8 Pricing. Checkout: use the Polar checkout helper Better-T-Stack generated (search the repo for "polar"; ask B if none). Product id from env VITE_POLAR_PRODUCT_ID_ASSISTED_CALL; sandbox only. Show the price from the Polar product (server-side fetch) or, if that is not wired, the text "Price shown at checkout". Never hardcode a price that is not in Polar.
Tests: share route renders "I checked my hospital bill with BetterBill." and no "saved"; pricing shows "Test mode." banner; a11y. Open a PR.
```

---

## 11. Fallbacks, cut order, risks

**D cut order if behind (cut from the top):**
1. D-18 (D2) entirely.
2. Hero count-up animation and redline draw-in animation (keep static marks).
3. Desktop line confirmation split view (keep single column on desktop).
4. `/welcome` onboarding swipe (keep Next buttons; or show the three cards inline on `/check`).
5. D-17 margin-note leader lines and gutter alignment (stack notes under lines on all sizes).
6. Plans landing Integration and Results sections collapse into one "Measured results coming" card plus a short integration paragraph.
7. Pilot form becomes a single `mailto:` button "Book a pilot".
**Never cut:** case page with BalanceCard, FlagRow with tiers, EvidenceSheet with source and date, ApprovalSheet with exact text, UploadPanel with camera and sample, disclaimer, consumer landing hero plus CTAs plus footer.

| Risk | Likelihood | Mitigation |
|---|---|---|
| Paper Desktop not available on Linux, or MCP flaky | Medium | Run Desktop on macOS or Windows; otherwise design in browser Paper, export PNGs, implement from this plan by hand. Restart agent session on tool errors. Duplicate the Paper file before long agent sessions |
| Paper MCP limits on the free tier | Medium | Redeem `LAHACKS26` first thing |
| Font packages named differently or slow to load | Low to medium | Google Fonts fallback link; system serif fallback in `--font-serif`; preload woff2; check CLS |
| `base-lyra` components missing (for example no Sheet in the Base UI registry) | Low to medium | Build Sheet on the existing Dialog primitive with bottom and right positioning classes |
| Data shapes late from B or C | Medium | Static fixture `sample-case.ts` labelled synthetic; swap at handoff |
| Published price not captured | Medium | ComparePriceBar shows "Price capture pending"; landing swaps flag 2 for the units flag |
| Eval results not ready | Medium | "Measured results coming" card; never a placeholder number |
| Time: landings squeezed after G2 | High | Copy is final in this plan, so landings are assembly work; start D-13 early if ahead at G1 |
| Looks AI-generated (Paper judging) | Medium | Hand-drawn marks, serif plus tabular numerals, restraint, one strong number, no gradients, Paper frames shown in Devpost |
| Mobile Safari sheet scroll and safe area bugs | Medium | Test on a real iPhone at G1 and G2; `max-h-[85svh]`, `overscroll-contain` on sheet body |

---

## 12. UNVERIFIED items

1. Paper Desktop on Linux (docs mention a Linux note for Claude but list no supported OSes); exact Paper MCP tool names and export format (HTML and CSS stated; React and Tailwind export not stated); MCP usage limits by plan.
2. Domain availability: only DNS delegation was checked, not registrar availability or price. `trybetterbill.com`, `betterbill.health`, `usebetterbill.com`, `betterbill.us` showed no nameservers. No trademark search done. MLH GoDaddy offer terms (free code, eligible TLDs) unknown.
3. npm names `@fontsource-variable/geist` (family "Geist Variable") and `@fontsource/instrument-serif` (family "Instrument Serif").
4. Which shadcn components exist in the `base-lyra` (Base UI) registry, especially `sheet`, and whether Base UI Dialog exposes `initialFocus` under that name.
5. Package alias after B's scaffold (`@betterbill/ui`), dev server port, and whether `packages/ui` has Vitest.
6. Polar checkout helper generated by Better-T-Stack with `--payments polar`, and sandbox product setup.
7. Shape of `eval.results` and `data/eval/results.json` (proposed in 5.9, needs C and B to agree).
8. B exposing a summary function for fair balance (needed so the UI never computes savings); contract PR not yet made.
9. All sample flag amounts beyond $84.00 (85025 duplicate) and the $6,900.00 MRI charge; the published cash price must come from C's captured file with a date. "$1,700 to $2,400" is illustrative.
10. Lighthouse 95+ on TanStack Start SSR pages with fonts: a target, not a result.
11. Contrast ratios in section 3.2 were computed by hand from hex values; confirm with axe.
12. Photo-to-lines time; the "usually under a minute" loading copy stays off until B measures p50.
13. Commonwealth Fund figures are not used anywhere on the landings until C verifies the primary source.
