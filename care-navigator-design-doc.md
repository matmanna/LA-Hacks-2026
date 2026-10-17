# Care Navigator and Network Check: Design Doc and Grades

Companion to `escape-hatch-spec.md`, `values-lens-design-doc.md`, and `ideas-abstracts.md`.

Status notes
- "The idea" here means the medical navigation idea from the last discussion: ingest records, read insurance info, use location and network, check availability, research specialists, rank matches, book appointments, and prepare for visits. If you meant Escape Hatch, its spec is `escape-hatch-spec.md`.
- Two versions are graded: the **full vision** (Care Navigator) and a **narrow hackathon build** (Network Check) that I recommend if this idea is chosen.
- Team assumption: 4 people and about 22 hours, taken from the most recent brief. Section 13 says what to cut for 2 people and 36 hours.
- Sponsor facts come from the LA Hacks track page and the Google Docs I read earlier. Fetch.ai's prize pool is unverified. Photon's guidelines (a Notion page) were not read, and its prize is unknown. Anything marked UNVERIFIED was not confirmed in this session.
- All demo data is synthetic. Nothing here is medical or legal advice.
- No em dashes.

---

## 1. Summary

**Problem.** Finding the right specialist is slow and error-prone. Directories can be wrong about who takes your insurance and who is accepting patients. Availability is rarely public. Booking means phone tag or a portal. People arrive at the visit unprepared.

**Full vision (Care Navigator).** A chat agent that reads a patient's records and insurance information, finds specialists near them, verifies which ones are in network and taking patients, ranks the matches with reasons the patient can see, books an appointment, and prepares them for the visit.

**Recommended hackathon build (Network Check).** The part with the strongest novelty and the most demonstrable result: **verify by phone what directories only claim.** Given a specialist type, location, and insurance card (all synthetic), the agent finds candidates, calls the top few, confirms in-network status, new-patient status, and earliest appointment, ranks by what was verified, and books one after the user approves. Record ingestion and visit prep are cut or reduced to a short checklist.

---

## 2. Principles

1. **Evidence or silence.** Every attribute shows where it came from: "Verified by call" (with timestamp and transcript), "Listed" (directory, unverified), or "Not verified." Missing evidence is never scored as a pass.
2. **The patient approves every outbound action.** No call is placed and no booking is made without an approval card.
3. **Synthetic data only in the demo.** No real health information is entered, stored, or sent to any third party during the hackathon.
4. **Not medical advice.** The agent never triages symptoms, recommends treatment, or chooses a specialty. The user (or a referral letter they supply) names the specialty. Ranking is by stated criteria, not clinical judgment.
5. **Disclose the AI on calls.** Calls identify the agent as an automated assistant acting for the patient.
6. **Show the criteria.** The ranking formula and weights are visible and adjustable.

---

## 3. Full vision workflow

| # | Stage | What happens | Data source | Difficulty in 22h |
|---|---|---|---|---|
| 1 | Medical record ingestion | Parse a summary of conditions, medications, referral note | Synthetic patient records (Synthea can generate them; check its current availability and license); real records would use patient-access exports or FHIR (details UNVERIFIED) | Hard for real data, medium for synthetic |
| 2 | Insurance info | Read an insurance card photo, extract payer and plan | StepFun `step-5-preview` or Gemini on an image of a fake card | Medium |
| 3 | Location | Geocode the patient's address, compute radius and drive time | Geocoding service (check usage terms) | Easy |
| 4 | Network | Determine whether a clinic is in network | Carrier directories, which can be inaccurate (the "ghost network" problem, UNVERIFIED as a statistic); verification by call | Hardest |
| 5 | Availability | Find earliest appointment and whether new patients are accepted | Rarely public; needs calls or portals | Hard |
| 6 | Researching specialists | Candidate list with credentials and affiliations | Public NPI Registry (API availability and fields UNVERIFIED), clinic websites | Medium |
| 7 | Ranking matches | Explainable score over verified fit, earliest slot, distance, telehealth, language, referral needs | User-set weights | Medium (no ground truth) |
| 8 | Booking | Book by phone or portal after approval | Phone call, mock portal | Hard for real clinics, easy for test lines |
| 9 | Preparing for visits | Checklist, question list, medication list, forms, directions, SMS reminders | Summarized synthetic records | Medium |

---

## 4. Recommended build: Network Check

