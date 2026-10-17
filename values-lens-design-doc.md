# Values Lens: Design Doc (Consumer Rights Watchdog + Values-Based Shopping Extension and Dashboard)

Companion to `ideas-abstracts.md`. This doc combines the Consumer Rights Watchdog with a values-based browser extension and dashboard. Facts about prizes come from the LA Hacks track page and the sponsor docs I read. Anything marked unverified or unknown was not in a readable doc. Grades are A to F and are my own estimates.

---

## 1. Summary

**Values Lens** is a browser extension plus web dashboard that tells a person, at the moment of a purchase or sign-up, how a company lines up with the values *they* chose. The user sets weights for values such as consumer rights, labor practices, climate, and animal welfare. The extension scores the merchant or brand against those weights, shows the evidence behind every flag, and suggests alternatives that score better. A set of browser-agent engines (the "Speedrun" family from the watchdog) produces first-party measurements for consumer-rights values, such as cancel difficulty, refund friction, and hidden fees. Other values are scored from cited public datasets. All of it is queryable through ASI:One agents.

**Design principles**
- **The user sets the values, we do not.** The product reports evidence against the user's own weights. It never issues a single "ethics score" of its own.
- **Evidence or silence.** Every flag carries a source, a date, and a confidence level. If there is no evidence, the product says "no data," not "clean."
- **Measure what can be measured.** First-party agent runs for consumer rights (reproducible, replayable). Public datasets for other values.
- **Right of reply.** Companies can see their evidence and submit a correction.

---

## 2. Values model

Each value is a "lens" with its own evidence sources, score definition, and confidence rules.

| Lens | What it measures | Evidence type | Notes |
|---|---|---|---|
| Consumer rights | Cancel/refund friction, hidden fees, keyboard-only access, fine print | First-party agent runs with replays | Strongest evidence; the hero lens |
| Labor and child labor | Whether a brand or its product category appears in public labor-risk lists and audit records | Public datasets (for example government and NGO lists of goods or sectors linked to child or forced labor; verify access and license) | Category- and country-level evidence, not a verdict on a specific company unless a source says so |
| Exploitation and wages | Reported wage violations or enforcement actions | Public enforcement records where available | Sparse and uneven; show coverage honestly |
| Climate | Published emissions disclosures, targets, third-party verification | Public disclosure and certification datasets (verify licenses) | Distinguish stated targets from verified results |
| Animal welfare, privacy, local sourcing, and more | Same pattern | Add as data allows | Hackathon scope: not implemented |

**Score design**
- Per-lens score from 0 to 100 plus a coverage figure ("evidence for 3 of 5 checks").
- User weights (0 to 5 per lens) combine lens scores into a personal match score. The weights and the formula are visible in the UI.
- Missing evidence is shown as missing, never treated as zero or as a pass.

---

## 3. Experience

### Browser extension (Manifest V3)
- Content script detects the merchant, brand, and product category on product, cart, checkout, and sign-up pages.
- Badge on the toolbar shows the personal match score. A side panel shows:
  - the per-lens breakdown with sources
  - "why this was flagged" with links and dates
  - alternatives ranked by the user's weights, with price and availability context
  - a "run a live check" button that triggers a cancel/refund/price measurement on a consented or mock target
- Privacy: the values profile is stored locally. Only the merchant domain or brand identifier goes to the backend, never page contents or account data.

### Dashboard (web)
- Values profile editor with live preview of how weights change rankings.
- Personal history: companies checked, alternatives chosen, evidence viewed. Impact is shown as counts and examples, not as invented dollar or emissions claims.
- Public leaderboards: Hall of Shame/Hall of Fame per lens, with replays for consumer-rights runs.
- Region maps: where a company's behavior or legal requirements differ, with citations (see regionalization in the watchdog doc).
- Evidence packet export for complaints.

### ASI:One agents (Fetch.ai)
- Separate agents per lens (consumer rights, labor, climate), plus an orchestrator and an alternatives agent, all registered on Agentverse.
- Conversation example: "I care about climate and fair labor more than price; where should I buy running shoes?" Orchestrator discovers and calls the lens agents, then returns an interactive card carousel of alternatives with evidence.
- Other agents (for example shopping agents) can query the Trust Layer API before buying.

---

## 3A. Maps and compliance

