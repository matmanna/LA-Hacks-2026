# Escape Hatch: Refocus of Values Lens (Exit Grade rubric, service list, taxonomy, risks)

Status notes
- The blind-panel results quoted below come from the report you pasted. I did not see the panel's raw scores.
- Assumptions taken from the pasted brief: team of 4 (lead on agents and Python, research, backend, UI/UX), about 22 hours. Earlier docs assumed 2 people and 36 hours. Section 7 says what to cut for 2.
- Legal items are labeled VERIFIED (read in a statute reproduction or official text) or UNVERIFIED. Nothing here is legal advice. Statute text was read from a FindLaw reproduction (current as of January 1, 2026). The official leginfo.legislature.ca.gov pages would not load for me (403, then no text), so a human should confirm every cite there.
- No em dashes, per the brief.

---

## 1. Can Values Lens score better by refocusing? Yes, and the refocus is Escape Hatch

The panel's complaints were about scope and fit, not about the core idea. The parts judges praised (evidence or silence, replay as proof, right of reply, the Cancel Speedrun engine) all survive. The parts they punished (extension, dashboard, maps, comparison pages, five lenses, Gemini-first stack, mock-only proof, Fetch's primary workflow living outside ASI:One) can all be cut.

| Panel finding | Refocus move |
|---|---|
| Over-scoped | One product: grade a cancel path before a trial starts, then cancel on the last day. No extension, dashboard, map, comparison pages, or extra lenses |
| Fails Fetch hard rule | The whole primary workflow starts and ends in an ASI:One chat (uAgents, Chat Protocol, Interactive Cards, Payment Protocol) |
| Mock-heavy | Grade at least one REAL public cancel path live. A labelled demo merchant is a fallback only |
| Crowded category | Not a brand-values rater. It is an action product: grade, authorize a scoped payment, cancel for you |
| Pitch not repeatable | One sentence: "Before you start a free trial, an agent grades how hard it is to quit, then cancels for you on the last day." |
| Sponsor fit claimed, not earned | Each sponsor requirement is the hero of one step (see below) |

Sponsor fit, earned per step
- **Fetch.ai:** the entire user journey runs in ASI:One. Required deliverables: Agentverse registration, Agent Chat Protocol, asi1.ai demo, Submission Agent plus Devpost, public repo. Interactive Cards and Payment Protocol earn bonus consideration (per the Fetch doc).
- **Browser Use:** grades a real public cancel path live.
- **StepFun:** `step-5-preview` is called at runtime to label dark patterns from screenshots. The doc requires the call and judges task completion, reliability, and whether users understand and control the workflow.
- **Visa:** a scoped credential limited to the trial terms. Visa Intelligent Commerce sandbox availability and access terms are UNVERIFIED (I did not research them). If unavailable, use a clearly labelled simulation and do not imply a Visa partnership. Judging per the Visa doc: innovation 25%, user experience 25%, technical execution 20%, commerce impact 15%, trust and responsibility 15%.
- **Sentry:** Tracing plus Session Replay as the evidence trail (the prize needs two or more products beyond error monitoring).
- **Stretch only:** Photon, leaderboard, Devin.

User journey in ASI:One
1. User: "I'm about to start a Hulu trial." (service name or URL).
2. Agent runs the grader, returns an **Exit Grade card** (grade, coverage, flagged patterns, evidence links).
3. User approves in a **review card**: trial terms, last-day date, spend cap.
4. Agent issues a scoped credential (sandbox or labelled simulation) limited to those terms.
5. On the last trial day (time-skipped in the demo) the agent runs the cancel flow and returns an **evidence receipt** (steps, timings, screenshots, Sentry replay link).
6. The company can submit a reply, shown next to the grade.

---

## 2. (a) Exit Grade rubric, grounded in California AB 2863

### What AB 2863 changed (sources and verification)
- Signed September 24, 2024. Amends the Automatic Renewal Law, Business and Professions Code (B&P) sections 17601 and 17602. Applies to contracts entered, amended, or extended on or after July 1, 2025 (17602(j) in the FindLaw text). VERIFIED against the FindLaw reproduction and two law-firm alerts; confirm on leginfo.
- Subdivision map below is from FindLaw's reproduction of B&P 17602, current as of January 1, 2026. Law-firm alerts (Kilpatrick Townsend, Davis Wright Tremaine) agree on the main points. One alert cited a consent provision as "16702(a)(4)," which looks like a typo for 17602(a)(4). The free-to-pay definition at 17601(6) comes from a single law-firm alert and is UNVERIFIED.
- The law governs California consumers and the stated practices. A service may use one national flow, so grading a site's public flow is not the same as testing a California-specific one.

