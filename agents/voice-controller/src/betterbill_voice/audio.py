import asyncio
from collections.abc import Callable

from livekit import rtc


class ContinuousAudioInput:
    """Keep one microphone read alive across mixer timeouts and packet gaps."""

    def __init__(self, stream, on_event: Callable[[str], None]):
        self.stream = stream
        self.on_event = on_event
        self.pending: asyncio.Task | None = None
        self.closed = False
        self.ended = False
        self.stalled = False
        self.next_frame = self.last_packet = asyncio.get_running_loop().time()
        self.silence = rtc.AudioFrame(bytes(640), 16000, 1, 320)

    def __aiter__(self):
        return self

    async def __anext__(self) -> rtc.AudioFrame:
        if self.closed or self.ended:
            raise StopAsyncIteration
        if self.pending is None:
            self.pending = asyncio.create_task(anext(self.stream))
        loop = asyncio.get_running_loop()
        self.next_frame = max(self.next_frame + 0.02, loop.time())
        # The mixer may cancel this wait; it must never cancel the microphone read.
        await asyncio.sleep(max(0, self.next_frame - loop.time()))
        if self.closed:
            raise StopAsyncIteration
        if self.pending.done():
            try:
                frame = self.pending.result().frame
            except StopAsyncIteration:
                self.ended = True
                self.on_event("audio_input_ended")
                raise
            except Exception:
                self.ended = True
                self.on_event("audio_input_failed")
                raise StopAsyncIteration from None
            finally:
                self.pending = None
            self.last_packet = loop.time()
            if self.stalled:
                self.stalled = False
                self.on_event("audio_input_recovered")
            return frame
        if not self.stalled and loop.time() - self.last_packet >= 0.1:
            self.stalled = True
            self.on_event("audio_input_stalled")
        return self.silence

    async def aclose(self) -> None:
        if self.closed:
            return
        self.closed = True
        try:
            if self.pending is not None:
                self.pending.cancel()
                await asyncio.gather(self.pending, return_exceptions=True)
        finally:
            self.pending = None
            await self.stream.aclose()