The map is a first-class surface, not an add-on. It answers two questions: *where does this company's behavior meet the checked requirements?* and *where are the requirements strongest?*

### Map layers
1. **Compliance by jurisdiction (choropleth).** For a chosen company or category, each state or country is colored by how its checked flows meet the rules that apply there. Cell statuses: Meets, Partly meets, Does not meet, Not tested, Not applicable. Every cell links to the rule citation and a replay of the run.
2. **Compliance gap view.** Highlights regions where the same company passes in one place and fails in another, for example a cancel path that is as short as sign-up in one state but longer in another.
3. **Rules coverage layer.** Shows which checks apply where (a curated, cited rules table), so users can see where protections are strongest or missing.
4. **Time slider.** Replays how scores and statuses changed after a rule change or a company update. Useful for "did they fix it?"
5. **Category and company comparison.** Pick two companies or a category and compare regional compliance side by side.
6. **My region.** A rights card for the user's location: which checks apply, with source links.

### How the data is produced
- **Rules table.** One row per jurisdiction and rule: rule text summary, source URL, effective date, the machine-runnable check, and the applicable flow (cancel, refund, price display, accessibility, cookie consent, and so on). Hand-curated and cited. Language models help draft but never act as the source of a rule.
- **Regional runners.** Agent runs execute from cloud regions you control (Vultr regions, MLH Vultr prize). Results are labeled "as observed from region X."
- **Demo mode.** Mock sites serve region-specific flows from a request header, so the demo shows real differences without relying on live geolocation. State this clearly in the pitch.
- **Storage and analytics.** Per-run results in Postgres with Tiger Data (time-series, continuous aggregates per region and per rule). Snowflake joins rule coverage with run results for cross-company comparisons.
- **Frontend.** MapLibre GL (or Leaflet) with GeoJSON boundaries from public sources (for example Natural Earth for countries and US Census boundaries for states; verify licenses).

### Compliance language
- Say "meets" or "does not meet the checked requirement," with the rule, source, and date. Never "illegal" or "non-compliant" as a conclusion.
- Show the rule's effective date and the last verification date.
- Mark "Not tested" distinctly from "Meets."
- Allow a company to see its cells and submit a correction.

### Why it matters for judges and buyers
- A single map makes the consumer story obvious in seconds, and the time slider shows the product producing change.
- The same view, filtered to one company, is the paid product for company QA and compliance teams (see section 9).

### Risks
- Geolocation fidelity: sites may treat cloud IPs differently from home users. Label results accordingly.
- Laws change and interpretations vary. Keep the rules table dated and cited, and get a human review for each shipped rule.
- Hackathon scope: three jurisdictions and two to three rules each, with real geo-routing as the stated next step.

---

## 3B. Comparison pages: products, companies, and retailers

The public site includes comparison pages so a visitor (or the extension) can answer "what should I buy, from whom, and where?" against their own values.

### Page types
1. **Company page.** Lens scores with coverage, evidence list, regional compliance map, history, and the company's reply if it submitted one.
2. **Product or category page.** Alternatives within a category (for example running shoes or coffee), ranked by the user's weights, with evidence behind each score and the brand's parent company shown.
3. **Retailer comparison.** For one product, the same item across retailers with a retailer-level scorecard: cancel and return friction, hidden-fee delta at checkout, delivery and refund terms, accessibility pass rate, fine-print flags, and regional compliance. A "where to buy" table lists availability and price context next to those scores.
4. **Head-to-head view.** Two to four companies, products, or retailers side by side, with per-lens bars and the checks that drove each difference.
5. **Personalized ranking.** The user's saved weights reorder every table. The formula and weights stay visible.

### Data sources and neutrality
- Product, price, and availability data from retailer product feeds or APIs, merchant-supplied data, and user contributions where terms allow. Avoid scraping where a retailer's terms prohibit it. Verify terms before relying on any source.
- Hackathon scope: 20 to 30 products across one or two categories, three to five retailers (mock retailers for live measurement), and a curated brand table.
- Ranking is never paid. Price and availability appear as context, not as the ranking signal unless the user chooses it as a weight.
- Any affiliate or referral link is disclosed and never affects ranking, or is left out entirely.

