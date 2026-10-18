import asyncio
import os
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from livekit import rtc

from betterbill_voice.audio import ContinuousAudioInput
from betterbill_voice.controller import CallController


class PacketStream:
    def __init__(self):
        self.packets = asyncio.Queue(maxsize=50)
        self.closed = False
        self.closed_event = asyncio.Event()
        self.reads = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        self.reads += 1
        return await self.packets.get()

    def send(self, sample):
        frame = rtc.AudioFrame(sample.to_bytes(2, "little", signed=True) * 320, 16000, 1, 320)
        self.packets.put_nowait(SimpleNamespace(frame=frame))

    async def aclose(self):
        self.closed = True
        self.closed_event.set()


class AudioInputTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.streams = {role: PacketStream() for role in ("patient", "hospital")}
        self.stream = self.streams["patient"]
        self.heard_frames = asyncio.Queue()
        self.started, self.cancelled = [], set()
        self.controller = CallController(Mock(), Mock(), Mock(), "act_audio", "bb-act_audio")
        self.controller.accepting_input = True
        self.controller.authorized = True
        self.controller.status = AsyncMock()
        self.controller.lk.room.delete_room = AsyncMock()
        self.tracks = {
            role: SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO, sid=f"{role}_track")
            for role in self.streams
        }
        self.track = self.tracks["patient"]

        async def transcribe(_http, _key, role, frames, _on_transcript, *, on_ready=None):
            self.started.append(role)
            if on_ready:
                await on_ready(role)
            try:
                async for frame in frames:
                    await self.heard_frames.put((role, frame.data[0]))
            finally:
                self.cancelled.add(role)

        self.enterContext(patch.dict(os.environ, ELEVENLABS_API_KEY="test-key"))
        self.audio_stream = self.enterContext(
            patch(
                "betterbill_voice.controller.rtc.AudioStream",
                side_effect=lambda track, **_kwargs: self.streams[track.sid.removesuffix("_track")],
            )
        )
        self.enterContext(patch("betterbill_voice.controller.transcribe_participant", transcribe))
        self.controller.on_track(self.track, None, SimpleNamespace(identity="patient"))
        await asyncio.sleep(0)

    async def asyncTearDown(self):
        await self.controller.close()

    async def heard(self, sample, role="patient"):
        async def wait_for_sample():
            while True:
                if await self.heard_frames.get() == (role, sample):
                    return True
        try:
            return await asyncio.wait_for(wait_for_sample(), 0.5)
        except TimeoutError:
            return False

    async def test_transcriber_audio_resumes_after_packet_gap(self):
        self.stream.send(123)
        self.assertTrue(await self.heard(123))
        await asyncio.sleep(0.16)
        self.stream.send(456)
        self.assertTrue(await self.heard(456), "A brief packet gap permanently lost human audio")

    async def test_silence_continues_while_microphone_has_no_packets(self):
        self.stream.send(123)
        self.assertTrue(await self.heard(123))
        await asyncio.sleep(0.16)
        self.assertTrue(await self.heard(0), "A stalled microphone must keep sending silence")

    async def test_patient_and_hospital_have_separate_transcriber_audio(self):
        self.controller.on_track(
            self.tracks["hospital"], None, SimpleNamespace(identity="hospital")
        )
        self.stream.send(123)
        self.streams["hospital"].send(456)
        async with asyncio.timeout(1):
            heard = set()
            while len(heard) < 2:
                frame = await self.heard_frames.get()
                if frame[1] != 0:
                    heard.add(frame)
        self.assertEqual(heard, {("patient", 123), ("hospital", 456)})
        self.assertCountEqual(self.started, ["patient", "hospital"])

    async def test_duplicate_track_sid_cannot_create_another_transcriber(self):
        self.controller.on_track(self.track, None, SimpleNamespace(identity="hospital"))
        self.stream.send(123)
        self.assertTrue(await self.heard(123))
        self.assertEqual(self.started, ["patient"])
        self.assertEqual(self.audio_stream.call_count, 1)

    async def test_track_removal_cancels_its_transcriber_and_closes_only_its_source(self):
        self.controller.on_track(
            self.tracks["hospital"], None, SimpleNamespace(identity="hospital")
        )
        await asyncio.sleep(0)
        patient_task = self.controller.stream_tasks[self.track.sid]
        self.controller.on_track_removed(self.track, None, SimpleNamespace(identity="patient"))
        self.assertTrue(self.controller.floor.quiet)
        self.assertFalse(self.controller.transcription_ready["patient"].is_set())
        await asyncio.wait_for(self.stream.closed_event.wait(), 1)
        self.assertTrue(patient_task.cancelled())
        self.assertIn("patient", self.cancelled)
        self.assertFalse(self.streams["hospital"].closed)
        self.streams["hospital"].send(456)
        self.assertTrue(await self.heard(456, "hospital"))

    async def test_immediate_room_shutdown_closes_a_just_removed_track(self):
        self.controller.on_track_removed(self.track, None, None)
        await self.controller.close()
        self.assertTrue(self.stream.closed, "Shutdown cancelled cleanup before it started")


class AudioAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_cancelled_mixer_read_keeps_pending_packet_and_recovers(self):
        stream, events = PacketStream(), []
        adapter = ContinuousAudioInput(stream, events.append)
        try:
            read = asyncio.create_task(anext(adapter))
            await asyncio.sleep(0)
            read.cancel()
            await asyncio.gather(read, return_exceptions=True)
            stream.send(789)
            self.assertEqual((await anext(adapter)).data[0], 789)
            self.assertEqual(stream.reads, 1)
        finally:
            await adapter.aclose()

    async def test_stall_emits_paced_silence_with_one_read_and_one_diagnostic(self):
        stream, events = PacketStream(), []
        adapter = ContinuousAudioInput(stream, events.append)
        pending = None
        try:
            started = asyncio.get_running_loop().time()
            for _ in range(12):
                self.assertEqual(bytes((await anext(adapter)).data), bytes(640))
                pending = adapter.pending
            self.assertGreaterEqual(asyncio.get_running_loop().time() - started, 0.2)
            self.assertEqual(stream.reads, 1)
            self.assertEqual(events, ["audio_input_stalled"])
            stream.send(123)
            self.assertEqual((await anext(adapter)).data[0], 123)
            self.assertEqual(events, ["audio_input_stalled", "audio_input_recovered"])
            await anext(adapter)
            pending = adapter.pending
        finally:
            await adapter.aclose()
        self.assertTrue(stream.closed)
        self.assertTrue(pending.done())
        with self.assertRaises(StopAsyncIteration):
            await anext(adapter)

    async def test_room_shutdown_can_cancel_track_cleanup_without_leaking_source(self):
        cancelling = asyncio.Event()

        class SlowCancellationStream(PacketStream):
            async def __anext__(self):
                try:
                    await asyncio.Future()
                except asyncio.CancelledError:
                    cancelling.set()
                    await asyncio.Future()

        stream = SlowCancellationStream()
        adapter = ContinuousAudioInput(stream, lambda event: None)
        await anext(adapter)
        closing = asyncio.create_task(adapter.aclose())
        await asyncio.wait_for(cancelling.wait(), 1)
        closing.cancel()
        await asyncio.gather(closing, return_exceptions=True)
        self.assertTrue(stream.closed, "Cancelled cleanup left the RTC source open")