Scope (hero path)
1. **Intake in ASI:One chat.** User says what specialist type they need, gives a ZIP, and sends a photo of a synthetic insurance card.
2. **Read the card.** `step-5-preview` extracts payer, plan name, and the last four of the member ID. Everything else is discarded.
3. **Find candidates.** Query the NPI Registry for the specialty within a radius. Show the directory's claims labeled "Listed."
4. **Verify by phone.** After an approval card, the agent calls three clinics (in the demo, test lines your teammates answer while playing receptionists) and asks: Do you accept this plan? Are you accepting new patients? Is a referral required? What is the earliest appointment? Each call produces a transcript and a short structured result.
5. **Rank with reasons.** Verified in-network and new-patient status outrank listed claims, then earliest slot, distance, and telehealth. The result card shows each reason and its evidence.
6. **Book one.** After approval the agent calls to book. A confirmation SMS and a short prep checklist (bring card, ID, referral, medication list, three questions) go to the patient.
7. **Evidence trail.** Sentry traces and a replay for every run. A receipt lists each call with timestamp and outcome.

Explicitly cut
- Real record ingestion (use a one-paragraph synthetic referral note at most).
- Real clinics in the demo.
- Portal booking and multi-clinic scheduling beyond three calls.
- Visit prep beyond a checklist.

Stretch only: Browser Use on a mock portal, Photon SMS reminders sent a day later (time-skipped), a leaderboard of directory accuracy, Devin.

---

## 5. Agents (Fetch.ai Agentverse, Agent Chat Protocol)

| Agent | Role |
|---|---|
| Orchestrator | Handles the ASI:One conversation, plans steps, shows Interactive Cards |
| Intake agent | Reads the card image and referral note, produces a minimal structured profile |
| Directory agent | Queries the NPI Registry and applies location filters |
| Verifier agent | Places and records calls through Photon with ElevenLabs voice, returns structured findings |
| Ranker | Scores candidates with the visible formula |
| Scheduler | Books, sends SMS confirmations, builds the prep checklist |

Fetch requirements to meet (per the Fetch doc): register at least one agent on Agentverse, implement the Agent Chat Protocol, be discoverable and usable through ASI:One, complete the primary workflow inside an ASI:One conversation, submit through the Submission Agent along with Devpost, and provide a public GitHub repo. Interactive Cards and the Payment Protocol earn bonus consideration. Payment Protocol has little natural use here, so do not force it.

---

## 6. Data and evidence rules

| Tier | Source | Label shown |
|---|---|---|
| 1 | Phone call to the clinic, recorded transcript, timestamp | "Verified by call" |
| 2 | Directory listing (NPI Registry, carrier directory) | "Listed, not verified" |
| 3 | Clinic website text | "Stated on website" |
| none | Nothing | "Not verified" |

Rules
- Verified results expire. Show the date, and treat anything older than a configurable window as "Listed."
- A directory claim that a call contradicts is shown as a **mismatch** with both sources.
- Calls identify the AI, ask permission to record where required, and never read out more patient data than needed (plan name and a member ID suffix, not a full ID).
- No full member ID, address, or record content is stored. Keep a minimal profile and delete it after the session in the demo.
- Ranking explanations must cite which tier each attribute came from.

---

## 7. Features

Hero (demo path): chat intake, card reading, candidate list, three verification calls with transcripts, ranked result card with reasons, booking call, SMS confirmation and prep checklist, Sentry trace and replay.

Supporting: adjustable weights, "mismatch" view (directory said yes, clinic said no), per-call receipt.

Stretch: Browser Use on a mock scheduling portal, time-skipped reminder SMS, directory-accuracy leaderboard across synthetic clinics, richer visit prep from a synthetic record summary.

---

## 8. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Agents | Fetch.ai uAgents or plain Python with the Agent Chat Protocol, Agentverse registration | Required for the Fetch track; whole workflow in ASI:One |
| Calls and SMS | Photon (calling and messaging agent) | Photon's challenge is exactly agents that place calls and message; access to the 2.0 beta may be needed |
| Voice | ElevenLabs (MLH prize) | Natural speech on calls |
| Image understanding | StepFun `step-5-preview` (must be called at runtime for that prize) | Reads the insurance card photo; the doc mentions using image understanding to guide the next action |
| Language tasks | Gemini (MLH) | Summarizing the referral note, drafting the prep checklist, call-result extraction fallback |
| Provider search | NPI Registry public data (API details UNVERIFIED) | Candidate list |
| Geocoding | A geocoder with terms that allow this use (check) | Radius and distance |
| Synthetic patients | Synthea or hand-written fixtures (UNVERIFIED availability) | No real health data |
| Storage | Postgres, Tiger Data for time-series of call outcomes (MLH) | Evidence log, expiry |
| Hosting | Vultr (MLH) | Services and the call-handling backend |
| Observability | Sentry Tracing, Session Replay, Logs, AI agent monitoring | Prize needs 2+ products beyond error monitoring |
| Design | Paper | Card layouts, receipt design |
| Build assist | Devin | Stretch only |
| Domain | GoDaddy Registry (MLH) | Cheap add-on |

---