### Free vs paid access
| Tier | Audience | Includes | Gate |
|---|---|---|---|
| Public | Everyone | Company, product, and retailer pages; top-line scores; the evidence behind each public score (rule, source, one replay per finding); limited history | Free forever. Public evidence stays free so scores remain verifiable |
| Pro (consumer) | Individuals and households | Saved comparisons, change alerts, longer history, personalized weights across devices, auto-cancel policies | Subscription |
| Business | CX, QA, compliance, and product teams | Step-level diagnostics and full run traces for their own flows, competitor benchmarks, regional compliance exports, regression alerts, a view of what peers do differently | Subscription by monitored flows, regions, and seats |
| Bulk and API | Platforms, agents, comparison sites, researchers, and large enterprises | Full API, rate limits well above public, CSV or data-share exports (for example via Snowflake), historical snapshots, custom rubrics, SLAs | Usage-based or annual contract; discounted for research and NGOs |

What is paywalled is **depth, scale, and tooling**: step-level traces, long history, bulk exports, API volume, custom rubrics, and competitor benchmarks. What stays free is **the public score and its supporting evidence**. This keeps the paywall from looking like a pay-for-score model.

### Why it helps
- Gives the extension and ASI:One agents a reason to link out to a destination site that earns traffic.
- Creates search-friendly pages ("best subscription-friendly streaming services") for organic growth.
- Turns the dataset into a product with natural upgrade points.

### Risks
- Product and price data is hard to maintain at scale; keep scope narrow and label freshness.
- Comparison tables invite disputes; keep dates, sources, and a correction path on every row.
- Retailer scores risk reading as endorsements or accusations; use the same neutral wording as the compliance map.

---

## 4. Data and evidence rules

- Every claim in the UI links to a source with a retrieval date.
- Entity resolution maps domains to brands to parent companies. Keep the mapping table versioned and reviewable.
- Public datasets are treated as inputs with known limits (country-level, year-lagged, coverage gaps). The UI states those limits.
- Language models can summarize evidence and explain flags. They are never the source of a factual claim about a company.
- Dispute path: a company or user can flag a result. The result is marked "under review" until re-checked.
- Legal wording: "evidence suggests," "meets/does not meet the checked requirement." Never "illegal," "unethical," or similar conclusions.

---

## 5. Features

Hero (demo path)
1. Extension badge and side panel on two mock shopping sites.
2. Personal values profile with weights and a ranked alternatives list.
3. Consumer-rights lens backed by live agent runs (Cancel Speedrun and Price Ghost) with replay links.
4. Climate or labor lens backed by one real public dataset on a small curated set of brands.
5. ASI:One chat: values-based "where should I buy?" with interactive cards.
6. Compliance map with three jurisdictions, a company filter, a compliance gap view, and links to rule citations and replays (section 3A).
7. Comparison pages: one product category with ranked alternatives, one retailer comparison with a "where to buy" table and scorecards, and a head-to-head view (section 3B).

Supporting
6. Dashboard with leaderboard and history.
7. Evidence packet export.
8. Sentry replays and traces for every agent run.

Stretch
9. Time slider and richer map layers (rules coverage, category comparison).
10. Trust Layer API for other agents (including pay-per-query via the Fetch Payment Protocol).
11. SMS entry through Photon ("text a brand name, get its values card").
12. Scheduled re-runs and "this company changed" alerts.

---

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Extension | TypeScript, Manifest V3, content script + side panel, built with Vite | Standard, loads unpacked for demo |
| Backend | TypeScript (Hono/Bun) or Python (FastAPI) | Matches your existing stack |
| Browser engines | Browser Use agents (Cancel Speedrun, Refund Race, Price Ghost, Keyboard-Only Audit) | First-party consumer-rights evidence; replays |
| Extraction/summaries | Gemini (MLH) | Fine-print extraction, evidence summaries, alternative explanations |
| Entity resolution | Rules + embeddings, curated brand table | Domain to brand to parent mapping |
| Data warehouse | Snowflake API (MLH) for joining public datasets and computing lens scores | Genuine fit: multi-source analytics |
| Time-series | Postgres with Tiger Data (MLH) | Scores over time, trend aggregates, regional history |
| Agents | Fetch.ai uAgents or plain Python + Agent Chat Protocol, Agentverse registration | Required Fetch deliverables |
| Observability | Sentry Tracing + Session Replay + Logs + AI agent monitoring | Prize needs 2+ products beyond errors |
| Hosting | Vultr (regional runner VMs for regional checks) | MLH hosting prize, real regional use |
| UI/design | Paper for the design, React/Next.js dashboard | Best Designed Hack criteria |
| Build assist | Devin | Test generation, mock sites, harness |
| Messaging (optional) | Photon (SMS) | Text a brand, get a card |
| Voice (optional) | ElevenLabs | Spoken summary in the side panel; low priority |
| Domain | GoDaddy Registry domain | MLH Best Domain Name |
| Maps | MapLibre or Leaflet | Regional compliance map |