| Provision | Cite (FindLaw text) | What the rubric uses it for |
|---|---|---|
| Disclose renewal terms clearly before purchase; free-trial terms include post-trial price | 17602(a)(1) | Terms disclosure |
| Affirmative consent before charging; separate express consent to renewal terms | 17602(a)(2), (a)(4) | Not observable publicly, noted as "not tested" |
| Retainable acknowledgment with terms, cancellation policy, instructions | 17602(a)(3) | Not observable without an account |
| Keep proof of consent 3 years or 1 year after termination, whichever is longer | 17602(a)(6) | Not testable |
| No misrepresentation of material facts | 17602(a)(7) | Flag for contradictions between pages |
| Notice before billing confirmation includes renewal terms, charges, cancellation methods, contact info | 17602(a)(8) | Terms disclosure |
| Trial or promo over 31 days: notice 3 to 21 days before end | 17602(b)(1) | Not observable publicly (email) |
| Initial term of 1 year or more: notice 15 to 45 days before auto-renewal | 17602(b)(2) | Not observable publicly (email) |
| Toll-free number, email, postal address (if billed directly), or other easy method | 17602(c)(1) | Alternative channels |
| Answer calls promptly in business hours, process voicemail within 1 business day | 17602(c)(2)(A)-(B) | Not testable by reading; note only if hours are stated |
| Online sign-up must allow online cancellation at any time, without obstructing steps, via prominent link or button or an email; link may sit in account or settings | 17602(d)(1) | Online parity, prominence |
| Business may require login for online cancellation; consumers who cannot log in may cancel offline | 17602(d)(3) | Do not penalize a login wall; check for a no-login fallback |
| Retention offers allowed if cancellation stays possible; by phone, must say cancel is possible at any time; online, offer must appear with a prominent, continuously displayed click-to-cancel control | 17602(e), (e)(1), (e)(2) | Save-offer loop test |
| Cancel in the same medium used to sign up | 17602(f) | Online parity |
| Material change and fee change notices (fee change: 7 to 30 days) | 17602(g) | Not observable publicly |
| Annual reminder with product, charge amount, frequency, how to cancel | 17602(h) | Not observable publicly |

Important: the Exit Grade is a user-experience grade informed by these provisions. It is not a finding that any company violated the law. Wording in the product: "does not meet the checked requirement," never "illegal."

### Scoring (100 points)
Each criterion is scored only when its evidence is observable. The grade is points earned divided by points observable, and coverage is shown beside it.

| # | Criterion | Max | AB 2863 basis | Observable signals | Scoring |
|---|---|---|---|---|---|
| 1 | Online cancel parity | 25 | 17602(d)(1), (f) | Public page names an online cancel route for services with online sign-up | Full: online route stated. Half: only via chat or app store. 0: phone, mail, or chat only |
| 2 | Prominent, short path | 20 | 17602(d)(1) | Clicks and time from the help or account entry to the cancel control (or to the login wall); control visibility | Our thresholds, not statutory: up to 3 clicks full, 4 to 5 half, more than 5 or hidden 0 |
| 3 | Alternatives and no-login fallback | 10 | 17602(c)(1), (d)(3) | Email, toll-free number, mail, or "can't sign in" path stated | Full: at least one non-login route. Half: contact page only. 0: none |
| 4 | No obstruction before cancel | 20 | 17602(d)(1), (e) | Taxonomy flags in section 4 (forced chat, save-offer loop, hidden link, forced survey) | Start at 20, subtract 5 per confirmed flag, floor 0 |
| 5 | Terms disclosed | 15 | 17602(a)(1), (a)(8) | Published terms state auto-renewal, charge, cancel method, trial conversion | Full: all four. Quarter points per item |
| 6 | Exit costs stated | 10 | 17602(a)(1), (a)(7) | Fees, no-proration, committed period, cutoff time (for example "cancel 24 hours before") | Full: any costs clearly stated on the cancel page. 0: costs only found in separate terms. Information, not a legal test |

Grade bands: A 90 or above, B 80 to 89, C 70 to 79, D 60 to 69, F below 60. If coverage is under 60%, the grade is capped at B and labeled "limited evidence." Missing evidence is shown as "not observed," never scored as a pass.

What cannot be observed from public pages (record as "not tested"): affirmative consent flow, acknowledgment email, trial and renewal reminder emails, fee-change notices, in-flow save offers and surveys behind login. A consenting test account would unlock these (stretch).

Evidence stored for every grade: URL, timestamp, rubric version, screenshots, DOM text snapshot, agent trace ID, Sentry replay link, and any company reply.

