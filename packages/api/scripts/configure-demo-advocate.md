# Natural advocate demo configuration

This script replaces the dedicated conference branch's three-stage workflow with one advocate prompt. ElevenLabs requires one `start_node`, so the graph retains that node with no outgoing edges or conversation stages. It preserves the existing model, voice, duration limit, background-voice filter, and other audio settings. Turn-taking becomes more patient: a 20-second response timeout, patient eagerness, and no speculative generation. All other turn settings, including the disabled silence hangup, are preserved. The script adds `agent_response_complete` to the existing `conversation_config.conversation.client_events` list and verifies the merged settings after writing. It never changes the original branch or an existing shared tool.

Run from the repository root with local environment settings. The default only reads provider configuration and saves a reviewable proposal:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts
```

Review `tmp/demo-advocate-proposed.json`. Once the matching controller and case-data changes are deployed, apply it:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts --apply
```

The script refuses an active LiveKit room or a missing, main, or original target branch. Apply saves a timestamped backup in ignored `tmp`, creates missing dedicated client tools, updates only the conference branch, and reads it back to verify the result. Matching tools are reused on subsequent runs. Provider requests have no automatic write retries. A partial failure may leave unused tools or an updated conference branch; inspect the backup and rerun after resolving the failure. Safe fields from the most recent provider validation failure are saved in `tmp/demo-advocate-validation.json`. Do not commit backups or local settings.

The controller must implement parameterless `finish_call`, `pause_advocate`, and `resume_advocate` client tools and allow only the native `skip_turn` system tool. `finish_call` withdraws the AI and stops its listening/processing when either human refuses AI participation, recording, or transcription; it leaves the humans connected. It must never end their conference after a model-generated recap. Patient hangup, browser departure, or an explicit spoken request to end the whole call are separate controller actions. All other built-in tools, including the provider's end-call tool, stay disabled. Worker preflight must require the completion event before starting a call: the controller buffers a response until that event, permits only an authorized answer, then returns to silence. A missing completion signal must fail closed rather than release unbounded speech. Send `hospital_name`, `account_last4`, `disputed_items`, `ask`, `case_context`, `patient_name`, and `patient_dob` as dynamic variables. Use only fictional patient details in this demo. The patient joins automatically and hears the personalized introduction before hospital dialing; this change does not make that initial briefing interactive.

The representative leads account lookup and their verification process. Permission to continue or record does not establish patient identity or access authorization. The advocate may answer requested lookup questions briefly; identifiers supplied for account lookup do not replace the patient's direct verification or approval. The advocate must never compare a patient's identity answer with the supplied facts, challenge it, or ask for a different answer. Staff and the patient resolve identity questions directly.

Two kinds of silence serve different purposes. For “Give me a moment while I find the account,” the advocate may acknowledge once, then uses the provider's [skip-turn tool](https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/skip-turn) to wait without speaking. Relevant conversation from the representative can continue this ordinary wait before the patient takes over. Hold music, announcements, background conversation, and pauses do not call for repeated check-ins. Once the humans speak directly, the controller keeps the advocate silent until the patient specifically asks it for help. Neither tool calls nor staff requests can override that protection.

Patient and hospital audio are transcribed separately from their known LiveKit connections. The controller sends their discussion as context while quiet; only a finalized request from the patient's connection can permit one answer. This attributes speech to a connection, not an authenticated physical person: speakerphones, nearby voices, or someone else using the phone remain limits. Muting the advocate does not stop recording or transcription.

For the role-play, staff asks for the patient, the advocate yields, and both humans exchange several turns. Have staff ask the advocate a question, pause, and complete verification: all must leave it silent. The patient then explicitly says “Advocate, can you help?” or “Advocate, explain that charge.” Each patient invitation permits one answer, followed by silence again. Another staff question does not authorize a second answer. The prompt supports this policy; the controller enforces it.

Rehearse a slow account lookup, the patient answering verification, a representative correcting a detail, and a short hold before discussing a charge. Expect short answers, no interruption of the human exchange, and no recitation of every code or amount. This is a conversation exercise rather than a fixed script.

Checks, from `packages/api`:

```powershell
bunx vitest run scripts/demo-advocate-config.test.ts
```

The script does not place calls. A live rehearsal is still needed to assess model behavior, speech timing, and background-noise handling.