---

## 7. Track and prize coverage

| Track / challenge | Fit | Prize (from docs) | How Values Lens fits |
|---|---|---|---|
| Fetch.ai (ASI:One Agent Challenge) | Strong | Pool unverified ($5k in a 2026 pre-event listing; not in the doc) | Lens agents, orchestrator, trust API, interactive cards, workflow completes in ASI:One |
| Applied Intelligence (track) | Strong | No prize listed on the card | Real-world consumer impact |
| Browser Use | Strong | Unknown | Agents that measure flows; new browser-powered experience |
| Sentry | Strong | 1st: guaranteed interview for each team member | Replays and traces as product evidence |
| Visa | Good | 1st: $2,000; judged on innovation 25%, UX 25%, technical 20%, commerce impact 15%, trust and responsibility 15% | Shopping-journey transformation with trust and transparency at its core; retailer comparison with "where to buy" and hidden-fee scorecards speaks directly to discovery, decision-making, and checkout |
| Best Designed Hack (Paper) | Good | Up to $1,500 | Extension panel, dashboard, and map design |
| Best Use of Devin | Possible | 1st: $5,000 Devin credits (single prize) | Judged on creativity, novelty, polish |
| MLH Snowflake | Good | Raspberry Pi 4 | Multi-source analytics for lens scores, retailer and product comparisons, and bulk data exports for paying customers |
| MLH Gemini | Natural | Google swag kits | Extraction and explanations |
| MLH Tiger Data | Natural | Stream Deck Mini | Time-series of scores per region and rule, powering the map's time slider |
| MLH Vultr | Natural | Portable screens | Regional runner VMs for the compliance map, plus hosting |
| MLH Domain (GoDaddy Registry) | Cheap add-on | Digital gift card | Name the product well |
| Photon | Optional | Unknown | SMS entry |
| MLH ElevenLabs | Optional | Wireless earbuds | Voice summary |
| Model Learning (track) | Optional | Unknown | Only if there is a trained entity-resolution or dark-pattern classifier with evaluation |
| Workday, Base44, Intuit | Weak | Various | Not a fit |

Prize stacking is unverified. Check the rules before planning around entering many sponsor prizes with one project.

---

## 8. Novelty

- Combines user-defined values, first-party agent measurement, and cited public data in one extension.
- Evidence is replayable. Consumer-rights claims link to a recording of the agent run, not just a score.
- Values are user-weighted, and the product avoids assigning a single moral rating.
- Plugs into the agent ecosystem: other agents can ask the Trust Layer before they transact for a user.
- Similar consumer apps that rate brands on ethics exist. The differentiators here are the agentic first-party measurement, user-set weights, visible evidence rules, and agent-to-agent access.

---

## 9. Business model

The product has two sides. Consumers use it free or cheap and create the audience and the evidence. Companies and platforms pay for the diagnostic depth, the benchmarks, and the integrations. The rule that holds the model together: **public scores are independent and never for sale; paid products give private detail and tooling, not better scores.**

### Revenue streams

