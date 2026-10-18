import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from betterbill_voice.controller import CallController


class HandoffTests(unittest.IsolatedAsyncioTestCase):
    def controller(self):
        c = CallController(SimpleNamespace(), Mock(), Mock(), "action", "room")
        c.state.phase = "active"
        c.source = SimpleNamespace(clear_queue=Mock(), wait_for_playout=AsyncMock())
        c.ws = SimpleNamespace(send_json=AsyncMock())
        return c

    async def tool(self, c, name, call_id=None):
        await c.handle_tool({"tool_name": name, "tool_call_id": call_id or name, "parameters": {}})

    async def say(self, c, text, event_id=10):
        await c.handle_event({
            "type": "user_transcript",
            "user_transcription_event": {"user_transcript": text, "event_id": event_id},
        })

    async def audio(self, c, event_id):
        await c.handle_event({
            "type": "audio",
            "audio_event": {"audio_base_64": "AAA=", "event_id": event_id},
        })

    async def test_handoff_discards_speech_and_blocks_new_audio_and_finish(self):
        c = self.controller()
        await self.audio(c, 1)
        await self.tool(c, "pause_advocate")
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.state.can_output)
        self.assertFalse(c.state.can_finish)
        for text in ("My name is Alex Morgan", "Yes", "Thank you", "Give me a moment"):
            await self.say(c, text)
            await self.audio(c, 12)
        self.assertTrue(c.audio_queue.empty())
        await self.tool(c, "finish_call")
        self.assertFalse(c.done.is_set())

    async def test_resume_requires_fresh_address_and_cannot_replay_muted_audio(self):
        c = self.controller()
        await self.say(c, "Advocate, help me")
        await self.tool(c, "pause_advocate")
        await self.tool(c, "resume_advocate", "stale")
        self.assertFalse(c.state.can_output)
        await self.say(c, "Yes, the address is correct")
        await self.tool(c, "resume_advocate", "uninvited")
        self.assertFalse(c.state.can_output)
        await self.audio(c, 30)
        await self.say(c, "BetterBill, could you explain that?")
        await self.tool(c, "resume_advocate", "invited")
        self.assertTrue(c.state.can_output)
        await self.audio(c, 30)
        self.assertTrue(c.audio_queue.empty())
        await self.audio(c, 31)
        self.assertFalse(c.audio_queue.empty())

    async def test_explicit_stop_during_handoff_can_end_without_resuming_speech(self):
        c = self.controller()
        await self.tool(c, "pause_advocate")
        await self.say(c, "Please end the call")
        await self.tool(c, "finish_call")
        self.assertTrue(c.done.is_set())
        self.assertEqual(c.terminal_reason, "finished")

    async def test_finish_waits_for_a_spoken_recap_longer_than_five_seconds(self):
        c = self.controller()
        c.audio_queue.put_nowait((bytes(640 * 300), c.generation))

        async def play_recap():
            await c.audio_queue.get()
            await asyncio.sleep(6)
            c.audio_queue.task_done()

        playback = asyncio.create_task(play_recap())
        finishing = c.spawn(self.tool(c, "finish_call"))
        await asyncio.gather(playback, finishing, return_exceptions=True)
        self.assertTrue(c.done.is_set())
        self.assertEqual(c.terminal_status, "completed")
        self.assertEqual(c.terminal_reason, "finished")

    async def test_negation_and_mentions_do_not_authorize_resume_or_hangup(self):
        for text in (
            "Please don't end the call, I need another minute.",
            "I don't need the advocate to talk right now.",
            "Advocate, don't continue yet.",
            "Can we ask the advocate later?",
            "We will say goodbye after verification.",
            "Should I end the call?",
        ):
            with self.subTest(text=text):
                c = self.controller()
                await self.tool(c, "pause_advocate")
                await self.say(c, text)
                await self.tool(c, "resume_advocate")
                self.assertFalse(c.state.can_output)
                await self.tool(c, "finish_call")
                self.assertFalse(c.state.can_output)
                self.assertFalse(c.done.is_set())

    async def test_pause_resume_cannot_activate_ended_session_and_logs_no_speech(self):
        c = self.controller()
        with self.assertLogs("betterbill_voice.controller", level="INFO") as logs:
            await self.tool(c, "pause_advocate")
            await self.say(c, "Advocate, my private details need clarification")
            c.stop("failed")
            await self.tool(c, "resume_advocate")
        self.assertFalse(c.state.can_output)
        self.assertNotIn("private details", str([r.__dict__ for r in logs.records]))