---

## 3. (b) Ten services whose public cancel path can be graded without logging in

Caveat that matters: every help page below is readable logged out, but the real cancel control sits behind a login for all of them. Live grading therefore covers the public path (entry point, stated methods, clicks to the login wall, visible patterns). Grading the in-flow screens (save offers, surveys) needs a consenting test account.

Verification: "VERIFIED" means the page loaded in this session and I read its content. Notes list only what the page stated.

| # | Service | Public URL | Status | What the public page states | Useful for testing |
|---|---|---|---|---|---|
| 1 | Netflix | https://help.netflix.com/en/node/407 | VERIFIED | Online only via Manage your membership ("the only way"); pause offered for one month; no fee stated | Clean baseline, pause as mild save offer |
| 2 | Spotify | https://support.spotify.com/us/article/cancel-premium/ | VERIFIED | Cancel via account page, "Manage your plan"; a form exists for some plans; partner-billed route | Short path, partner-billing branch |
| 3 | Dropbox | https://help.dropbox.com/accounts-billing/cancellations-refunds/cancel-subscription | VERIFIED | Online cancel; app-store route; mail option with letter template; no phone or chat | No-login fallback test (mail) |
| 4 | Audible | https://help.audible.com/s/article/cancel-membership | VERIFIED | Website only (not the app); app-store billing separate; cancel links point to pages named for offers | Retention-offer detection, web-only rule |
| 5 | YouTube Premium | https://support.google.com/youtube/answer/6308278 | VERIFIED (Android article) | In-app steps through paid memberships, reason prompt; platform-billed branches | Multi-step with reason screen |
| 6 | SiriusXM | https://www.siriusxm.com/help/manage-or-cancel-service | VERIFIED | Direct-billed: online account, chat, or phone 866-635-8641; third-party billing branches; do not cancel within 24 hours of renewal | Best test for chat and phone paths |
| 7 | LinkedIn Premium | https://www.linkedin.com/help/linkedin/answer/a545578 | VERIFIED | "Cancel Premium" link for direct purchases; cancel at least one day before billing; trial cancel ends access immediately | Cutoff-time and trial-timing flags |
| 8 | ChatGPT | https://help.openai.com/en/articles/7232927-canceling-your-chatgpt-subscription | VERIFIED | Cancel in account Billing settings; store-billed branches; "can't sign in" support path with identity details; 24-hour cutoff | Direct test of the no-login fallback (17602(d)(3)) |
| 9 | Adobe | https://helpx.adobe.com/account/individual/subscriptions-and-plans/renewals-and-cancellations/cancel-adobe-subscription.html | VERIFIED | Sign in, Manage plan, Cancel your plan, reason, confirm; full refund within 14 days for most plans; a "cancellation fee and refunds" section | Fee and refund-window flags. An older Adobe page (now 404) described an early termination fee on annual-paid-monthly plans; re-check before claiming |
| 10 | Peloton | https://www.onepeloton.com/membership-terms | VERIFIED (terms page) | Change or end via account settings or phone 1-866-679-9129; no prorated refund; fees remain for a committed period | Phone path, cost disclosure. The support article page did not render its body for me |

Reserves (not verified enough to rely on)
- NYT: https://help.nytimes.com/360003499613-Cancel-Your-Subscription. Page loads and the title confirms it, but I could not extract the body. A search summary said phone, chat, or account page; confirm by eye.
- Hulu: https://help.hulu.com/article/hulu-manage-subscription. Loaded but body did not extract. It appears to cover plan changes, not cancel steps.
- Duolingo: the support article URL redirected to a generic help page. Skip.
- Disney+: only non-US help URLs surfaced. Skip.

Live-demo picks, in order: SiriusXM (chat and phone fork, strongest taxonomy coverage), Dropbox (mail fallback), ChatGPT (cannot-sign-in route), Netflix (clean baseline).

Operational guardrails: low request rate, read-only, public pages only, cache every run, record robots and terms notes per site, no accounts or credentials entered on real sites.

---

## 4. (c) Dark-pattern taxonomy the grader labels

Rule for the labeler (`step-5-preview` plus DOM text): never label from impression. A label needs quoted on-screen text or a measured value, a screenshot ID, and a confidence. Default is "no label."

