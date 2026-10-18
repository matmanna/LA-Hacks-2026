import asyncio
import base64
import json
import math
import os
from uuid import uuid4

import aiohttp

# Background noise: quiet audio (TV, other voices in the room) reaches Scribe as
# silence, and Scribe's own voice detection is stricter than its default.
# ponytail: one fixed level per call; tune these per phone and room.
GATE_DBFS = float(os.environ.get("BB_NOISE_GATE_DBFS", "-40"))
GATE_HOLD_FRAMES = 15  # 300 ms of 20 ms frames, so word endings are not clipped
VAD_THRESHOLD = os.environ.get("BB_STT_VAD_THRESHOLD", "0.6")
MIN_SPEECH_MS = os.environ.get("BB_STT_MIN_SPEECH_MS", "300")
SILENT_FRAME = bytes(640)


def frame_dbfs(pcm: bytes) -> float:
    samples = memoryview(pcm).cast("h")
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) if len(samples) else 0
    return 20 * math.log10(rms / 32768) if rms else -120.0


class NoiseGate:
    def __init__(self, threshold_dbfs: float = GATE_DBFS, hold_frames: int = GATE_HOLD_FRAMES):
        self.threshold, self.hold, self.open_for = threshold_dbfs, hold_frames, 0

    def __call__(self, pcm: bytes) -> bytes:
        if frame_dbfs(pcm) >= self.threshold:
            self.open_for = self.hold
        elif self.open_for:
            self.open_for -= 1
        else:
            return SILENT_FRAME[: len(pcm)]
        return pcm


async def transcribe_participant(http, api_key, role, frames, on_transcript, *, on_ready=None):
    """Transcribe one trusted participant track; the caller retains ownership of frames."""
    if role not in {"patient", "hospital"}:
        raise ValueError("Unknown participant role")
    if not api_key:
        raise ValueError("Transcription API key is required")
    try:
        async with http.ws_connect(
            "wss://api.elevenlabs.io/v1/speech-to-text/realtime",
            headers={"xi-api-key": api_key},
            params={
                "model_id": "scribe_v2_realtime",
                "audio_format": "pcm_16000",
                "commit_strategy": "vad",
                "language_code": "en",
                "filter_background_audio": "true",
                "vad_threshold": VAD_THRESHOLD,
                "min_speech_duration_ms": MIN_SPEECH_MS,
            },
            heartbeat=20,
            receive_timeout=None,
            max_msg_size=2**20,
        ) as ws:
            ready = asyncio.Event()

            async def send_audio():
                async with asyncio.timeout(10):
                    await ready.wait()
                chunk = bytearray()
                gate = NoiseGate()
                async for frame in frames:
                    if (
                        frame.sample_rate != 16000
                        or frame.num_channels != 1
                        or frame.samples_per_channel != 320
                        or len(frame.data) * frame.data.itemsize != 640
                    ):
                        raise ValueError("Invalid participant audio format")
                    chunk.extend(gate(bytes(frame.data)))
                    if len(chunk) == 3200:
                        await ws.send_json(
                            {
                                "message_type": "input_audio_chunk",
                                "audio_base_64": base64.b64encode(chunk).decode("ascii"),
                                "sample_rate": 16000,
                                "commit": False,
                            }
                        )
                        chunk.clear()
                raise RuntimeError("Participant audio input ended")

            async def receive_transcripts():
                prefix, segment = uuid4().hex, 0
                last_partial, last_final = "", None
                async for message in ws:
                    if message.type != aiohttp.WSMsgType.TEXT:
                        raise RuntimeError("Unexpected transcription frame")
                    event = json.loads(message.data)
                    kind = event["message_type"]
                    if kind == "session_started":
                        config = event["config"]
                        if (
                            ready.is_set()
                            or config["sample_rate"] != 16000
                            or config["audio_format"] != "pcm_16000"
                        ):
                            raise ValueError("Unexpected transcription session format")
                        if on_ready is not None:
                            await on_ready(role)
                        ready.set()
                    elif kind == "warning":
                        continue
                    elif kind in {"partial_transcript", "committed_transcript"}:
                        if not ready.is_set() or not isinstance(event["text"], str):
                            raise ValueError("Invalid participant transcript")
                        text = event["text"].strip()
                        final = kind == "committed_transcript"
                        if not text or (not final and text == last_partial):
                            continue
                        # shortcut: until Scribe adds IDs, repeat finals need a new partial.
                        if final and not last_partial and text == last_final:
                            continue
                        await on_transcript(
                            role, text, final=final, utterance_id=f"{prefix}:{segment}"
                        )
                        if final:
                            segment += 1
                            last_final, last_partial = text, ""
                        else:
                            last_partial = text
                    else:
                        raise RuntimeError("Transcription provider rejected session")
                raise RuntimeError("Transcription connection closed")

            tasks = [asyncio.create_task(send_audio()), asyncio.create_task(receive_transcripts())]
            try:
                done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                for task in done:
                    await task
            finally:
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
    except Exception:
        # Provider errors and connection URLs may include private audio, speech, or credentials.
        raise RuntimeError("Participant transcription unavailable") from None