**Business-to-business (primary)**
1. **Friction Insights for QA, CX, and compliance teams.** Companies buy private, step-level diagnostics for their own flows: replays of where an agent (and a typical user) gets stuck, click and time counts, hidden-fee deltas, accessibility failures, and a per-region compliance report from the map. Sold as a subscription with regression alerts when a release makes a cancel, refund, or checkout flow worse.
2. **Competitive benchmarks.** The same company's flows compared to category peers on the public rubric, with trend lines. Companies pay for the detailed breakdown; the public sees only the public score.
3. **Pre-launch audit in CI.** An API or GitHub Action that runs the speedrun suite against a staging site and fails a build if friction or compliance thresholds regress. Priced per run or per seat.
4. **Regulatory-readiness reports.** Region-by-region summaries of which checked requirements a company's flows meet, with citations, for legal and compliance teams. Informational, not legal advice.
5. **Trust-score API for platforms and agents.** Shopping agents, comparison sites, marketplaces, and ASI:One agents pay per query. Fits the Fetch Payment Protocol bonus.
6. **Supplier and procurement screening.** ESG and procurement teams pay for monitored lens scores on suppliers and vendors.
7. **Embeds for financial and commerce partners.** Card issuers, fintechs, and wallets surface subscription and fee transparency to their customers using the engine (hypothesis; fits the Visa theme).

**Direct-to-consumer**
8. **Free tier.** Extension badge, basic alternatives, and a limited number of live checks per month. This drives distribution.
9. **Premium subscription.** Continuous monitoring of the user's subscriptions and merchants, change alerts, unlimited live checks, auto-cancel with user-set policies, price-adjustment claim filing, and family or household plans.
10. **Pay-per-use.** Evidence packets and complaint drafting for people who do not want a subscription.
11. **Contingency fee on recovered money.** A percentage of refunds, price adjustments, and canceled charges, charged only on success. Strongest for the hospital bill module, since savings are measurable.
12. **Memberships and donations.** Supporters fund the public leaderboard and open rubric.

**Institutional and data**
13. **Data licensing for journalists, researchers, and NGOs.** Aggregated, de-identified datasets and the annual Friction Report.
14. **Grants and sponsorships.** Consumer-protection foundations and civic-tech funders, with sponsor disclosure and no influence on scores.
15. **Employer and benefits channel.** Offered as a perk to employees (hypothesis).

### Data access tiers
The free/paid boundary is defined in section 3B. In short: public scores and their supporting evidence stay free; step-level diagnostics, long history, competitor benchmarks, bulk exports, API volume, and custom rubrics are paid. Bulk and API customers (platforms, comparison sites, agents, researchers, large enterprises) are billed by usage or annual contract, with discounts for research and NGOs.

### Guardrails that protect trust
- **Firewall between audit and sales.** The team that runs measurements and publishes scores is separate from the team that sells to companies, and the rubric is public and versioned.
- **Scores are not purchasable.** Companies can fix a problem and request a re-test; the original result remains in the history.
- **No selling identifiable consumer data.** Aggregated, de-identified counts only, with user consent, and a clear privacy policy.
- **Disclose partnerships.** Any sponsor or paying customer appears in a public list.
- **Affiliate links for alternatives.** Avoid, or disclose prominently. Paid placement undermines neutrality.

### Unit economics, to be tested
Not researched. Treat as hypotheses to validate: B2B subscription revenue likely outweighs consumer subscription revenue; consumer revenue may be mostly contingency fees and a small premium tier; the extension's value is distribution and evidence collection. Validate with the plan in section 9A.

---

## 9A. Marketability examination

### Who has the pain
| Segment | Pain | Buyer or user | Likely willingness to pay |
|---|---|---|---|
| Consumers who care about values | Hard to know which brands match their values; time lost to dark patterns | Individual | Low upfront; higher for recovery of money or time |
| Subscription-heavy households | Surprise charges, hard cancellations | Individual or household | Moderate for monitoring and auto-cancel |
| CX, QA, and product teams | Churn from friction, support costs, release regressions | Team lead, product or QA | Moderate to high if the report is specific and actionable |
| Compliance and legal teams | Uncertainty about regional requirements for cancel, pricing, accessibility | Compliance lead | Moderate to high for dated, cited reports |
| Procurement and ESG teams | Supplier screening | Procurement lead | High but long sales cycles |
| Platforms and shopping agents | Need trust signals before transacting | Developer, product manager | Per-query fees if integrated |
| Journalists, NGOs, researchers | Need verifiable evidence | Individual or organization | Low but steady |