## 9. Track and prize coverage

| Track | Prize (from docs) | Full vision | Network Check |
|---|---|---|---|
| Fetch.ai | Pool unverified | A- | A- |
| Photon | Unknown | A | A |
| Applied Intelligence | No prize listed | A | A |
| Browser Use | Unknown | B | C+ (stretch only) |
| Sentry | Interview for each team member | B | B |
| StepFun | Unknown | B+ | B+ |
| Visa | 1st: $2,000 | D | D |
| MLH Gemini | Google swag kits | A- | B+ |
| MLH ElevenLabs | Wireless earbuds | A- | A- |
| MLH Vultr | Portable screens | C+ | C+ |
| MLH Tiger Data | Stream Deck Mini | C | C |
| MLH Snowflake | Raspberry Pi 4 | C+ | D |
| MLH Domain | Digital gift card | B- | B- |
| Paper | Up to $1,500 | B- | B- |
| Best Use of Devin | 1st: $5,000 Devin credits | C+ | C |
| Model Learning | Unknown | C | D |
| Base44, Intuit, Workday, veri.studio, Solana | Various | D | D |

Prize stacking across sponsors is unverified. Check the rules before planning around entering several.

---

## 10. Novelty

- Verification by phone as the product's core. Most doctor-finders show directory data. This one says which facts it confirmed, when, and by whom.
- Tiered evidence with visible mismatches between what a directory claimed and what a clinic said.
- Explainable ranking tied to evidence tiers.
- Competitors exist: examples include Zocdoc and insurer or navigation-service apps (current features not checked). The differentiator is the verification step and the evidence trail, not the finder or the booking.

---

## 11. Business model and marketability

### Possible revenue
1. **Employers and benefits platforms** pay per member for navigation with verified results.
2. **Payers** pay for directory-accuracy audits and for reducing member complaints from wrong network information (demand UNVERIFIED).
3. **Provider groups** pay to fill schedules and to keep their listed information accurate, with a firewall so payment never changes a verified result.
4. **Consumer freemium:** a few verified searches free, a subscription for ongoing care coordination for a household.
5. **API:** verified availability and network status for other apps, priced per query.

### Marketability examination
| Question | Assessment |
|---|---|
| Real pain? | Yes, high emotional weight and cost of errors |
| Willingness to pay | Moderate for consumers, higher for employers and payers, but long sales cycles |
| Competition | Crowded: scheduling marketplaces, insurer tools, navigation services |
| Differentiation | Real but narrow: verified-by-call evidence |
| Regulatory exposure | High: health data rules, call recording laws vary by state (UNVERIFIED specifics), medical-advice boundaries |
| Unit economics | Calls cost money and clinics are not always reachable; per-search cost must be modeled |
| Defensibility | Dataset of verified outcomes and the verification process; copyable otherwise |

Main risks: privacy and compliance burden before any real use, clinic reluctance to take automated calls, and costs per call.

Validation plan: interview 5 to 10 people who recently searched for a specialist, 3 to 5 clinic front-desk staff about receiving automated calls, and 3 to 5 benefits or navigation professionals.

---

## 12. Demo script (3 minutes)

1. In ASI:One, the user (synthetic patient) asks for a cardiologist near a ZIP and uploads a fake insurance card.
2. Card read: payer and plan shown, the rest discarded.
3. Candidate list appears with each fact labeled "Listed."
4. Approval card: three clinic calls, what will be asked and what will be shared.
5. Calls run (test lines). Transcripts and verified results stream in. One clinic contradicts its listing: a **mismatch** is highlighted.
6. Ranked card with reasons and evidence tiers. User adjusts a weight, ranking reorders.
7. Approve booking, booking call completes, SMS confirmation and prep checklist arrive.
8. Show the Sentry trace and replay, and the receipt of all calls.

---

## 13. Priorities and plan

| Role | Owns |
|---|---|
| Lead (agents, Python) | Fetch agents, ASI:One cards, orchestration, submission |
| Research | NPI data, call script, evidence rules, synthetic fixtures, legal wording, clinic test-line roles |
| Backend | Photon and ElevenLabs call pipeline, transcript extraction, ranking, storage, Sentry |
| UI/UX | Cards, receipt, demo script and video |

Rough timeline
- Hours 0 to 3: hello-world agent discoverable in ASI:One, Sentry wired, NPI query working, test phone lines arranged.
- Hours 3 to 10: card reading, candidate list, one end-to-end verification call with a transcript.
- Hours 10 to 16: three calls in sequence, ranking with reasons, approval cards, booking call.
- Hours 16 to 20: mismatch view, SMS and checklist, reliability pass (clinic does not answer, wrong plan, call drops).
- Hours 20 to 22: demo video, README, Devpost, Fetch Submission Agent.

