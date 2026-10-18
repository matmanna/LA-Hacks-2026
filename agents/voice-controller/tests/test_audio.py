import asyncio
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


class AudioInputTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.stream = PacketStream()
        self.controller = CallController(Mock(), Mock(), Mock(), "act_audio", "bb-act_audio")
        self.controller.accepting_input = True
        self.controller.mixer = rtc.AudioMixer(16000, 1, blocksize=320, capacity=50)
        self.track = SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO, sid="audio_track")
        with patch("betterbill_voice.controller.rtc.AudioStream", return_value=self.stream):
            self.controller.on_track(self.track, None, SimpleNamespace(identity="patient"))

    async def asyncTearDown(self):
        self.controller.on_track_removed(self.track, None, None)
        await asyncio.gather(*self.controller.tasks)
        await self.controller.mixer.aclose()

    async def heard(self, sample):
        async def wait_for_sample():
            async for frame in self.controller.mixer:
                if frame.data[0] == sample:
                    return True
        try:
            return await asyncio.wait_for(wait_for_sample(), 0.5)
        except TimeoutError:
            return False

    async def test_audio_resumes_after_packet_gap_longer_than_mixer_timeout(self):
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

    async def test_immediate_room_shutdown_closes_a_just_removed_track(self):
        self.controller.authorized = True
        self.controller.status = AsyncMock()
        self.controller.lk.room.delete_room = AsyncMock()
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
