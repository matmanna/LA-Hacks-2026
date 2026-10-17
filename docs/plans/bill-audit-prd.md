# Redline (working name): Product Requirements Document (PRD)

Version: hackathon MVP for the October 17 to 18, 2026 event. Companion to `bill-audit-design-doc.md` (competitive analysis against Goodbill, savings model, track analysis, task split).

Conventions: P0 = required for the demo, P1 = should have, P2 = stretch. All demo bills, records, and patient details are synthetic. No em dashes.

---

## 1. Overview

**Product:** a chat-based medical bill auditor delivered in an ASI:One conversation. It reads a hospital bill, audits it line by line with cited evidence, screens for financial assistance, estimates savings as a range, and drafts or places the itemized-bill request and the dispute, with the user approving every outbound action.

**Reference point:** Goodbill, an existing service that obtains a patient's billing records, reviews them for coding errors and pricing discrepancies, and negotiates with the hospital for a success fee (20% of savings, capped at $1,000, per its help center). Redline is the self-serve, evidence-first alternative: faster first insight, visible evidence, user control, lower cost, and chat, SMS, and voice access.

## 2. Problem

- Hospital bills are hard to read, often arrive without itemization, and may contain errors or charges far above published prices.
- Most people do not request an itemized bill or know how to dispute a charge.
- Existing services charge a share of savings, need record authorization before showing any findings, and do not show their reasoning in the product (based on the pages reviewed).
- Hospital financial assistance policies exist but are hard to find and apply.

## 3. Goals and non-goals

Goals
1. Turn a bill photo or text into confirmed line items in under a minute (target, to be measured).
2. Produce flags where every flag shows the line, the rule or source, and a date.
3. Estimate savings as a range with confidence tiers and a visible method.
4. Screen financial assistance eligibility from a real hospital's public policy.
5. Draft the itemized-bill request and the dispute letter, and make one approved call to a test line.
6. Complete the primary workflow entirely in an ASI:One conversation.

Non-goals (hackathon)
- Real patient data, real hospital calls, or real submissions.
- Negotiating outcomes or claiming real savings.
- Medical advice, legal advice, or any determination that a charge is illegal.
- Insurance appeals and denial disputes.
- Bills in collections, and overpayment recovery workflows (P2 audit only).
- A native mobile app.

## 4. Users

| Persona | Need |
|---|---|
| **Overwhelmed patient** | Understand a large bill and know what to do next |
| **Family caregiver** | Review a parent's bill and send a dispute with approval |
| **Cost-conscious uninsured or underinsured patient** | Check financial assistance and self-pay options |

Secondary audience: judges and sponsors who need to see their requirements met.

## 5. User stories

1. As a patient, I send my bill and see the lines it read so I can fix mistakes.
2. As a patient, I see which lines look wrong and why, with the source, so I can trust the result.
3. As a patient, I see a savings estimate range and how it was computed so I know what to expect.
4. As a patient, I see whether I might qualify for the hospital's financial assistance, with the policy quote.
5. As a patient, I approve a letter or a call before anything is sent.
6. As a patient, I track the case and get reminders.
7. As a patient, I export the evidence for an appeal or a complaint.

## 6. Scope

| Priority | Item |
|---|---|
| P0 | ASI:One agent registered on Agentverse (Agent Chat Protocol) |
| P0 | Bill reader: photo or text to line items, user confirmation |
| P0 | Rules engine: duplicates, unit anomalies, EOB mismatch (confirmed or rule-based flags with evidence) |
| P0 | Savings estimate with confirmed, potential, and assistance shown separately |
| P0 | Dispute letter with citations, approval, send to a test inbox |
| P0 | Sentry traces on every parse, rule, and call |
| P1 | Unbundled code pairs from a curated table with sources |
| P1 | Live capture of one real hospital's public price file and financial assistance policy (Browser Use) |
| P1 | Billed versus published price comparison |
| P1 | Financial assistance screener |
| P1 | One approved call to a test line (Photon, ElevenLabs), transcript, outcome |
| P1 | Itemized-bill request draft |
| P1 | Redline viewer page |
| P2 | SMS reminders and case timeline |
| P2 | Evidence packet export |
| P2 | Audit of paid bills (flag only) |
| P2 | Fine-tuned extractor with before and after evaluation |

## 7. Functional requirements

### FR-1 Conversation and cards
- FR-1.1 The agent is registered on Agentverse and implements the Agent Chat Protocol. Acceptance: usable from asi1.ai; the primary workflow completes without a custom frontend.
- FR-1.2 Input accepts pasted text, a link, or an image if ASI:One supports it (UNVERIFIED). Acceptance: at least pasted text and a link work.
- FR-1.3 Cards for lines, audit, assistance, action, approval, result. Acceptance: Interactive Cards if supported, otherwise formatted text with the same fields.

