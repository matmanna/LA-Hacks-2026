# Natural advocate demo configuration

This script replaces the dedicated conference branch's three-stage workflow with one advocate prompt. ElevenLabs requires one `start_node`, so the graph retains that node with no outgoing edges or conversation stages. It preserves the existing model, voice, duration limit, background-voice filter, and other audio settings. Turn-taking becomes more patient: a 20-second response timeout, patient eagerness, and no speculative generation. All other turn settings, including the disabled silence hangup, are preserved. The script adds `agent_response_complete` and `agent_tool_response` to the existing client events and verifies the merged settings after writing. It never changes the original branch or an existing shared tool.

Run from the repository root with local environment settings. The default only reads provider configuration and saves a reviewable proposal:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts
```

Review `tmp/demo-advocate-proposed.json`. Once the matching controller and case-data changes are deployed, apply it:

```powershell
bun --env-file=apps/web/.env packages/api/scripts/configure-demo-advocate.ts --apply
```

The script refuses an active LiveKit room or a missing, main, or original target branch. Apply saves a timestamped backup in ignored `tmp`, creates missing dedicated client tools, updates only the conference branch, and reads it back to verify the result. Matching tools are reused on subsequent runs. Provider requests have no automatic write retries. A partial failure may leave unused tools or an updated conference branch; inspect the backup and rerun after resolving the failure. Safe fields from the most recent provider validation failure are saved in `tmp/demo-advocate-validation.json`. Do not commit backups or local settings.

The controller must implement parameterless `finish_call`, `pause_advocate`, and `resume_advocate` client tools and allow only the native `skip_turn` system tool. `finish_call` withdraws the AI and stops its listening/processing when either human refuses AI participation, recording, or transcription; it leaves the humans connected. It must never end their conference after a model-generated recap. Patient hangup, browser departure, or an explicit spoken request to end the whole call are separate controller actions. All other built-in tools, including the provider's end-call tool, stay disabled. Worker preflight requires response and tool completion events. Audio streams as it arrives; the next finalized human turn waits until the advocate's current reply has finished playing. A successful silent `skip_turn` completes a turn without waiting for audio. Send `hospital_name`, `account_last4`, `disputed_items`, `ask`, `case_context`, `patient_name`, and `patient_dob` as dynamic variables. Use only fictional patient details in this demo. The patient joins automatically and hears the personalized introduction before hospital dialing; this change does not make that initial briefing interactive.

The representative leads account lookup and their verification process. Permission to continue or record does not establish patient identity or access authorization. The advocate may answer requested lookup questions briefly; identifiers supplied for account lookup do not replace the patient's direct verification or approval. The advocate must never compare a patient's identity answer with the supplied facts, challenge it, or ask for a different answer. Staff and the patient resolve identity questions directly.

For “Give me a moment while I find the account,” the advocate may acknowledge once, then uses `skip_turn` to wait without speaking. Hold music, announcements, background conversation, and pauses do not call for repeated check-ins. During verification, the advocate waits through the exchange and lets the representative decide when it is complete. It continues naturally when the representative returns to billing. If the patient explicitly asks it to stay quiet, the prompt tells it to wait for their invitation.

Patient and hospital audio are transcribed separately from their known LiveKit connections. Finalized turns from both humans reach the model with speaker attribution; partial transcripts do not cut off a spoken reply. The model decides whether to answer or wait from the conversation instead of a keyword gate. This attributes speech to a connection, not an authenticated physical person: speakerphones, nearby voices, or someone else using the phone remain limits. Muting the advocate does not stop recording or transcription.

For the role-play, staff asks for the patient and both humans complete verification while the advocate waits. Staff then returns to billing and the advocate continues the request without a special phrase. Ask a follow-up question after its answer: it should keep the conversation moving rather than going permanently silent. Have staff offer terms requiring patient approval; the advocate must leave that decision to the patient. Verification and explicit quiet requests are model-guided in this demo rather than a separate keyword state machine.

Rehearse a slow account lookup, the patient answering verification, a representative correcting a detail, and a short hold before discussing a charge. Expect short answers, no interruption of the human exchange, and no recitation of every code or amount. This is a conversation exercise rather than a fixed script.

## Records request

The call asks billing for three things: a hold on the account while the patient reviews it, the itemized bill by email, and how the patient can get the medical records for the named services. It does not argue charges; the letter does that. When staff need to verify the patient, the advocate lets them speak directly and waits until billing resumes.

The patch also adds three data fields, `hold_agreed`, `itemized_promised` and `records_process`, next to the agent's existing ones. `call-outcome.ts` reads them into the call result. Data fields are agent settings in ElevenLabs, so they may also show up on the original branch. They only add analysis fields.

This script does not manage the original branch that direct calls use. Its prompt says "The patient found items that look wrong: {{disputed_items}}. {{ask}}", which no longer matches the approved direct script. Change that line to "I am calling about account ending in {{account_last4}} at {{hospital_name}}. The patient is not on this call. {{ask}}", and change its goal from reviewing the bill to asking for the hold, the itemized bill and how to get the records.

Checks, from `packages/api`:

```powershell
bunx vitest run scripts/demo-advocate-config.test.ts
```

The script does not place calls. A live rehearsal is still needed to assess model behavior, speech timing, and background-noise handling.
