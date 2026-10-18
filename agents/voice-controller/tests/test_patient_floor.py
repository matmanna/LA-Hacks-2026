import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

from betterbill_voice.controller import CallController


class PatientFloorTests(unittest.IsolatedAsyncioTestCase):
    def controller(self):
        room = SimpleNamespace(
            remote_participants={
                role: SimpleNamespace(identity=role, track_publications={})
                for role in ("patient", "hospital")
            }
        )
        c = CallController(SimpleNamespace(room=room), Mock(), Mock(), "action", "room")
        c.state.phase = "active"
        c.source = SimpleNamespace(
            clear_queue=Mock(), wait_for_playout=AsyncMock(), capture_frame=AsyncMock()
        )
        c.ws = SimpleNamespace(send_json=AsyncMock(), close=AsyncMock())
        c.status = AsyncMock()
        for event in c.transcription_ready.values():
            event.set()
        return c

    async def audio(self, c, event_id=1):
        await c.handle_event(
            {
                "type": "audio",
                "audio_event": {
                    "audio_base_64": "AAA=",
                    "event_id": event_id,
                },
            }
        )

    async def complete(self, c, event_id=1):
        await c.handle_event(
            {
                "type": "agent_response_complete",
                "agent_response_complete_event": {"event_id": event_id},
            }
        )
        for _ in range(3):
            await asyncio.sleep(0)

    async def play_queued(self, c):
        playback = asyncio.create_task(c.play_audio())
        try:
            await asyncio.wait_for(c.audio_queue.join(), timeout=1)
        finally:
            playback.cancel()
            await asyncio.gather(playback, return_exceptions=True)

    async def test_opening_audio_streams_before_the_completion_event(self):
        c = self.controller()
        await self.audio(c)
        self.assertEqual(c.audio_queue.qsize(), 1)
        await self.play_queued(c)
        self.assertTrue(c.hosted_busy)
        await self.complete(c)
        self.assertFalse(c.hosted_busy)
        c.source.capture_frame.assert_awaited_once()

    async def test_partial_background_speech_never_discards_or_interrupts_a_reply(self):
        c = self.controller()
        await self.audio(c)
        generation = c.generation
        for role in ("patient", "hospital"):
            await c.on_transcript(role, "What is your date of birth?", final=False)
        self.assertEqual(c.generation, generation)
        self.assertEqual(c.audio_queue.qsize(), 1)
        self.assertTrue(c.state.can_output)
        c.ws.send_json.assert_not_awaited()

    async def test_patient_and_staff_turns_allow_continued_advocacy_without_wake_words(self):
        c = self.controller()
        await self.complete(c)
        for index, (role, text) in enumerate(
            (
                ("hospital", "Yes, you may continue."),
                ("patient", "Could you explain that?"),
                ("hospital", "I will send the itemized bill tomorrow."),
            ),
            start=2,
        ):
            await c.on_transcript(role, text, final=True, utterance_id=str(index))
            self.assertEqual(
                c.ws.send_json.call_args.args[0],
                {"type": "user_message", "text": f"{role}: {text}"},
            )
            await self.audio(c, index)
            self.assertEqual(c.audio_queue.qsize(), 1)
            await self.play_queued(c)
            await self.complete(c, index)
            self.assertTrue(c.state.can_output)
            self.assertFalse(c.hosted_busy)

    async def test_verification_is_attributed_context_for_the_model_without_regex_muting(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("hospital", "What is the patient's date of birth?", final=True)
        self.assertTrue(c.state.can_output)
        self.assertEqual(
            c.ws.send_json.call_args.args[0],
            {
                "type": "user_message",
                "text": "hospital: What is the patient's date of birth?",
            },
        )
        await c.on_transcript("patient", "April fifteenth", final=True)
        await c.on_transcript("hospital", "Thanks, you are verified.", final=True)
        await self.complete(c, 2)
        self.assertEqual(
            c.ws.send_json.call_args.args[0],
            {
                "type": "user_message",
                "text": "patient: April fifteenth\nhospital: Thanks, you are verified.",
            },
        )

    async def test_untrusted_mixed_hosted_transcript_does_not_create_a_human_turn(self):
        c = self.controller()
        await self.complete(c)
        await c.handle_event(
            {
                "type": "user_transcript",
                "user_transcription_event": {
                    "user_transcript": "Please end the call",
                    "event_id": 2,
                },
            }
        )
        self.assertFalse(c.done.is_set())
        self.assertFalse(c.pending_turns)
        c.ws.send_json.assert_not_awaited()
        await c.on_transcript("mixed", "Please end the call", final=True)
        c.ws.send_json.assert_not_awaited()

    async def test_hospital_cannot_end_human_call_but_explicit_final_patient_request_can(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("hospital", "Please end the call", final=True)
        await c.handle_tool({"tool_name": "finish_call", "tool_call_id": "f", "parameters": {}})
        self.assertFalse(c.done.is_set())
        self.assertTrue(c.ai_disabled)
        c = self.controller()
        await c.on_transcript("patient", "Please end the call", final=True)
        self.assertTrue(c.done.is_set())

    async def test_ai_failure_stops_processing_and_preserves_humans(self):
        c = self.controller()
        await c.disable_advocate()
        self.assertFalse(c.done.is_set())
        self.assertFalse(c.state.can_output)
        self.assertFalse(c.accepting_input)
        c.lk.room.delete_room.assert_not_called()
        c.status.assert_awaited_once_with("ai_unavailable")
        await c.on_transcript("patient", "Please help me", final=True)
        await self.audio(c)
        self.assertTrue(c.audio_queue.empty())
        c.on_participant_left(SimpleNamespace(identity="patient"))
        self.assertTrue(c.done.is_set())

    async def test_tool_result_transport_failure_does_not_disconnect_humans(self):
        c = self.controller()
        c.ws.send_json.side_effect = RuntimeError("private provider detail")
        with self.assertLogs("betterbill_voice.controller", level="INFO"):
            await c.handle_event(
                {
                    "type": "client_tool_call",
                    "client_tool_call": {
                        "tool_name": "resume_advocate",
                        "tool_call_id": "r",
                        "parameters": {},
                    },
                }
            )
            for _ in range(6):
                await asyncio.sleep(0)
        self.assertFalse(c.done.is_set())
        self.assertTrue(c.ai_disabled)
        c.lk.room.delete_room.assert_not_called()

    async def test_either_human_refusal_stops_ai_processing_while_preserving_the_call(self):
        for role in ("patient", "hospital"):
            c = self.controller()
            c.yield_advocate("verification")
            await c.on_transcript(role, "Please stop recording", final=True)
            for _ in range(4):
                await asyncio.sleep(0)
            self.assertTrue(c.ai_disabled)
            self.assertFalse(c.done.is_set())
            c.ws.send_json.assert_not_awaited()

    async def test_missing_patient_transcription_blocks_audio_and_keeps_human_turn_pending(self):
        c = self.controller()
        c.transcription_ready["patient"].clear()
        await self.audio(c)
        await self.complete(c)
        self.assertTrue(c.audio_queue.empty())
        await c.on_transcript("hospital", "Yes, go ahead", final=True)
        self.assertFalse(c.response_requested)
        self.assertEqual(c.pending_turns, [("hospital", "Yes, go ahead")])
        c.ws.send_json.assert_not_awaited()

    async def test_hosted_session_waits_until_both_transcriptions_are_ready(self):
        c = self.controller()
        c.transcription_ready["patient"].clear()
        c.signed_url = AsyncMock(side_effect=RuntimeError("stop at the network boundary"))
        task = asyncio.create_task(c.start_conversation())
        await asyncio.sleep(0)
        c.signed_url.assert_not_awaited()
        await c.on_transcript("patient", "I'm ready to verify", final=True)
        c.ws.send_json.assert_not_awaited()
        await c.on_transcription_ready("patient")
        with self.assertRaisesRegex(RuntimeError, "network boundary"):
            await task
        c.signed_url.assert_awaited_once()

    async def test_early_human_conversation_is_retained_before_hosted_readiness(self):
        c = self.controller()
        c.state.phase = "billing_connected"
        c.accepting_input = True
        await c.on_transcript("hospital", "What is your date of birth?", final=True)
        await c.on_transcript("patient", "April fifteenth", final=True)
        self.assertEqual(
            c.pending_context,
            [
                {"type": "contextual_update", "text": "hospital: What is your date of birth?"},
                {"type": "contextual_update", "text": "patient: April fifteenth"},
            ],
        )
        c.ws.send_json.assert_not_awaited()

    async def test_queued_turn_waits_for_playback_and_ignores_duplicate_completion(self):
        c = self.controller()
        await self.audio(c, 1)
        await c.on_transcript("patient", "Could you explain that?", final=True)
        c.ws.send_json.assert_not_awaited()
        await self.complete(c, 1)
        self.assertTrue(c.hosted_busy)
        c.ws.send_json.assert_not_awaited()
        await self.play_queued(c)
        for _ in range(3):
            await asyncio.sleep(0)
        self.assertEqual(
            c.ws.send_json.call_args.args[0],
            {"type": "user_message", "text": "patient: Could you explain that?"},
        )
        await self.complete(c, 1)
        self.assertTrue(c.hosted_busy)
        await self.audio(c, 2)
        await self.play_queued(c)
        await self.complete(c, 2)
        self.assertFalse(c.hosted_busy)
        self.assertFalse(c.done.is_set())