### FR-2 Bill reader
- FR-2.1 Extract line items (date, description, code if present, units, charge) and totals into structured data. Acceptance: on the synthetic set, line-level extraction accuracy is measured and reported.
- FR-2.2 Show the extracted lines back to the user for confirmation and editing. Acceptance: the user can correct a line, and the audit uses the corrected data.
- FR-2.3 Validate arithmetic. Acceptance: if line totals do not match the bill total, show the difference and ask for review before auditing.
- FR-2.4 Image reading uses `step-5-preview` at runtime. Acceptance: call logged in the trace.

### FR-3 Audit rules
- FR-3.1 Duplicate or repeated charges: same code, date, and amount appearing more than once without a stated reason. Acceptance: all seeded duplicates in the synthetic set are flagged; tier "Confirmed from your documents."
- FR-3.2 Unit and quantity anomalies: units above a configured bound for the line, with the bound and its source shown. Acceptance: tier "Rule-based."
- FR-3.3 EOB mismatch: bill amount due versus EOB patient responsibility. Acceptance: tier "Confirmed" when both documents are present and differ.
- FR-3.4 Unbundled pairs (P1): code pairs from a curated table with a source reference. Acceptance: only code numbers and public text are used; licensing of any descriptions checked.
- FR-3.5 Billed versus published price (P1): compare to the hospital's captured price file. Acceptance: tier "From hospital's published data," with capture date; shown as leverage, not as an error.
- FR-3.6 Every flag has: id, line ids, lever, evidence, amount, confidence tier, source, date. Acceptance: flags missing any field are not shown.
- FR-3.7 No flag uses the words "illegal," "fraud," or "overcharge" as a conclusion. Acceptance: wording check on all templates.

### FR-4 Financial assistance screener (P1)
- FR-4.1 Capture the chosen hospital's published financial assistance policy. Acceptance: policy URL, capture date, and the threshold text stored.
- FR-4.2 Ask household size and income (synthetic in the demo). Acceptance: user inputs are not stored beyond the session.
- FR-4.3 Output "likely," "possible," or "unlikely," with the quoted threshold. Acceptance: the card states this is an estimate, not a determination.

### FR-5 Savings estimate
- FR-5.1 Show confirmed amount, potential range, and assistance separately. Acceptance: totals reconcile with the flag list.
- FR-5.2 Show the method in one line per lever. Acceptance: every number links to its flags.
- FR-5.3 Label as an estimate. Acceptance: a visible line states results depend on the hospital and are not guaranteed.

### FR-6 Letters and requests
- FR-6.1 Itemized-bill request (P1) and dispute letter (P0) generated from templates and flags, with citations. Acceptance: every claim in the letter maps to a flag with evidence.
- FR-6.2 The user reviews and approves the exact text. Acceptance: nothing is sent before approval.
- FR-6.3 Send to a test inbox in the demo. Acceptance: delivery logged.

### FR-7 Calls (P1)
- FR-7.1 The agent calls a test line you control after the user approves the script. Acceptance: approval card shows what will be said and what data will be shared.
- FR-7.2 The call opens by identifying an automated assistant acting for the patient. Acceptance: scripted opening verified in the transcript.
- FR-7.3 Record and transcribe where permitted, and extract the outcome (offer, reference number, follow-up date). Acceptance: structured result with the transcript.
- FR-7.4 Share only the minimum data (name, account reference, the disputed lines). Acceptance: no full record or full identifier is spoken.
- FR-7.5 Fall back to a recorded call if the live call fails, and say so. Acceptance: demo labels recorded segments.

### FR-8 Case timeline and evidence (P2)
- FR-8.1 Log every event with time, actor, and artifact. Acceptance: timeline shows requests, letters, calls, responses.
- FR-8.2 Export an evidence packet (bill, flags, sources, letters, transcripts). Acceptance: exports without personal data beyond the synthetic case.

### FR-9 Observability
- FR-9.1 Sentry Tracing and Logs capture each step, and AI agent monitoring is enabled where supported. Acceptance: one trace per request with spans for parse, rules, capture, letter, and call.
- FR-9.2 Session Replay is optional on our viewer only (UNVERIFIED applicability). Acceptance: not required for the demo path.

### FR-10 Safety and privacy
- FR-10.1 Synthetic data only in the demo. Acceptance: no real health information used anywhere.
- FR-10.2 Minimal retention. Acceptance: session data deleted after the demo.
- FR-10.3 Disclaimers on every result: informational, not legal or medical advice. Acceptance: present on all cards.
- FR-10.4 No credentials or full account numbers handled. Acceptance: none requested.

## 8. Definitions

**Confidence tiers**
| Tier | Meaning |
|---|---|
| Confirmed from your documents | Arithmetic or a mismatch between two user documents |
| Rule-based | A curated rule with a cited source and date |
| From hospital's published data | Live-captured public price or policy, with date |
| Not found | No evidence available |

**Savings buckets:** confirmed, potential (range), assistance (separate).

## 9. UX requirements