### Competitive landscape (examples, not exhaustive)
- **Ethical-shopping and brand-rating apps** (for example Good On You in fashion, B Corp as a certification): rate brands but typically rely on research reports, not live reproducible measurement.
- **ESG ratings providers** (for example MSCI, Sustainalytics): sell company-level ratings to institutions; not consumer-facing, not first-party flow measurement.
- **Subscription managers** (for example Rocket Money): help cancel and track; not neutral public measurement of companies.
- **Accessibility audit tools** (for example axe, WAVE): check pages against rules; do not test whether a task can be completed end to end.
- **UX analytics and session-replay tools:** measure a company's own users on their own sites; do not benchmark across companies.
- **Price-tracking and coupon extensions:** focus on savings, not values or friction.

### Differentiation
- First-party, replayable measurement of real flows, with evidence links, rather than opinion ratings.
- User-set value weights instead of one imposed score.
- Cross-company benchmarking that a single company's analytics cannot provide.
- Regional compliance map tied to cited rules.
- Agent-to-agent access, so other agents can use the scores before they transact.

### Why now
- Consumer and regulator attention to subscription traps, hidden fees, and manipulative design has grown, which creates both public interest and company demand for compliance help. Confirm specifics for each region before relying on them in a pitch.
- AI shopping agents are emerging and will need trust data, which gives the API a new type of customer.
- Browser agents make repeatable end-to-end measurement far cheaper than manual audits.

### Go-to-market sequence
1. **Free extension and public leaderboard** to build audience, collect permissioned signal, and earn press.
2. **Annual Friction Report and region maps** for visibility with journalists, regulators, and advocacy groups.
3. **Company outreach with their own data first:** show each company its own page and replays, then offer the private diagnostics and CI product.
4. **API for platforms and agents** once the dataset covers enough companies.
5. **Contingency and premium consumer tiers** layered on once recovery flows are reliable.

### Pricing hypotheses (unvalidated)
- Free tier with a monthly cap on live checks.
- Consumer premium as a low monthly subscription; household plan priced above.
- Contingency fees as a percentage of recovered money.
- Company subscriptions tiered by number of monitored flows, regions, and seats.
- API priced per query with volume tiers.
Do not quote numbers in the pitch until tested with real prospects.

### Main marketability risks
- **Two-sided trust.** Selling to the companies you rate invites conflict-of-interest claims. Mitigate with the firewall, public rubric, and visible history.
- **Cold start.** The extension needs coverage on the sites people actually use. Start with one or two categories and a few dozen brands.
- **Defensibility.** Competitors can copy the idea. The moat is the dataset, the rubric trust, and integrations.
- **Legal exposure.** Publishing findings about real companies requires reproducible evidence and a reply path.
- **Long B2B cycles.** Plan for early revenue from consumer recovery fees and small team plans.

### Validation plan
- **At the hackathon:** judge feedback; a landing page with a waitlist; ask 5 to 10 attendees what they would pay for.
- **Next two weeks:** interview 10 consumers about subscription and values habits; interview 5 to 10 CX, QA, or compliance people; ask each what report they would act on.
- **Success signals:** companies requesting their own page, repeat extension use, and anyone agreeing to a paid pilot.

---

## 10. Priorities (24 to 36 hours, two people)

Suggested split: Person A owns the extension, dashboard, and design. Person B owns agents, data pipeline, and ASI:One.

| Hours | Goal |
|---|---|
| 0 to 4 | Repo, mock sites with built-in friction, extension skeleton, Agentverse registration of one agent, Sentry wired in |
| 4 to 12 | Cancel Speedrun and Price Ghost engines with replays; values profile and scoring formula; one public dataset ingested for one lens |
| 12 to 20 | Extension panel with breakdown, evidence links, alternatives; ASI:One orchestrator with interactive cards; dashboard leaderboard; first map layer (three jurisdictions, region-specific mock flows, rules table with citations) |
| 20 to 28 | Polish, Paper design pass, reliability demo (break a mock site live), second lens, compliance gap view and time slider, company-facing report mock |
| 28 to 36 | Demo video, README, submission via Devpost and Fetch Submission Agent, rehearsal |

Cut order if behind: SMS, ElevenLabs, map time slider, second lens, extra map layers, then Refund Race and Keyboard Audit. Keep the three-jurisdiction map; it is central to both the consumer and company pitch.

---

## 11. Demo script (3 minutes)

