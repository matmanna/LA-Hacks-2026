# Natural advocate demo configuration

This script replaces the dedicated conference branch's three-stage workflow with one advocate prompt. ElevenLabs requires one `start_node`, so the graph retains that node with no outgoing edges or conversation stages. It preserves the existing model, voice, duration limit, background-voice filter, and other audio settings. Turn-taking becomes more patient: a 20-second response timeout, patient eagerness, and no speculative generation. All other turn settings, including the disabled silence hangup, are preserved. It never changes the original branch or an existing shared tool.

Run from the repository root with local environment settings. The default only reads provider configuration and saves a reviewable proposal:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts
```

Review `tmp/demo-advocate-proposed.json`. Once the matching controller and case-data changes are deployed, apply it:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts --apply
```

The script refuses an active LiveKit room or a missing, main, or original target branch. Apply saves a timestamped backup in ignored `tmp`, creates missing dedicated client tools, updates only the conference branch, and reads it back to verify the result. Matching tools are reused on subsequent runs. Provider requests have no automatic write retries. A partial failure may leave unused tools or an updated conference branch; inspect the backup and rerun after resolving the failure. Safe fields from the most recent provider validation failure are saved in `tmp/demo-advocate-validation.json`. Do not commit backups or local settings.

The controller must implement parameterless `finish_call`, `pause_advocate`, and `resume_advocate` client tools and allow only the native `skip_turn` system tool, which the provider handles without client audio. All other built-in tools, including the provider's end-call tool, stay disabled. Send `hospital_name`, `account_last4`, `disputed_items`, `ask`, `case_context`, `patient_name`, and `patient_dob` as dynamic variables. Use only fictional patient details in this demo. The patient joins automatically and hears the personalized introduction before hospital dialing; this change does not make that initial briefing interactive.

The representative leads account lookup and their verification process. Permission to continue or record does not establish patient identity or access authorization. The advocate answers requested lookup questions briefly, waits until the representative has the account ready and required permissions, then discusses one concern at a time. Identifiers supplied for account lookup do not replace the patient's direct verification or approval.

Two kinds of silence serve different purposes. For “Give me a moment while I find the account,” the advocate may acknowledge once, then uses the provider's [skip-turn tool](https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/skip-turn) to wait without speaking. Relevant conversation from the representative can continue this ordinary wait. Hold music, announcements, background conversation, and pauses do not call for repeated check-ins. For a direct patient–representative exchange, `pause_advocate` enforces silence until the patient explicitly invites the advocate back; `skip_turn` cannot release that protection.

For the role-play, staff asks for the patient, the advocate yields, and both humans exchange several turns. The patient then explicitly says “BetterBill, please continue” or “Advocate, explain that charge.” Only the patient actor should address the advocate while paused: mixed audio cannot authenticate who said the request. A single clarification should return to silence afterward. Muting the advocate does not stop recording or transcription.

Rehearse a slow account lookup, the patient answering verification, a representative correcting a detail, and a short hold before discussing a charge. Expect short answers, no interruption of the human exchange, and no recitation of every code or amount. This is a conversation exercise rather than a fixed script.

Checks, from `packages/api`:

```powershell
bunx vitest run scripts/demo-advocate-config.test.ts
```

The script does not place calls. A live rehearsal is still needed to assess model behavior, speech timing, and background-noise handling.
