import asyncio
import base64
import json
import logging
import os
import re
import time
from urllib.parse import urlparse

import aiohttp
from google.protobuf.duration_pb2 import Duration
from livekit import api, rtc
from livekit.agents import AutoSubscribe

from .audio import ContinuousAudioInput
from .protocol import FLOW_VERSION, BridgeState, pcm_event, tool_result

log = logging.getLogger(__name__)
RATE = 16000
MAX_CALL_SECONDS = 0  # Zero disables our deadline; provider limits still apply.
ELEVEN_API = "https://api.elevenlabs.io/v1"
PHONE_DIAL_SECONDS = 35
TWIRP_CODES = {
    "cancelled",
    "unknown",
    "invalid_argument",
    "deadline_exceeded",
    "not_found",
    "already_exists",
    "permission_denied",
    "unauthenticated",
    "resource_exhausted",
    "failed_precondition",
    "aborted",
    "out_of_range",
    "unimplemented",
    "internal",
    "unavailable",
    "data_loss",
}


class VoiceHttpError(RuntimeError):
    def __init__(self, stage: str, status: int):
        super().__init__("Voice provider request rejected")
        self.stage, self.status = stage, status


def log_failure(stage: str, error: Exception) -> None:
    # Exception messages and response bodies may contain credentials or patient data.
    stage = error.stage if isinstance(error, VoiceHttpError) else stage
    status = getattr(error, "status", None)
    status = status if isinstance(status, int) else None
    twirp_code = None
    if isinstance(error, api.TwirpError):
        twirp_code = error.code if error.code in TWIRP_CODES else "unknown"
    log.error(
        "Voice operation failed stage=%s status=%s error=%s twirp_code=%s",
        stage,
        status,
        type(error).__name__,
        twirp_code,
        extra={
            "voice_stage": stage,
            "http_status": status,
            "error_type": type(error).__name__,
            "twirp_code": twirp_code,
        },
    )