- Line-confirmation card: each extracted line next to the cropped source, with edit controls.
- Audit card: flags grouped by lever, each with evidence, tier, and amount.
- Savings card: three numbers, method lines, estimate disclaimer.
- Assistance card: policy quote, inputs, estimate.
- Approval card: exact text of the letter or call script, recipient, data shared, approve and cancel.
- Result card: outcome, reference numbers, next date.
- Redline viewer: bill shown like an edited document with highlighted lines and margin notes, a running savings total, and a distinct visual identity (design owner required).
- Principles: clear hierarchy, high contrast, plain language, no generic dashboard look, every number shows its source.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Targets: lines read in about 30 seconds, audit in about 60 seconds (to be measured) |
| Reliability | If reading fails, ask the user to paste text. If a hospital page is blocked, use the cached capture labeled with its date |
| Privacy | Synthetic data only; minimal retention; no third-party storage of real records |
| Security | Secrets in environment variables; no keys in the public repo |
| Accessibility | Text equivalents for all card elements; no information by color alone |
| Compliance | Informational wording; cited rules; call disclosure and consent handled per state rules (UNVERIFIED specifics) |

## 11. Data model (summary)

- **Case:** id, created time, status, consent notes.
- **Bill:** case id, hospital, date, total, lines.
- **Line:** bill id, description, code, units, charge, source crop reference.
- **Document:** case id, type (bill, EOB, policy, letter), stored reference.
- **Flag:** case id, line ids, lever, evidence, amount, tier, source URL, captured date.
- **Benchmark:** hospital, item, published price, source URL, captured date.
- **Policy:** hospital, threshold text, URL, captured date.
- **Action:** case id, type (letter, request, call), approved by user, time, outcome.
- **Call:** action id, transcript, extracted outcome, recording flag.
- **Event:** case id, time, actor, summary.

## 12. Metrics and test plan

Hackathon success metrics
- The hero path completes end to end in the demo without manual intervention.
- Every flag shown has evidence and a source.
- Evaluation results on the synthetic set are reported as measured.

Synthetic evaluation set
- 10 synthetic bills with seeded errors: duplicates, unit anomalies, unbundled pairs, EOB mismatches, and clean bills as controls.
- Measure: line extraction accuracy, recall of seeded errors, false-positive rate on clean bills, evidence completeness (target 100%), and time per audit. Report results as measured. Do not present targets as results.

Tests
- Unit tests for rules, savings math, and wording checks.
- Integration: bill in, audit and letter out for a cached case and a live hospital-page capture.
- Failure tests: unreadable photo, totals mismatch, blocked hospital page, call fails.
- Demo rehearsal with each cut-order fallback.

## 13. Dependencies

| Dependency | Needed for | Status |
|---|---|---|
| Fetch.ai Agentverse and ASI:One | Primary interface | Registration steps and card and image support to confirm |
| StepFun `step-5-preview` | Bill photo reading | Access and limits to confirm |
| Gemini (MLH) | Text cleanup, letter drafting | Standard |
| Browser Use | Live capture of public hospital pages | Rules and limits not read |
| Photon and ElevenLabs | Calls and SMS | Beta access and rules not read; call to a test line only |
| Sentry | Traces and logs | Standard |
| Tiger Data, Vultr (MLH) | Case events, hosting | Optional |
| Public data (price files, policies, edit tables) | Benchmarks and rules | Availability, format, and licensing to verify per hospital and table |

## 14. Risks

See `bill-audit-design-doc.md` section 9. Top three: health data and legal-advice boundaries, public data access and licensing, and call reliability and consent.

## 15. Milestones

| Hours | Milestone |
|---|---|
| 0 to 3 | Agent in ASI:One, schemas, Sentry, one bill read |
| 3 to 9 | Lines confirmed in chat, rules v1, audit card with flags |
| 9 to 14 | Letters and approvals, live hospital-page capture, assistance screener |
| 14 to 18 | One call to a test line, benchmark comparison, cached runs |
| 18 to 20 | Reliability pass, evaluation numbers, feature freeze |
| 20 to 22 | Demo video, README, Devpost, Fetch Submission Agent, rehearsal |

Task owners by role are in `bill-audit-design-doc.md` section 7. Scaffolding steps (Better-T-Stack, TanStack Start, Vercel, mobile-first checklist) are in section 12 of the same file. A difficulty-ordered roadmap with gates and an if-time-permits list is in section 7A of the same file.

## 16. Open questions

1. Does ASI:One accept bill images, and which card types are available?
2. Which hospital has accessible price-transparency and financial assistance pages for the live capture?
3. What are the licensing limits on code tables and descriptions we plan to use?
4. Which state's call-recording rules apply to the demo, and how will test-line participants consent?
5. Does Photon support the call and SMS flow we need, and how do we get beta access?
6. Is the assisted-call fee model something to show in the pitch, or only the free tier?
7. Team size and roles: confirm 4 people and the role split.
