import asyncio
import base64
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from betterbill_voice.controller import CallController


class HandoffTests(unittest.IsolatedAsyncioTestCase):
    def controller(self):
        c = CallController(SimpleNamespace(), Mock(), Mock(), "action", "room")
        c.state.phase = "active"
        c.source = SimpleNamespace(
            clear_queue=Mock(), wait_for_playout=AsyncMock(), capture_frame=AsyncMock()
        )
        c.ws = SimpleNamespace(send_json=AsyncMock(), close=AsyncMock())
        c.status = AsyncMock()
        for event in c.transcription_ready.values():
            event.set()
        return c

    async def tool(self, c, name, call_id=None, parameters=None):
        await c.handle_tool(
            {
                "tool_name": name,
                "tool_call_id": call_id or name,
                "parameters": {} if parameters is None else parameters,
            }
        )

    async def audio(self, c, event_id, pcm=b"\0\0"):
        await c.handle_event(
            {
                "type": "audio",
                "audio_event": {
                    "audio_base_64": base64.b64encode(pcm).decode(),
                    "event_id": event_id,
                },
            }
        )

    async def complete(self, c, event_id):
        await c.handle_event(
            {
                "type": "agent_response_complete",
                "agent_response_complete_event": {"event_id": event_id},
            }
        )
        for _ in range(3):
            await asyncio.sleep(0)

    async def test_temporary_pause_discards_queued_speech_without_ending_the_call(self):
        c = self.controller()
        await self.audio(c, 1)
        self.assertFalse(c.audio_queue.empty())
        await self.tool(c, "pause_advocate")
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.state.can_output)
        await self.audio(c, 2)
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.done.is_set())
        await self.complete(c, 2)
        await c.on_transcript("hospital", "Thanks, we can continue now.", final=True)
        self.assertTrue(c.state.can_output)
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "user_message")

    async def test_duplicate_pause_tool_cannot_change_generation_twice(self):
        c = self.controller()
        await self.tool(c, "pause_advocate", "same-id")
        generation = c.generation
        await self.tool(c, "pause_advocate", "same-id")
        self.assertEqual(c.generation, generation)
        self.assertFalse(c.state.can_output)

    async def test_invalid_tool_parameters_and_missing_ids_cannot_modify_the_call(self):
        c = self.controller()
        await self.audio(c, 1)
        for name in ("pause_advocate", "resume_advocate", "finish_call"):
            await self.tool(c, name, parameters={"approved": True})
            self.assertTrue(c.state.can_output)
            self.assertEqual(c.audio_queue.qsize(), 1)
            self.assertFalse(c.ai_disabled)
            self.assertFalse(c.done.is_set())
            self.assertTrue(c.ws.send_json.call_args.args[0]["is_error"])
        with self.assertRaisesRegex(ValueError, "Missing hosted tool call ID"):
            await c.handle_tool({"tool_name": "pause_advocate", "parameters": {}})

    async def test_finish_tool_withdraws_ai_without_ending_the_human_call(self):
        c = self.controller()
        await self.audio(c, 1)
        await self.tool(c, "finish_call", "finish-once")
        self.assertTrue(c.ai_disabled)
        self.assertFalse(c.state.can_output)
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.done.is_set())
        c.lk.room.delete_room.assert_not_called()
        await self.tool(c, "finish_call", "finish-once")
        c.status.assert_awaited_once_with("ai_unavailable")

    async def test_partial_stop_and_negated_end_requests_do_not_end_the_human_call(self):
        c = self.controller()
        await self.complete(c, 1)
        await c.on_transcript("patient", "Please end the call", final=False)
        self.assertTrue(c.state.can_output)
        for index, text in enumerate(
            (
                "Please don't end the call, I need another minute.",
                "We will say goodbye after verification.",
                "Should I end the call?",
            )
        ):
            await c.on_transcript("patient", text, final=True, utterance_id=str(index))
            self.assertFalse(c.done.is_set())
        self.assertFalse(c.ai_disabled)

    async def test_full_length_recap_plays_every_frame_without_ending_call(self):
        c = self.controller()
        await self.complete(c, 1)
        await c.on_transcript("patient", "Please explain the next steps", final=True)
        pcm = bytes(640 * 300)
        await self.audio(c, 2, pcm)
        await self.complete(c, 2)
        self.assertTrue(c.hosted_busy)
        playback = asyncio.create_task(c.play_audio())
        try:
            await asyncio.wait_for(c.audio_queue.join(), timeout=2)
            for _ in range(3):
                await asyncio.sleep(0)
        finally:
            playback.cancel()
            await asyncio.gather(playback, return_exceptions=True)
        played = b"".join(
            bytes(call.args[0].data) for call in c.source.capture_frame.await_args_list
        )
        self.assertEqual(played, pcm)
        self.assertEqual(c.source.capture_frame.await_count, 300)
        self.assertTrue(c.state.can_output)
        self.assertFalse(c.done.is_set())

    async def test_resume_tool_can_release_a_temporary_pause(self):
        c = self.controller()
        await self.tool(c, "pause_advocate")
        await self.tool(c, "resume_advocate")
        self.assertTrue(c.state.can_output)
        self.assertFalse(c.done.is_set())
        self.assertFalse(c.ws.send_json.call_args.args[0]["is_error"])

    async def test_ended_session_cannot_resume_and_diagnostics_exclude_speech(self):
        c = self.controller()
        private_text = "My private identity detail is 811 South Example Road"
        with self.assertLogs("betterbill_voice.controller", level="INFO") as logs:
            await self.tool(c, "pause_advocate")
            await c.on_transcript("patient", private_text, final=True)
            c.stop("failed")
            await self.tool(c, "resume_advocate")
            await c.on_transcript("patient", "Please help me", final=True)
        self.assertFalse(c.state.can_output)
        self.assertTrue(c.done.is_set())
        self.assertNotIn(private_text, str([record.__dict__ for record in logs.records]))