class CallController:
    def __init__(self, ctx, http, livekit, action_id: str, room_name: str):
        self.ctx, self.http, self.lk = ctx, http, livekit
        self.action_id, self.room_name = action_id, room_name
        self.state = BridgeState()
        self.done = asyncio.Event()
        self.ready = asyncio.Event()
        self.arrivals = {identity: asyncio.Event() for identity in ("patient", "hospital")}
        self.tasks: set[asyncio.Task] = set()
        self.tool_calls: set[str] = set()
        self.audio_queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self.generation = 0
        self.interrupted_before = -1
        self.last_audio_event = -1
        self.resume_invited = False
        self.stop_requested = False
        self.ws = self.source = self.mixer = None
        self.streams = {}
        self.config = {}
        self.disclosure_pcm = b""
        self.accepting_input = False
        self.authorized = False
        self.terminal_status = "failed"
        self.terminal_reason = "error"
        self.active_speaker_roles = set()
        self.last_audio_diagnostic = None
        self.closed = False
        self.close_lock = asyncio.Lock()
        self.stage = "bootstrap"
        self.started_at = time.monotonic()

    def lifecycle(
        self,
        event: str,
        *,
        role=None,
        reason=None,
        status=None,
        event_id=None,
        close_code=None,
        background_filter=None,
    ) -> None:
        fields = {
            "voice_event": event,
            "voice_action_id": self.action_id,
            "voice_room_name": self.room_name,
            "voice_phase": self.state.phase,
            "voice_elapsed_ms": round((time.monotonic() - self.started_at) * 1000),
            "voice_stage": self.stage,
            "voice_flow_version": FLOW_VERSION,
        }
        if role is not None:
            fields["participant_role"] = role if role in {"hospital", "patient"} else "other"
        if reason is not None:
            fields["voice_reason"] = reason
        if status is not None:
            fields["voice_status"] = status
        if type(event_id) is int:
            fields["hosted_event_id"] = event_id
        if type(close_code) is int:
            fields["ws_close_code"] = close_code
        if type(background_filter) is bool:
            fields["background_voice_filter_enabled"] = background_filter
        log.info("Voice lifecycle %s", event, extra=fields)

    @staticmethod
    def disconnect_reason(value) -> str:
        if isinstance(value, int):
            try:
                return rtc.DisconnectReason.Name(value)
            except ValueError:
                pass
        return "UNKNOWN"

    async def post(self, event: str, **extra) -> dict:
        origin = os.environ["BETTERBILL_VOICE_API_URL"].rstrip("/")
        parsed = urlparse(origin)
        if parsed.scheme != "https" and not (
            parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        ):
            raise ValueError("Voice API requires HTTPS except on localhost")
        async with self.http.post(
            f"{origin}/api/voice",
            allow_redirects=False,
            headers={"x-bb-voice-key": os.environ["BB_VOICE_WORKER_KEY"]},
            json={
                "event": event,
                "actionId": self.action_id,
                "roomName": self.room_name,
                "flowVersion": FLOW_VERSION,
                **extra,
            },
        ) as response:
            if response.status != 200:
                raise VoiceHttpError(f"betterbill_{event}", response.status)
            return await response.json()

    async def status(self, value: str, **extra) -> None:
        await self.post("status", status=value, **extra)
        self.lifecycle("status_saved", status=value)

    def spawn(self, awaitable) -> asyncio.Task:
        task = asyncio.create_task(awaitable, name=awaitable.__qualname__)
        self.tasks.add(task)

        def finished(t):
            self.tasks.discard(t)
            if not t.cancelled() and t.exception() is not None:
                log_failure(t.get_name(), t.exception())
                self.lifecycle(
                    "background_operation_failed",
                    reason=t.get_name(),
                    close_code=getattr(self.ws, "close_code", None),
                )
                self.stop(
                    "failed",
                    reason="timeout" if isinstance(t.exception(), TimeoutError) else "error",
                )

        task.add_done_callback(finished)
        return task

    def clear_audio(self) -> None:
        self.generation += 1
        if self.source:
            self.source.clear_queue()
        while not self.audio_queue.empty():
            self.audio_queue.get_nowait()
            self.audio_queue.task_done()

    def stop(self, status: str, *, reason="error") -> None:
        if self.done.is_set():
            return
        self.terminal_status, self.terminal_reason = status, reason
        self.lifecycle("session_stopping", status=status, reason=reason)
        self.state.end()
        self.accepting_input = False
        self.clear_audio()
        self.done.set()

    def on_participant_left(self, participant) -> None:
        self.lifecycle(
            "participant_disconnected",
            role=participant.identity,
            reason=self.disconnect_reason(getattr(participant, "disconnect_reason", None)),
        )
        if participant.identity in {"hospital", "patient"}:
            self.stop(
                "failed",
                reason=("patient_left" if participant.identity == "patient" else "billing_left"),
            )

    def on_participant_joined(self, participant) -> None:
        self.lifecycle("participant_connected", role=participant.identity)
        if participant.identity in self.arrivals:
            self.arrivals[participant.identity].set()

    def on_main_disconnected(self, reason=None) -> None:
        self.lifecycle("main_room_disconnected", reason=self.disconnect_reason(reason))
        self.stop("failed", reason="error")

    def on_speakers(self, speakers) -> None:
        roles = {p.identity for p in speakers if p.identity in {"hospital", "patient"}}
        for role in sorted(roles ^ self.active_speaker_roles):
            self.lifecycle(
                "speaker_activity_changed",
                role=role,
                reason="speech_started" if role in roles else "speech_stopped",
            )
        self.active_speaker_roles = roles

    def on_track(self, track, publication, participant) -> None:
        if (
            not self.accepting_input
            or track.kind != rtc.TrackKind.KIND_AUDIO
            or participant.identity not in {"hospital", "patient"}
            or track.sid in self.streams
        ):
            return
        stream = rtc.AudioStream(
            track, sample_rate=RATE, num_channels=1, frame_size_ms=20, capacity=50
        )

        iterator = ContinuousAudioInput(
            stream, lambda event: self.lifecycle(event, role=participant.identity)
        )
        self.streams[track.sid] = iterator
        self.mixer.add_stream(iterator)

    def on_track_removed(self, track, _publication, _participant) -> None:
        stream = self.streams.get(track.sid)
        if stream:
            self.mixer.remove_stream(stream)

            async def close_stream():
                await stream.aclose()
                if self.streams.get(track.sid) is stream:
                    self.streams.pop(track.sid)

            # Retain ownership if room shutdown cancels cleanup before it starts.
            self.spawn(close_stream())

    async def preflight(self) -> None:
        headers = {"xi-api-key": os.environ["ELEVENLABS_API_KEY"]}
        self.stage = "elevenlabs_agent_config"
        async with self.http.get(
            f"{ELEVEN_API}/convai/agents/{self.config['agentId']}",
            params={"branch_id": self.config["branchId"]},
            headers=headers,
        ) as response:
            if response.status != 200:
                raise VoiceHttpError(self.stage, response.status)
            agent = await response.json()
        config = agent["conversation_config"]
        self.lifecycle(
            "hosted_speech_config",
            background_filter=config.get("vad", {}).get("background_voice_detection"),
        )
        if (
            config["asr"]["user_input_audio_format"] != "pcm_16000"
            or config["tts"]["agent_output_audio_format"] != "pcm_16000"
        ):
            raise ValueError("Conference branch must use PCM 16000 input and output")
        self.validate_hosted_agent(agent)
        voice = os.environ.get("ELEVENLABS_INVITATION_VOICE_ID") or config["tts"]["voice_id"]
        self.stage = "elevenlabs_introduction_tts"
        async with self.http.post(
            f"{ELEVEN_API}/text-to-speech/{voice}",
            params={"output_format": "pcm_16000"},
            headers=headers,
            json={"text": self.config["introductionText"], "model_id": "eleven_flash_v2_5"},
        ) as response:
            if response.status != 200:
                raise VoiceHttpError(self.stage, response.status)
            self.disclosure_pcm = await response.read()
        if not self.disclosure_pcm or len(self.disclosure_pcm) % 2:
            raise ValueError("Invalid introduction PCM")
        if len(self.disclosure_pcm) > RATE * 2 * 45:
            raise ValueError("Patient introduction exceeds playback limit")

    async def signed_url(self) -> str:
        headers = {"xi-api-key": os.environ["ELEVENLABS_API_KEY"]}
        params = {"agent_id": self.config["agentId"], "branch_id": self.config["branchId"]}
        self.stage = "elevenlabs_signed_url"
        async with self.http.get(
            f"{ELEVEN_API}/convai/conversation/get-signed-url", params=params, headers=headers
        ) as response:
            if response.status != 200:
                raise VoiceHttpError(self.stage, response.status)
            url = (await response.json())["signed_url"]
        if urlparse(url).scheme != "wss" or urlparse(url).hostname != "api.elevenlabs.io":
            raise ValueError("Unexpected hosted conversation endpoint")
        return url

    @staticmethod
    def validate_hosted_agent(agent: dict) -> None:
        prompt = agent["conversation_config"]["agent"]["prompt"]
        tools = prompt.get("tools", [])
        client_tools = [tool for tool in tools if tool.get("type") == "client"]
        system_tools = [tool for tool in tools if tool.get("type") != "client"]
        expected = {"finish_call", "pause_advocate", "resume_advocate"}
        if (
            len(client_tools) != len(expected)
            or len(prompt.get("tool_ids", [])) != len(expected)
            or {tool.get("name") for tool in client_tools} != expected
        ):
            raise ValueError("Conference branch requires finish, pause and resume tools")
        for tool in client_tools:
            if (
                tool.get("type") != "client"
                or tool.get("parameters", {}).get("type") != "object"
                or tool.get("parameters", {}).get("properties") != {}
                or tool.get("parameters", {}).get("required") not in (None, [])
                or not tool.get("expects_response")
            ):
                raise ValueError("Conference tools must be parameterless client tools")
        workflow = agent.get("workflow") or {}
        nodes = list(workflow.get("nodes", {}).values())
        # ElevenLabs requires an inert start node even without conversational stages.
        if (
            len(nodes) > 1
            or any(node.get("type") != "start" or node.get("edge_order") for node in nodes)
            or workflow.get("edges")
            or workflow.get("subgraphs")
        ):
            raise ValueError("Use one advocate prompt without a staged workflow")
        def is_skip_turn(tool):
            return (
                isinstance(tool, dict)
                and tool.get("type") == "system"
                and tool.get("name") == "skip_turn"
                and tool.get("params", {}).get("system_tool_type") == "skip_turn"
            )

        builtins = {
            name: tool for name, tool in prompt.get("built_in_tools", {}).items()
            if tool is not None
        }
        if (
            any(name != "skip_turn" or not is_skip_turn(tool) for name, tool in builtins.items())
            or len(system_tools) > 1
            or any(not is_skip_turn(tool) or "skip_turn" not in builtins for tool in system_tools)
        ):
            raise ValueError("Only the native skip-turn built-in is supported")
        texts = [prompt.get("prompt", ""), *(tool.get("description", "") for tool in tools)]
        if any("invite_patient" in text or "end_call" in text for text in texts):
            raise ValueError("Stale hosted invitation instructions")

    def require_present(self, *identities: str) -> None:
        if self.done.is_set():
            raise asyncio.CancelledError
        participants = self.ctx.room.remote_participants.values()
        present = {participant.identity for participant in participants}
        for identity in identities:
            if identity not in present:
                self.stop(
                    "failed", reason=("patient_left" if identity == "patient" else "billing_left")
                )
                raise asyncio.CancelledError

    async def dial(self, leg: str) -> None:
        identity = "patient" if leg == "patient" else "hospital"
        self.stage = f"{leg}_dial_claim"
        if leg == "billing":
            self.require_present("patient")
        claim = await self.post("dial", leg=leg)
        if claim.get("allowed") is not True:
            self.lifecycle("phone_dial_claim_denied", role=identity)
            raise PermissionError("Phone leg not authorized")
        self.lifecycle("phone_dial_claimed", role=identity)
        number = claim.get("phoneNumber")
        if not isinstance(number, str) or not re.fullmatch(r"\+[1-9]\d{7,14}", number):
            raise ValueError("Invalid approved destination")
        if leg == "billing":
            self.require_present("patient")
        elif self.done.is_set():
            raise asyncio.CancelledError
        self.stage = f"{leg}_dial"
        self.state.phase = self.stage
        self.lifecycle("phone_dial_started", role=identity)
        async with asyncio.timeout(PHONE_DIAL_SECONDS):
            await self.lk.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    sip_trunk_id=self.config["photonTrunkId"],
                    sip_call_to=number,
                    room_name=self.room_name,
                    participant_identity=identity,
                    participant_name=identity.title(),
                    hide_phone_number=True,
                    wait_until_answered=True,
                    ringing_timeout=Duration(seconds=30),
                    max_call_duration=Duration(seconds=MAX_CALL_SECONDS),
                ),
                timeout=PHONE_DIAL_SECONDS,
            )
        self.lifecycle("phone_answered", role=identity)
        # The SIP response and RTC participant event can arrive in either order.
        if not any(p.identity == identity for p in self.ctx.room.remote_participants.values()):
            await asyncio.wait_for(self.arrivals[identity].wait(), 5)
        self.require_present(identity, *(["patient"] if leg == "billing" else []))
        await self.status("patient_joined" if leg == "patient" else "billing_connected")

    async def start_session(self) -> None:
        if self.config.get("patientConnection", "phone") == "browser":
            self.stage = self.state.phase = "patient_browser_join"
            self.lifecycle("browser_patient_waiting")
            # Publishing a microphone is required before briefing or dialing billing.
            async with asyncio.timeout(60):
                while not self.done.is_set():
                    patient = next(
                        (
                            p
                            for p in self.ctx.room.remote_participants.values()
                            if p.identity == "patient"
                        ),
                        None,
                    )
                    if patient and any(
                        p.track and p.track.kind == rtc.TrackKind.KIND_AUDIO
                        for p in patient.track_publications.values()
                    ):
                        break
                    await asyncio.sleep(0.1)
            self.require_present("patient")
            await self.status("patient_joined")
            self.lifecycle("browser_patient_microphone_ready", role="patient")
        else:
            await self.dial("patient")
        self.require_present("patient")
        self.stage = self.state.phase = "patient_introduction"
        self.lifecycle("patient_introduction_started", role="patient")
        async with asyncio.timeout(len(self.disclosure_pcm) / (RATE * 2) + 2):
            for offset in range(0, len(self.disclosure_pcm), 640):
                self.require_present("patient")
                chunk = self.disclosure_pcm[offset : offset + 640]
                await self.source.capture_frame(rtc.AudioFrame(chunk, RATE, 1, len(chunk) // 2))
            await self.source.wait_for_playout()
        self.require_present("patient")
        self.lifecycle("patient_introduction_completed", role="patient")
        await self.status("patient_briefed")
        await self.dial("billing")
        self.require_present("patient", "hospital")
        await self.start_conversation()

    async def run(self) -> None:
        # A rejected duplicate bootstrap must not delete the first worker's active room.
        self.config = await self.post("bootstrap")
        self.authorized = True
        self.lifecycle("session_bootstrapped")
        try:
            async with asyncio.timeout(MAX_CALL_SECONDS or None):
                self.stage = "bootstrap_validation"
                self.validate_bootstrap()
                await self.preflight()
                self.stage = "rtc_audio_init"
                self.source = rtc.AudioSource(RATE, 1, queue_size_ms=100)
                self.mixer = rtc.AudioMixer(RATE, 1, blocksize=320, capacity=50)
                room = self.ctx.room
                room.on("participant_disconnected", self.on_participant_left)
                room.on("participant_connected", self.on_participant_joined)
                room.on("track_subscribed", self.on_track)
                room.on("track_unsubscribed", self.on_track_removed)
                room.on("active_speakers_changed", self.on_speakers)
                room.on("disconnected", self.on_main_disconnected)
                self.stage = "rtc_connect"
                await asyncio.wait_for(
                    self.ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY), 30
                )
                self.lifecycle("main_room_connected")
                self.stage = "rtc_publish"
                track = rtc.LocalAudioTrack.create_audio_track("betterbill-assistant", self.source)
                await room.local_participant.publish_track(
                    track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
                )
                self.spawn(self.start_session())
                await self.done.wait()
        except asyncio.CancelledError:
            self.stop("failed", reason="error")
            self.lifecycle("session_cancelled")
            raise
        except Exception as error:
            log_failure(self.stage, error)
            self.stop("failed", reason="timeout" if isinstance(error, TimeoutError) else "error")
        finally:
            await self.close()

    def validate_bootstrap(self) -> None:
        if self.config.get("patientConnection", "phone") not in {"phone", "browser"}:
            raise ValueError("Invalid patient connection mode")
        if (
            self.config.get("actionId") != self.action_id
            or self.config.get("roomName") != self.room_name
            or self.ctx.job.room.name != self.room_name
            or self.config.get("flowVersion") != FLOW_VERSION
        ):
            raise ValueError("Bootstrap flow or room binding mismatch")
        for key in ("agentId", "branchId", "photonTrunkId", "introductionText"):
            if not isinstance(self.config.get(key), str) or not self.config[key]:
                raise ValueError("Incomplete approved bootstrap")
        if not isinstance(self.config.get("vars"), dict):
            raise ValueError("Invalid approved dynamic variables")

    async def start_conversation(self) -> None:
        signed_url = await self.signed_url()
        self.require_present("patient", "hospital")
        self.stage = "hosted_connect"
        async with self.http.ws_connect(signed_url, max_msg_size=2**20) as ws:
            self.ws = ws
            self.require_present("patient", "hospital")
            await ws.send_json(
                {
                    "type": "conversation_initiation_client_data",
                    "dynamic_variables": self.config["vars"],
                }
            )
            # Construct streams now so the private introduction is never buffered for ASR.
            self.accepting_input = True
            for participant in self.ctx.room.remote_participants.values():
                for publication in participant.track_publications.values():
                    if publication.track:
                        self.on_track(publication.track, publication, participant)
            self.spawn(self.send_audio())
            self.spawn(self.play_audio())
            async for message in ws:
                if message.type == aiohttp.WSMsgType.TEXT:
                    await self.handle_event(json.loads(message.data))
                elif message.type == aiohttp.WSMsgType.ERROR:
                    self.lifecycle("hosted_conversation_closed", close_code=ws.close_code)
                    raise RuntimeError("Hosted conversation connection failed")
            self.lifecycle("hosted_conversation_closed", close_code=ws.close_code)
            if not self.done.is_set():
                raise RuntimeError("Hosted conversation closed before billing call ended")

    async def handle_event(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "conversation_initiation_metadata":
            metadata = event["conversation_initiation_metadata_event"]
            if any(
                metadata.get(key) != "pcm_16000"
                for key in ("agent_output_audio_format", "user_input_audio_format")
            ):
                raise ValueError("Hosted session negotiated an unsupported audio format")
            await self.status("ready", conversationId=metadata["conversation_id"])
            self.require_present("patient", "hospital")
            self.state.phase = "active"
            self.ready.set()
        elif kind == "ping":
            await self.ws.send_json({"type": "pong", "event_id": event["ping_event"]["event_id"]})
        elif kind == "interruption":
            self.lifecycle(
                "hosted_interruption_received", event_id=event["interruption_event"].get("event_id")
            )
            self.interrupted_before = max(
                self.interrupted_before, event["interruption_event"]["event_id"]
            )
            self.clear_audio()
        elif kind == "audio":
            event_id = event["audio_event"].get("event_id", -1)
            if type(event_id) is int:
                self.last_audio_event = max(self.last_audio_event, event_id)
            reason = "output_available" if self.state.can_output else "session_not_active"
            if self.state.quiet:
                reason = "patient_handoff"
            if self.state.can_output and event_id <= self.interrupted_before:
                reason = "interrupted_audio"
            # Audio event IDs may change per chunk. Log first output after a user
            # transcript, or an output-gate transition, without logging every chunk.
            if reason != self.last_audio_diagnostic:
                self.lifecycle("hosted_audio_turn", event_id=event_id, reason=reason)
                self.last_audio_diagnostic = reason
            pcm = pcm_event(
                event, enabled=self.state.can_output, interrupted_before=self.interrupted_before
            )
            if pcm:
                self.audio_queue.put_nowait((pcm, self.generation))
        elif kind == "client_tool_call":
            self.spawn(self.handle_tool(event["client_tool_call"]))
        elif kind == "agent_response":
            event_id = event.get("agent_response_event", {}).get("event_id")
            self.lifecycle("hosted_agent_response_received", event_id=event_id)
        elif kind == "user_transcript":
            transcription = event.get("user_transcription_event", {})
            event_id = transcription.get("event_id")
            text = transcription.get("user_transcript", "")
            self.resume_invited = self.stop_requested = False
            if isinstance(text, str):
                text = text.lower().replace("\u2019", "'").strip()
                negated = bool(re.search(
                    r"\b(?:no|not|never|don't|doesn't|isn't|can't|won't|shouldn't)\b", text
                ))
                # shortcut: conservative demo cues cannot authenticate mixed speakers;
                # use participant-specific control before real patient authorizations.
                self.resume_invited = self.state.quiet and not negated and bool(
                    re.match(r"(?:(?:hey|okay|ok)[,. ]+)?(?:advocate|better\s?bill)[,. ]+\S", text)
                )
                self.stop_requested = not negated and bool(re.fullmatch(
                    r"(?:please )?(?:(?:end|stop) (?:the |this )?call|hang up)"
                    r"(?: now)?(?: please)?[.!]*", text
                ))
            self.lifecycle("hosted_user_transcript_received", event_id=event_id)
            self.last_audio_diagnostic = None

    async def send_audio(self) -> None:
        await asyncio.wait_for(self.ready.wait(), 20)
        async for frame in self.mixer:
            await self.ws.send_json({"user_audio_chunk": base64.b64encode(frame.data).decode()})

    async def play_audio(self) -> None:
        while True:
            pcm, generation = await self.audio_queue.get()
            try:
                for offset in range(0, len(pcm), 640):
                    if not self.state.can_output or generation != self.generation:
                        break
                    chunk = pcm[offset : offset + 640]
                    await self.source.capture_frame(rtc.AudioFrame(chunk, RATE, 1, len(chunk) // 2))
            finally:
                self.audio_queue.task_done()

    async def handle_tool(self, call: dict) -> None:
        call_id = call.get("tool_call_id")
        if not isinstance(call_id, str) or not call_id:
            raise ValueError("Missing hosted tool call ID")
        if call_id in self.tool_calls:
            return
        self.tool_calls.add(call_id)
        name = call.get("tool_name")
        if call.get("parameters") not in ({}, None):
            await self.ws.send_json(
                tool_result(call_id, "This tool takes no parameters.", error=True)
            )
            return
        if name in {"pause_advocate", "resume_advocate"}:
            if self.state.phase != "active" or self.done.is_set():
                await self.ws.send_json(tool_result(call_id, "The call is not active.", error=True))
                return
            if name == "resume_advocate" and (not self.state.quiet or not self.resume_invited):
                self.lifecycle("advocate_resume_blocked")
                await self.ws.send_json(tool_result(
                    call_id,
                    "Remain quiet until someone explicitly addresses Advocate or BetterBill.",
                    error=True,
                ))
                return
            self.state.quiet = name == "pause_advocate"
            self.resume_invited = False
            self.stop_requested = False
            self.interrupted_before = max(self.interrupted_before, self.last_audio_event)
            self.clear_audio()
            self.lifecycle("advocate_paused" if self.state.quiet else "advocate_resumed")
            await self.ws.send_json(tool_result(
                call_id,
                "Your audio is muted. Let the humans talk; do not speak or end the call."
                if self.state.quiet else "You may answer the request. Speak only as the advocate.",
            ))
            return
        if name == "finish_call":
            def allowed():
                return self.state.phase == "active" and (
                    self.state.can_finish or self.stop_requested
                )
            if not allowed():
                self.lifecycle("finish_call_blocked")
                await self.ws.send_json(
                    tool_result(call_id, "Remain connected while the humans speak.", error=True)
                )
                return
            generation = self.generation
            async with asyncio.timeout(45):
                await self.audio_queue.join()
                await self.source.wait_for_playout()
            if allowed() and generation == self.generation:
                await self.ws.send_json(tool_result(call_id, "Ending the billing call."))
                if allowed() and generation == self.generation:
                    self.stop("completed", reason="finished")
            else:
                await self.ws.send_json(
                    tool_result(call_id, "The call changed; remain connected.", error=True)
                )
            return
        await self.ws.send_json(tool_result(call_id, "Unknown tool; do not retry.", error=True))

    async def close(self) -> None:
        async with self.close_lock:
            if self.closed or not self.authorized:
                return
            await self._close()
            self.closed = True

    async def _close(self) -> None:
        if not self.authorized:
            return
        self.lifecycle("session_cleanup_started", status=self.terminal_status)
        self.state.end()
        self.accepting_input = False
        self.done.set()
        self.clear_audio()
        for task in list(self.tasks):
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        operations = [
            self.lk.room.delete_room(api.DeleteRoomRequest(room=self.room_name)),
        ]
        if self.ws:
            operations.append(self.ws.close())
        if self.mixer:
            operations.append(self.mixer.aclose())
        operations.extend(stream.aclose() for stream in self.streams.values())
        if self.source:
            operations.append(self.source.aclose())

        async def bounded(operation):
            async with asyncio.timeout(10):
                return await operation

        results = await asyncio.gather(*(bounded(op) for op in operations), return_exceptions=True)
        if any(
            isinstance(result, Exception)
            and not (isinstance(result, api.TwirpError) and result.code == "not_found")
            for result in results
        ):
            log.error("Voice cleanup failed; check provider room state")
            self.terminal_status, self.terminal_reason = "failed", "error"
        try:
            await self.status(self.terminal_status, reason=self.terminal_reason)
        except Exception:
            self.terminal_status, self.terminal_reason = "failed", "error"
            try:
                await self.status("failed", reason="error")
            except Exception:
                log.error("Voice terminal status could not be saved")
        self.lifecycle("session_cleanup_completed", status=self.terminal_status)