1. Set values: climate 5, fair labor 4, consumer rights 5. Show how weights reorder results.
2. Open a mock shop in the extension. Badge turns amber. Side panel shows consumer-rights flag with a replay of the agent failing to find the cancel button in 14 clicks.
3. Show the climate or labor evidence with source and date, and the "no data" state for a missing check.
4. Click an alternative. Score improves, price comparison shown.
5. Switch to ASI:One chat: "where should I buy running shoes?" Orchestrator calls lens agents, returns a card carousel.
6. Break the mock site live. Agent recovers, reports confidence, Sentry shows the trace.
7. Open the compliance map for one company: three regions colored Meets, Partly meets, Does not meet. Click a red cell to show the cited rule and the replay. Drag the time slider to show the company fixing the flow after a re-test.
8. Show the company-facing report: the same map and replays as a private diagnostic with a regression alert, then state the firewall rule (public scores are never for sale).
9. Close with the dashboard leaderboard and the evidence packet.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Data quality and over-claiming** about real companies | Evidence-or-silence rule, source and date on every flag, coverage shown, curated small brand set, wording that avoids verdicts |
| **Defamation and legal exposure** | Reproducible evidence, right of reply, no live runs against real sites in the demo, mock targets, disclaimers |
| **Perceived political bias** | User-set weights, visible formula, no default moral ranking |
| **Greenwashing and weak datasets** | Separate stated targets from verified results, show limits |
| **Privacy** | Local-first profile, send only merchant identifiers, no page content or account data |
| **Scope** | Hero path first; one product category; 20 to 30 curated brands; cut order defined above |
| **Fragility of live sites** | Mock sites and cached runs as fallbacks |
| **Fetch constraint** | Primary workflow must complete entirely in ASI:One; the extension and dashboard are the secondary surface |
| **Extension distribution** | Demo with unpacked extension; Web Store review is not needed for the hackathon |

---

## 13. Grades (A to F, my estimates)

| Factor | Values Lens (combined) | Watchdog alone | Hospital Bill Auditor |
|---|---|---|---|
| Demo compellingness | A- | A- | B+ |
| Fit in 24 to 36h (2 people) | C+ | B | C |
| Uniqueness | B+ | A- | B+ |
| Emotional / real-people impact | A- | B+ | A |
| Track coverage | A | A- | A- |
| Prize and stakes | B+ | B+ | B |
| Commercial viability (revenue paths, buyers) | B+ | B | B |
| Marketability (demand, differentiation, go-to-market) | B | B- | B |
| Map and compliance showpiece | A- | B+ | C |
| Safety, legal, and data-quality risk (A = low risk) | C | B | D+ |
| Fit with your experience | B+ | B+ | B- |
| Form factor fit (web or desktop) | A- (extension + web) | B+ | B |
| Judge friendliness (clear story, verifiable evidence) | B+ | A- | B |
| **Overall** | **B+** | **A-** | **B** |

### Reading the grades
- **Values Lens beats the watchdog alone on:** emotional pull, track coverage, form factor, and commercial story (an extension is how people would actually use it).
- **It loses on:** timeframe fit and risk. More lenses mean more data work, and claims about labor and climate carry higher data-quality and legal risk than measuring a cancel flow.
- **Uniqueness drops slightly** because ethical-shopping apps exist. It recovers through the replayable first-party measurements, user-set weights, and agent-to-agent trust API.
- **Commercial viability rises** with the company-facing data and QA products, the CI integration, and multiple consumer revenue paths. The weak point is two-sided trust: selling to the companies you rate must be firewalled from scoring.
- **Marketability is solid, not exceptional.** Demand exists on both sides and the differentiation is real, but the category is competitive, there is a cold-start problem on coverage, and B2B cycles are slow. The pitch should lead with evidence and the map, not with total market claims.
- **The map is the showpiece.** It makes compliance visible in seconds, shows change over time, and doubles as the company-facing product.

### Recommendation
Build the **watchdog engine and ASI:One agents first** (hours 0 to 12) as the hero, then layer the **values profile, extension, and one public-data lens** on top (hours 12 to 28). Treat additional lenses as visible placeholders showing "coverage: planned." That keeps the strongest evidence (replays) at the center, keeps the data-quality risk contained to one lens, and still lets the pitch tell the full story. If time slips, ship the watchdog plus the extension badge and drop the second lens. Keep the three-jurisdiction compliance map either way: it carries the demo and the company-data business story.