| Pattern | One-line detection rule |
|---|---|
| Confirmshaming | The decline option's label uses guilt or self-criticism ("No thanks, I don't want to save money") while the accept option is neutral, and the quoted text appears in the screenshot |
| Forced chat | After cancel intent, the only offered route is a chat or live-agent prompt, with no self-serve cancel control and no stated phone or email within 3 clicks |
| Hidden link | A cancel control exists but is 4 or more clicks from the entry point, or its measured contrast is below 3:1, or its font size is under 12px, or it sits behind a euphemism ("Manage plan") with no cancel wording on that screen |
| Save-offer loop | Two or more consecutive offer or pause screens appear before a final confirm, or an offer screen shows no visible "continue to cancel" control (the 17602(e)(2) test) |
| Phone-only | The public page lists phone as the only cancellation route (no online, email, or mail) for a service with online sign-up |

Optional additions if time allows
- **Forced survey:** a mandatory reason selection with no skip, before the confirm step.
- **Mail-only:** the only fallback is postal mail with no electronic route.
- **Pause as default:** the pre-selected action is pause or downgrade instead of cancel.
- **Re-authentication trap:** repeated login prompts between cancel steps.

---

## 5. (d) Top 3 risks and the cut plan

### Risks
1. **ASI:One and Agentverse integration friction.** The Fetch rules are strict (registered agent, Agent Chat Protocol, whole workflow in chat, Submission Agent, public repo). Mitigation: stand up a hello-world agent, discoverable and answering in asi1.ai, within the first two hours. Ship text replies before cards. Keep the Payment Protocol step labelled as simulated if real integration slips.
2. **Live grading on real sites is brittle and the labeler can be wrong.** In this session several help pages returned 403, blocked fetches, or empty bodies. Mitigation: grade the public path only, cache a recorded run for every demo service, keep three live candidates plus a labelled demo merchant fallback, apply the "no quote, no label" rule, show confidence, and let companies reply.
3. **The payment story over-claims.** Visa Intelligent Commerce sandbox access is unverified, and "pays and cancels for you" can read as handling real money or implying a partnership. Mitigation: use a clearly labelled simulation unless sandbox access is confirmed, never use a real card, state the limits on screen, and have the user approve the spend cap and last-day date in a review card.

### Checkpoint at 20:00
I assumed 20:00 is a mid-point checkpoint (roughly hour 9 to 10 of 22). Tell me if it is later.

Must be true at 20:00
- The agent is registered and answering in ASI:One.
- One real public cancel path is graded end to end with an Exit Grade card.
- Sentry traces are being emitted for that run.

If behind, cut in this order
1. Interactive Cards polish, fall back to formatted text replies.
2. Real Payment Protocol and Visa sandbox, fall back to the labelled simulation.
3. Live grading of 10 services, fall back to 3 live plus 7 cached runs.
4. Session Replay beyond one recorded run (keep Tracing plus one replay link).
5. Right-of-reply UI, keep it as a text field in the evidence receipt.
6. The time-skipped last-day demo, fall back to a pre-recorded receipt.

Never cut
- ASI:One as the primary interface.
- One real live grade.
- The `step-5-preview` call at runtime.
- The evidence receipt with a Sentry trace link.

Stretch only: Photon, leaderboard, Devin.

---

## 6. 22-hour plan for 4 people (adjust as needed)

| Role | Owns |
|---|---|
| Lead (agents, Python) | uAgents, Chat Protocol, Agentverse registration, Interactive Cards, orchestration, submission |
| Research | Rubric, rules table with citations, service list verification, taxonomy test cases, legal wording |
| Backend | Browser Use runner, grader, caching, step-5-preview labeling, scoped-credential simulation, Sentry |
| UI/UX | Card layouts, evidence receipt, demo script and video, landing page for the company reply |

Rough timeline
- Hours 0 to 3: agent hello-world in ASI:One, Sentry wired, rubric draft, three target services picked.
- Hours 3 to 10: grader on one real path, labeler working on screenshots, grade card in chat.
- Hours 10 to 16: approval card, scoped-credential simulation, last-day scheduler (time-skip), evidence receipt with replay.
- Hours 16 to 20: caching for all services, reliability pass, break-a-service live demo.
- Hours 20 to 22: demo video, README, Devpost, Fetch Submission Agent, rehearsal.

For a 2-person team: cut the UI/UX and research roles into the other two, drop to 3 services (1 live, 2 cached), skip right-of-reply, and use text replies instead of cards if cards slip.

---

## 7. Open items to verify
- Confirm every B&P 17602 cite against leginfo.legislature.ca.gov (I could not load it).
- Confirm 17601(6) (free-to-pay definition). Single source.
- Confirm Visa Intelligent Commerce sandbox availability and terms.
- Confirm Browser Use and Photon rules (their docs were not read here).
- Check each live-demo site's terms before automated reads.
- I recall the federal FTC click-to-cancel rule being vacated in 2025. Unverified here. Do not cite it without checking.
