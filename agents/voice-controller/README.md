# BetterBill voice controller

The named LiveKit worker `betterbill-patient-first` bridges the hosted BetterBills
ElevenLabs advocate and two Photon phone participants in one room. It runs no second
LLM. The TypeScript API owns exact app approval, allowlists and one-use dial claims.

## Run locally

The local Docker database is `betterbill-local-db` on `127.0.0.1:5434`, with the same
named data volume. The ignored `apps/web/.env` points to it. Start it with
`docker start betterbill-local-db`. Port 5432 belongs to a separate Windows PostgreSQL
service. No production database is needed.

Install [uv](https://docs.astral.sh/uv/getting-started/installation/), then run here:

```powershell
uv sync --frozen
uv run --env-file ../../apps/web/.env betterbill-voice dev
```

From the repository root, build and start the web app in another terminal:

```powershell
$env:NODE_ENV='production'
bun --bun run --cwd apps/web build
bun --bun run --cwd apps/web serve --host 127.0.0.1 --port 3001
```

Keep both processes running for local calls. Starting the worker only registers it;
no phone rings until the app dispatches a newly approved call. Check for active rooms
before restarting either service. Deploy the API and worker with the same flow version;
old `betterbill-conference` workers must not receive the new flow.

Rebuild the web app after changing `apps/web/.env`, including phone numbers and the
allowlist. The Vite Varlock integration uses `resolved-env`, so the preview server
inherits settings saved at build time; restarting preview alone retains old values.
Before dialing, create a fresh draft and verify the patient suffix in its approval.

Required worker variables: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
`ELEVENLABS_API_KEY`, `BB_VOICE_WORKER_KEY`, `BETTERBILL_VOICE_API_URL`.

Optional background-noise tuning: `BB_NOISE_GATE_DBFS` (default `-40`; audio quieter than this reaches transcription as silence, so lower it if a soft-spoken patient gets cut off, raise it if room noise still counts as speech), `BB_STT_VAD_THRESHOLD` (default `0.6`) and `BB_STT_MIN_SPEECH_MS` (default `300`).
The API origin is currently `http://127.0.0.1:3001`; HTTPS is required outside localhost.
The worker calls `/api/voice` with `x-bb-voice-key`. Never expose these credentials to
client code. Dispatch metadata contains only:

```json
{"actionId":"...","roomName":"bb-...","flowVersion":"patient-first-v1"}
```

Bootstrap returns the selected branch/trunk, approved dynamic variables and personalized
`introductionText`, with no phone destinations. Every request binds the action, room
and flow version. A separate `dial` claim for `patient` or `billing` returns only the
approved phone number for that leg. Claims are single-use: no automatic retry/redial.

## Patient-first behavior

The worker prepares the introduction before dialing. It calls the patient first,
records the answered phone leg, and plays the entire approved introduction. Then it
automatically claims and dials billing. No DTMF handler, keypad acceptance, spoken
response gate, private invitation room or participant move is used. The introductory
message names the hospital and billing concerns, explains the next step, and tells the
patient to speak directly when hospital staff needs approval. This introduction is
not interactive; questions are handled once billing and the hosted advocate join.
Phone answer and introduction completion
are connection progress, not patient approval. An answered phone can be voicemail;
this automatic design does not verify a human is listening.

The patient stays in the same room throughout. After billing connects, each human's
audio goes to a separate Scribe realtime transcription connection. Both must report
ready before the hosted advocate starts. The controller forwards role-labeled text,
never mixed audio. Connection roles do not authenticate the physical person speaking.
Briefing-phase input is not buffered. Both humans hear each other directly.

Either human hanging up stops the session, cancels pending dialing, clears agent
output and deletes the room to end both phone legs. A finalized patient instruction
to end the call does the same. The model's `finish_call` only withdraws the advocate,
including AI processing. AI/transcription failure or explicit refusal of AI leaves
both humans connected, with an activity event explaining the advocate is unavailable.
There is no continuing without the patient or automatic second attempt.

Phone ringing is bounded to 30 seconds, with 35 seconds for the SIP response and up to
five seconds for the RTC participant event to catch up. Introduction playback is
bounded to prepared audio duration plus two seconds (audio maximum 45 seconds).
`MAX_CALL_SECONDS = 0` disables the worker's total-call deadline and sends zero for
the SIP duration override (LiveKit applies its provider maximum). ElevenLabs rejects
zero and permits 60–7200 seconds; the dedicated conference branch uses 7200 seconds.
Connection, ringing, playback and cleanup timeouts remain bounded. Each cleanup
operation has a ten-second bound. A failed cleanup is logged; check room state before retrying.

## Hosted branch configuration

### Browser or phone participation

The app offers **Join in this browser** and **Call my phone** before drafting the
approval script. The script binds the chosen mode; changing it requires a new
approval. Browser mode needs only the allowlisted billing phone, not a patient
phone number. The winning start request receives a two-minute, room-scoped token
for identity `patient`, with microphone publishing and audio subscription only.
Retries never issue a second token for the same action.

The browser gets microphone permission before approval/start, unlocks playback,
then joins the room and publishes its microphone. The worker waits up to 60 seconds
for that audio track before playing the introduction and dialing billing. It never
dials a patient phone in browser mode. Closing/leaving the call disconnects the
patient and ends the session. Keep the tab open; there is no resume-after-refresh.
Browser microphone access requires HTTPS or localhost. Muting is supported; camera
and data publishing are not granted. Neither connection mode establishes identity
or spoken approval.

Server polling expires abandoned setup after two minutes only while no patient has
joined. It no longer ends connected calls at fifteen minutes.

The optional `e2e/browser-call.spec.ts` checks a real LiveKit room with synthetic
browser microphones and two remote audio peers. It mocks the app call endpoints and
never dispatches a worker, dials SIP, or contacts ElevenLabs. Build its peer fixture
with `bun build e2e/fixtures/browser-peer.ts --target browser --outfile tmp/browser-peer.js`
from the repo root; enable `BROWSER_RTC_TEST=1` and use a Chromium browser with fake
media devices and fake permission UI. Regular UI tests cover both join choices and
microphone denial without calling any provider.

Use the dedicated patient conference branch with PCM 16000 input/output and three
parameterless client tools: `finish_call`, `pause_advocate`, and `resume_advocate`.
The single advocate prompt follows the conversation without workflow stages. Enable
`agent_response_complete` and `agent_tool_response` in `conversation.client_events`. Preflight
rejects extra tools, unsupported built-in tools, old invitation instructions and remaining workflow
stages before any phone call. The [configuration script](../../packages/api/scripts/configure-demo-advocate.md)
backs up and updates only the conference branch, preserving the voice/model, audio
settings and background voice filter. It refuses to run while a room is active.

The native `skip_turn` tool allows a temporary wait when staff is looking up the
account or thinking. It does not permanently silence the advocate: staff can continue
normally when ready. The hosted branch uses patient turn-taking, a 20-second silence
window, and no speculative response generation. Silence does not end the call.

Audio plays as it arrives. Partial transcripts never cancel a reply; finalized human
turns wait until the current reply finishes playing, then reach the model together in
speaker order. The model yields through verification and patient decisions and resumes
when billing continues. There is no keyword gate or one-answer limit. A continuous
silent PCM stream advances the hosted playback clock while real speech travels through
role-labeled text. A 45-second stall with no audio progress withdraws only the AI;
it is not a total-call limit. Microphone track loss pauses the advocate.

Two realtime Scribe streams use provider credits; hosted mixed-audio ASR is not used. Pausing speech alone
does not stop transcription or AI processing; explicit AI/recording refusal withdraws
the AI. Never infer approval from silence, unclear speech, phone presence or departure,
or make payment or settlement commitments. Identity verification belongs to the humans;
the advocate must not correct a patient against the fictional profile.

The approval includes the top three concerns with service dates, codes, units, original
charges and evidence. Only cases loaded from a known synthetic sample get the fictional
identity Alex Morgan, born April 12, 1990. Uploaded bills do not get that identity.

The fixed introduction uses the branch voice through ElevenLabs TTS. Existing
`ELEVENLABS_INVITATION_VOICE_ID` remains an optional account-permitted voice override
for this fixed introduction only. It does not change the hosted advocate voice.
Speech generation uses normal provider credits; the worker does not select another
voice automatically or retry a failed call.

## Diagnostics and checks

Logs include opaque action/room IDs, flow version, phase, stage, elapsed time,
participant role and safe disconnect enum. They distinguish each dial claim, phone
answer, introduction playback, hosted readiness, terminal reason and cleanup.
Speaker activity logs record transitions; transcript/response logs record receipt
without text. Audio logs record the first output after a transcript or output-gate
change. Hosted closure logs contain only a numeric WebSocket code. Preflight reports
the background voice filter setting. Errors contain only stage, HTTP status, exception
type and an allowlisted Twirp code. No phone numbers, speech, audio, credentials, signed
URLs or provider error bodies belong in logs. Background failures name the originating
coroutine and record the available numeric WebSocket close code before room cleanup.
Input stalls and recoveries are logged per participant. A stalled input supplies paced
silence while retaining its pending audio read. Source closure requires a new LiveKit
track. Logs include transcription readiness, each gate decision and its trusted role,
requested/completed answers, rejected resume attempts, and AI withdrawal without speech.

```powershell
uv run --env-file ../../apps/web/.env betterbill-voice dev 2>&1 | Tee-Object ../../tmp/voice-controller.log
uv run python -m unittest discover -s tests -v
uv run ruff check .
uv run python -m compileall -q src
```

The ignored repository `tmp` folder must exist for local log capture. Tests use fake
phone/network boundaries for automatic ordering, failed/no-answer setup, ignored
keypad, departure during briefing/dialing, both human audio inputs, finish/cleanup,
version binding, hosted preflight and privacy-safe diagnostics. No test places a call.

A live rehearsal still needs two consenting, distinct, allowlisted team-held phones
and a newly approved synthetic script. Check full introduction, automatic billing
connection, both humans hearing each other/advocate, direct spoken approval, foreground
and quiet voices, background chatter, overlap, voicemail, and either-person hangup.
The background filter cannot guarantee intended-speaker detection.

For the small role-play demo: allow recording, request the patient for verification,
then return to billing. The advocate should continue without a special phrase. Discuss
an account hold, an itemized bill, and the records process. Ask an ordinary follow-up,
propose terms requiring the patient's decision, and confirm a next step
and reference number, and agree on a recap before ending. Check the stall/recovery and
handoff logs afterward. Do not treat this rehearsal as a real hospital authorization.

## Cloud deployment later

The Dockerfile is ready for LiveKit Cloud. First configure a reachable HTTPS BetterBill
API; a cloud worker cannot reach this laptop's localhost. Run `lk agent create` from
this folder and supply the required secrets through LiveKit. Keep the registered agent
name `betterbill-patient-first`. The build uses `uv.lock`; local environments/secrets are
excluded. A durable bootstrap claim prevents duplicate workers from redialing.

Provider references: [ElevenLabs WebSocket](https://elevenlabs.io/docs/eleven-agents/api-reference/eleven-agents/websocket),
[signed URLs](https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-signed-url),
[LiveKit participants](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/).
