import asyncio
import base64
import json
import unittest
from contextlib import asynccontextmanager
from types import SimpleNamespace

import aiohttp
from livekit import rtc

from betterbill_voice.transcription import transcribe_participant


class FrameInput:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.cancelled = asyncio.Event()

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            value = await self.queue.get()
        except asyncio.CancelledError:
            self.cancelled.set()
            raise
        if isinstance(value, Exception):
            raise value
        if value is None:
            raise StopAsyncIteration
        return value

    def send(self, value=123):
        self.queue.put_nowait(rtc.AudioFrame(value.to_bytes(2, "little") * 320, 16000, 1, 320))


class Socket:
    def __init__(self):
        self.incoming, self.outgoing = asyncio.Queue(), asyncio.Queue()
        self.closed = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        value = await self.incoming.get()
        if value is None:
            raise StopAsyncIteration
        return SimpleNamespace(type=aiohttp.WSMsgType.TEXT, data=json.dumps(value))

    async def send_json(self, data):
        self.outgoing.put_nowait(data)

    def event(self, **data):
        self.incoming.put_nowait(data)

    def start(self):
        self.event(
            message_type="session_started",
            session_id="session_test",
            config={"sample_rate": 16000, "audio_format": "pcm_16000"},
        )


class Http:
    def __init__(self, socket):
        self.socket = socket
        self.request = None

    @asynccontextmanager
    async def ws_connect(self, url, **kwargs):
        self.request = (url, kwargs)
        try:
            yield self.socket
        finally:
            self.socket.closed = True


class TranscriptionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.frames, self.socket = FrameInput(), Socket()
        self.http, self.transcripts = Http(self.socket), asyncio.Queue()
        self.task = None

    async def asyncTearDown(self):
        if self.task is not None:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)

    async def begin(self, role="patient", *, start=True, on_ready=None):
        async def on_transcript(role, text, *, final, utterance_id):
            await self.transcripts.put((role, text, final, utterance_id))

        self.task = asyncio.create_task(
            transcribe_participant(
                self.http, "private-api-key", role, self.frames, on_transcript, on_ready=on_ready
            )
        )
        if start:
            self.socket.start()
        await asyncio.sleep(0)

    async def result(self):
        return await asyncio.wait_for(self.transcripts.get(), 1)

    async def test_separate_connection_keeps_role_and_segment_across_partial_and_final(self):
        await self.begin("hospital")
        self.socket.event(message_type="partial_transcript", text="Verify the")
        self.socket.event(message_type="committed_transcript", text="Verify the patient.")
        partial, final = await self.result(), await self.result()
        self.assertEqual(partial[:3], ("hospital", "Verify the", False))
        self.assertEqual(final[:3], ("hospital", "Verify the patient.", True))
        self.assertEqual(partial[3], final[3])
        self.socket.event(message_type="partial_transcript", text="One moment")
        next_segment = await self.result()
        self.assertNotEqual(next_segment[3], final[3])

    async def test_pcm_chunks_are_batched_without_including_role_or_credentials(self):
        await self.begin()
        for _ in range(5):
            self.frames.send()
        chunk = await asyncio.wait_for(self.socket.outgoing.get(), 1)
        self.assertEqual(chunk["message_type"], "input_audio_chunk")
        self.assertEqual(chunk["sample_rate"], 16000)
        self.assertFalse(chunk["commit"])
        self.assertEqual(base64.b64decode(chunk["audio_base_64"]), b"{\x00" * 1600)
        self.assertEqual(
            set(chunk), {"message_type", "audio_base_64", "sample_rate", "commit"}
        )
        url, kwargs = self.http.request
        self.assertEqual(url, "wss://api.elevenlabs.io/v1/speech-to-text/realtime")
        self.assertEqual(kwargs["headers"], {"xi-api-key": "private-api-key"})
        self.assertEqual(kwargs["params"]["model_id"], "scribe_v2_realtime")
        self.assertEqual(kwargs["params"]["audio_format"], "pcm_16000")
        self.assertEqual(kwargs["params"]["commit_strategy"], "vad")
        self.assertEqual(kwargs["params"]["language_code"], "en")
        self.assertEqual(kwargs["params"]["filter_background_audio"], "true")

    async def test_empty_or_repeated_events_cannot_duplicate_an_invitation(self):
        await self.begin()
        for text in ("", " ", "Advocate, help", "Advocate, help"):
            self.socket.event(message_type="partial_transcript", text=text)
        self.socket.event(message_type="committed_transcript", text="Advocate, help")
        self.socket.event(message_type="committed_transcript", text="Advocate, help")
        partial, final = await self.result(), await self.result()
        self.assertFalse(partial[2])
        self.assertTrue(final[2])
        with self.assertRaises(TimeoutError):
            await asyncio.wait_for(self.transcripts.get(), 0.02)

    async def test_repeated_request_after_new_partial_is_a_new_utterance(self):
        await self.begin()
        ids = []
        for _ in range(2):
            self.socket.event(message_type="partial_transcript", text="Advocate, help")
            self.socket.event(message_type="committed_transcript", text="Advocate, help")
            await self.result()
            ids.append((await self.result())[3])
        self.assertNotEqual(*ids)

    async def test_audio_waits_for_verified_session_format(self):
        await self.begin(start=False)
        for _ in range(5):
            self.frames.send()
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        self.assertTrue(self.socket.outgoing.empty())
        self.socket.start()
        chunk = await asyncio.wait_for(self.socket.outgoing.get(), 1)
        self.assertEqual(len(base64.b64decode(chunk["audio_base_64"])), 3200)

    async def test_wrong_provider_format_never_sends_audio(self):
        await self.begin(start=False)
        self.socket.event(
            message_type="session_started",
            config={"sample_rate": 8000, "audio_format": "pcm_8000"},
        )
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertTrue(self.socket.outgoing.empty())

    async def test_ready_callback_is_awaited_once_before_forwarding_transcripts(self):
        called, release = [], asyncio.Event()

        async def on_ready(role):
            called.append(role)
            await release.wait()

        await self.begin("hospital", on_ready=on_ready)
        self.socket.event(message_type="partial_transcript", text="Hello")
        await asyncio.sleep(0)
        self.assertEqual(called, ["hospital"])
        self.assertTrue(self.transcripts.empty())
        release.set()
        self.assertEqual((await self.result())[:3], ("hospital", "Hello", False))
        self.socket.start()
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertEqual(called, ["hospital"])

    async def test_ready_callback_is_not_called_for_invalid_session_format(self):
        called = []

        async def on_ready(role):
            called.append(role)

        await self.begin(start=False, on_ready=on_ready)
        self.socket.event(
            message_type="session_started",
            config={"sample_rate": 8000, "audio_format": "pcm_8000"},
        )
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertEqual(called, [])

    async def test_quota_error_closes_socket_and_cancels_microphone_read_safely(self):
        await self.begin()
        self.socket.event(message_type="quota_exceeded", error="private speech and api key")
        with self.assertRaisesRegex(
            RuntimeError, "Participant transcription unavailable"
        ) as caught:
            await asyncio.wait_for(self.task, 1)
        self.assertNotIn("private", str(caught.exception))
        self.assertTrue(self.socket.closed)
        self.assertTrue(self.frames.cancelled.is_set())

    async def test_socket_close_is_a_failure_not_a_silent_loss_of_patient_gate(self):
        await self.begin()
        self.socket.incoming.put_nowait(None)
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertTrue(self.socket.closed)
        self.assertTrue(self.frames.cancelled.is_set())

    async def test_input_failure_does_not_leave_receiver_waiting_forever(self):
        await self.begin()
        self.frames.queue.put_nowait(ValueError("private device state"))
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertTrue(self.socket.closed)

    async def test_input_end_is_reported_as_failure(self):
        await self.begin()
        self.frames.queue.put_nowait(None)
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertTrue(self.socket.closed)

    async def test_cancellation_closes_socket_and_sender(self):
        await self.begin()
        await asyncio.sleep(0)
        self.task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await self.task
        self.assertTrue(self.socket.closed)
        self.assertTrue(self.frames.cancelled.is_set())

    async def test_unknown_role_is_rejected_before_provider_connection(self):
        await self.begin("unknown")
        with self.assertRaisesRegex(ValueError, "Unknown participant role"):
            await self.task
        self.assertIsNone(self.http.request)

    async def test_bad_transcript_shape_fails_closed(self):
        await self.begin()
        self.socket.event(message_type="committed_transcript", text={"private": "value"})
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)

    async def test_wrong_sample_rate_never_sends_audio(self):
        await self.begin()
        self.frames.queue.put_nowait(rtc.AudioFrame(bytes(320), 8000, 1, 160))
        with self.assertRaisesRegex(RuntimeError, "Participant transcription unavailable"):
            await asyncio.wait_for(self.task, 1)
        self.assertTrue(self.socket.outgoing.empty())