Must be true at the mid-point checkpoint: agent answering in ASI:One, one verification call placed and transcribed, a ranked result shown with evidence tiers.

Cut order if behind: Interactive Card polish (use text), booking call (stop at the ranked result), second and third verification calls (one real, two recorded), SMS and checklist, mismatch view. Never cut ASI:One as the interface, one real call, the `step-5-preview` call, or the evidence receipt.

For 2 people and 36 hours: drop the research and UI roles into the others, keep one verification call live and two recorded, use text replies instead of cards if needed.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Health data privacy and compliance | Synthetic data only, minimal profile, delete after session, no third-party storage of real records; a real launch would need a compliance review (not done here) |
| Reads as medical advice | The user names the specialty; ranking uses stated criteria; visible disclaimers |
| Calls to real clinics: consent, recording laws, abuse | Demo with test lines you control; disclose AI on every call; ask permission to record where required; rate limits |
| Wrong network or availability data could cause financial or health harm | Evidence tiers, expiry dates, explicit "verify with your insurer" message, show mismatches |
| Call reliability (voicemail, hold, wrong person, accents, noise) | Structured extraction with confidence, human-review fallback, recorded runs as backup |
| Scope | Network Check only; hero path above; cut order defined |
| Fetch constraint | Entire workflow completes in ASI:One |
| Directory data gaps | Say "not verified"; never fill gaps with guesses |
| Ranking bias | Visible formula, adjustable weights, no demographic inputs |
| Photon beta access and unknown rules | Request access early, read the guidelines, keep a recorded fallback |

---

## 15. Grades (A to F, my estimates)

Columns for the other ideas come from earlier discussion. Escape Hatch grades were stated in part earlier and filled in here for missing factors, so treat those as approximate.

| Factor | Care Navigator (full) | Network Check (narrow) | Escape Hatch | Values Lens | Watchdog | Hospital Bill Auditor |
|---|---|---|---|---|---|---|
| Demo compellingness | A- | A- | A- | A- | A- | B+ |
| Fit in 22h (4 people) | D+ | B- | B | C+ | B | C |
| Uniqueness | C+ | B | B+ | B+ | A- | B+ |
| Emotional or real-people impact | A | A- | B | A- | B+ | A |
| Real, non-mock demo | C | C+ | B | C | B- | C |
| Track coverage | A- | A- | B+ | A | A- | A- |
| Prize and stakes | B | B | B | B+ | B+ | B |
| Commercial viability | B | B- | B+ | B+ | B | B |
| Marketability | B- | B- | B | B | B- | B |
| Safety, legal, and privacy risk (A = low risk) | D | C | C+ | C | B | D+ |
| Fit with your experience | B | B+ | B+ | B+ | B+ | B- |
| Form factor fit (chat-first for Fetch) | A- | A- | A- | A- | B+ | B |
| Judge friendliness | B- | B+ | A- | B+ | A- | B |
| **Overall** | **C+** | **B** | **B+ to A-** | **B+** | **A-** | **B** |

### Reading the grades
- **Network Check beats the full vision** because it removes the data problems that sink a medical project in 22 hours: real records, real network data, real clinics, and real booking systems.
- **Where Network Check is strong:** emotion, the Photon fit (the most direct of any idea so far), ElevenLabs, Applied Intelligence (healthcare is named), and the "verified, not claimed" story that matches the evidence-first principle judges liked.
- **Where it is weaker than Escape Hatch:** the demo depends on test lines instead of real sites, so the panel's "mock-heavy" complaint applies, and the legal and privacy risk is higher. It also has no real Visa, Browser Use, or Sentry hero, and its Fetch fit is good but not unique.
- **Uniqueness is moderate:** the finder and booker categories are crowded. The verification step and the mismatch view are the differentiators.
- **Prize value:** Photon, Applied, and Fetch are the main prospects. Photon's and Applied's prize amounts are unknown. ElevenLabs and Gemini are swag.

### Recommendation
Escape Hatch remains the stronger choice for a 22-hour build because its demo runs on real public pages and its risk is lower. Choose Network Check only if the team wants the health story and the Photon track. In that case, build only the narrow version in section 4. The first three hours (an ASI:One agent, Sentry, and the evidence receipt) are shared with Escape Hatch, so the team can start on those and decide at the first checkpoint.

---

## 16. Open items to verify
- NPI Registry API availability, fields, and usage terms.
- Synthea availability and license, or write fixtures by hand.
- Photon 2.0 beta access, guidelines, and call limits (Notion guidelines page not read).
- State call-recording and consent rules for the demo location and the clinic roles.
- Whether directory inaccuracy is well documented enough to cite (do not cite a statistic without a source).
- Fetch.ai prize pool.
- Terms for any geocoding service used.
