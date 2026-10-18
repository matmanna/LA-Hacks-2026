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
        c.source = SimpleNamespace(clear_queue=Mock(), wait_for_playout=AsyncMock())
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

    async def test_verification_yields_without_model_tool_and_patient_answers_stay_silent(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("hospital", "What is your date of birth?", final=False)
        self.assertFalse(c.state.can_output)
        await c.on_transcript("patient", "My birthday is April 15", final=True, utterance_id="p1")
        await self.audio(c)
        await self.complete(c)
        self.assertTrue(c.audio_queue.empty())
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "contextual_update")

    async def test_staff_and_mixed_transcript_cannot_authorize_a_reply(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("patient", "Yes", final=True)
        await c.on_transcript("hospital", "Advocate, can you explain that?", final=True)
        await c.handle_event(
            {
                "type": "user_transcript",
                "user_transcription_event": {
                    "user_transcript": "Advocate, help me",
                    "event_id": 2,
                },
            }
        )
        await c.handle_tool({"tool_name": "resume_advocate", "tool_call_id": "r", "parameters": {}})
        await self.audio(c, 3)
        await self.complete(c, 3)
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.state.can_output)

    async def test_patient_request_allows_one_complete_answer_then_requiets(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript(
            "patient", "Advocate, could you explain that?", final=True, utterance_id="p1"
        )
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "user_message")
        await self.audio(c, 2)
        self.assertTrue(c.audio_queue.empty(), "Unvalidated response streamed before its boundary")
        await self.complete(c, 2)
        self.assertEqual(c.audio_queue.qsize(), 1)
        self.assertFalse(c.state.can_output)
        admitted = c.audio_queue.get_nowait()
        c.audio_queue.task_done()
        await self.audio(c, 3)
        await self.complete(c, 3)
        self.assertTrue(c.audio_queue.empty(), "A second answer escaped the one-answer grant")
        self.assertEqual(admitted[0], b"\0\0")

    async def test_patient_partial_revokes_an_answer_before_audio_playback(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("patient", "Advocate, explain that", final=True)
        await self.audio(c, 2)
        await c.on_transcript("patient", "Wait", final=False)
        await self.complete(c, 2)
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.state.can_output)

    async def test_hospital_cannot_end_call_and_patient_can(self):
        c = self.controller()
        await self.complete(c)
        await c.on_transcript("hospital", "Please end the call", final=True)
        await c.handle_tool({"tool_name": "finish_call", "tool_call_id": "f", "parameters": {}})
        self.assertFalse(c.done.is_set())
        self.assertTrue(c.ai_disabled)
        c = self.controller()
        await c.on_transcript("patient", "Please end the call", final=True)
        self.assertTrue(c.done.is_set())

    async def test_ai_failure_mutes_advocate_and_preserves_humans(self):
        c = self.controller()
        await c.disable_advocate()
        self.assertFalse(c.done.is_set())
        self.assertFalse(c.state.can_output)
        self.assertFalse(c.accepting_input)
        c.lk.room.delete_room.assert_not_called()
        c.status.assert_awaited_once_with("ai_unavailable")
        await c.on_transcript("patient", "Advocate, help me", final=True)
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
            await asyncio.gather(*list(c.tasks), return_exceptions=True)
            await asyncio.sleep(0)
        self.assertFalse(c.done.is_set(), "Hosted tool failure disconnected both humans")
        await asyncio.gather(*list(c.tasks), return_exceptions=True)
        self.assertTrue(c.ai_disabled)

    async def test_patient_or_staff_refusal_withdraws_processing_while_quiet(self):
        for role in ("patient", "hospital"):
            c = self.controller()
            c.yield_advocate("verification")
            await c.on_transcript(role, "Please stop recording", final=True)
            await asyncio.gather(*list(c.tasks))
            self.assertTrue(c.ai_disabled)
            self.assertFalse(c.done.is_set())
            c.ws.send_json.assert_not_awaited()

    async def test_missing_patient_transcription_blocks_opening_and_hospital_reply(self):
        c = self.controller()
        c.transcription_ready["patient"].clear()
        await self.audio(c)
        await self.complete(c)
        self.assertTrue(c.audio_queue.empty())
        await c.on_transcript("hospital", "Yes, go ahead", final=True)
        self.assertFalse(c.response_requested)
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "contextual_update")

    async def test_hosted_session_waits_until_both_transcriptions_are_ready(self):
        c = self.controller()
        c.transcription_ready["patient"].clear()
        c.signed_url = AsyncMock(side_effect=RuntimeError("stop at the network boundary"))
        task = asyncio.create_task(c.start_conversation())
        await asyncio.sleep(0)
        c.signed_url.assert_not_awaited()
        await c.on_transcript("patient", "I'm ready to verify", final=True)
        self.assertTrue(c.state.quiet)
        await c.on_transcription_ready("patient")
        with self.assertRaisesRegex(RuntimeError, "network boundary"):
            await task
        c.signed_url.assert_awaited_once()

    async def test_early_human_conversation_mutes_the_opening_and_retains_context(self):
        c = self.controller()
        c.state.phase = "billing_connected"
        c.accepting_input = True
        await c.on_transcript("hospital", "What is your date of birth?", final=True)
        await c.on_transcript("patient", "April fifteenth", final=True)
        self.assertFalse(c.state.can_output)
        self.assertEqual(len(c.pending_context), 2)
        c.ws.send_json.assert_not_awaited()

    async def test_direct_human_exchange_never_plays_identity_correction(self):
        c = self.controller()
        await self.complete(c)
        for role, text in (
            ("hospital", "I need to verify the patient"),
            ("hospital", "What is your birthday?"),
            ("patient", "April fifteenth"),
            ("hospital", "Thank you. Give me a moment"),
            ("hospital", "Advocate, explain the bill"),
        ):
            await c.on_transcript(role, text, final=True)
        await c.handle_event(
            {
                "type": "agent_response",
                "agent_response_event": {
                    "agent_response": "That date does not match our records",
                },
            }
        )
        await self.audio(c, 2)
        await self.complete(c, 2)
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.done.is_set())

    async def test_patient_request_during_previous_response_waits_for_its_boundary(self):
        c = self.controller()
        await self.audio(c, 1)
        await c.on_transcript(
            "patient", "Advocate, can you help?", final=True, utterance_id="fresh"
        )
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "contextual_update")
        await self.complete(c, 1)
        self.assertTrue(c.audio_queue.empty(), "The interrupted old answer played")
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "user_message")
        await self.complete(c, 1)  # Duplicate old boundary cannot close the new reply.
        await self.audio(c, 2)
        await self.complete(c, 2)
        self.assertEqual(c.audio_queue.qsize(), 1)
        self.assertFalse(c.state.can_output)

    async def test_human_speech_revokes_a_patient_request_waiting_for_old_boundary(self):
        c = self.controller()
        await c.on_transcript("patient", "Advocate, help me", final=True)
        await c.on_transcript("hospital", "One moment please", final=False)
        await self.complete(c, 1)
        self.assertNotIn(
            "user_message", [call.args[0]["type"] for call in c.ws.send_json.await_args_list]
        )
