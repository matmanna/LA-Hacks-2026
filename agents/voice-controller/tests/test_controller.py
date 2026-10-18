import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import aiohttp
from livekit import rtc

from betterbill_voice.controller import CallController


class ControllerTests(unittest.IsolatedAsyncioTestCase):
    def controller(self):
        callbacks = {}
        self.events, self.phones = [], {}
        self.source = SimpleNamespace(
            capture_frame=AsyncMock(),
            wait_for_playout=AsyncMock(),
            aclose=AsyncMock(),
            clear_queue=Mock(),
        )
        self.room = SimpleNamespace(
            on=lambda name, cb: callbacks.update({name: cb}),
            remote_participants=self.phones,
            local_participant=SimpleNamespace(publish_track=AsyncMock()),
        )
        ctx = SimpleNamespace(
            room=self.room,
            connect=AsyncMock(),
            job=SimpleNamespace(room=SimpleNamespace(name="bb-act_1")),
        )
        lk = SimpleNamespace(
            sip=SimpleNamespace(create_sip_participant=AsyncMock()),
            room=SimpleNamespace(delete_room=AsyncMock()),
        )
        c = CallController(ctx, Mock(), lk, "act_1", "bb-act_1")
        c.config = {
            "actionId": "act_1",
            "roomName": "bb-act_1",
            "flowVersion": "patient-first-v1",
            "agentId": "agent",
            "branchId": "branch",
            "photonTrunkId": "trunk",
            "vars": {},
            "introductionText": "Approved patient introduction.",
        }
        c.disclosure_pcm = b"\0\0" * 320
        c.source = self.source
        c.ws = SimpleNamespace(send_json=AsyncMock(), close=AsyncMock())
        for event in c.transcription_ready.values():
            event.set()
        c.preflight = AsyncMock()

        async def post(event, **extra):
            if event == "bootstrap":
                return c.config
            if event == "dial":
                leg = extra["leg"]
                self.events.append("claim:" + leg)
                return {
                    "allowed": True,
                    "phoneNumber": {"patient": "+15555550102", "billing": "+15555550101"}[leg],
                }
            self.events.append(extra["status"])
            return {"ok": True}

        async def sip(request, **kwargs):
            identity = request.participant_identity
            self.events.append("dial:" + identity)
            self.phones[identity] = SimpleNamespace(identity=identity, track_publications={})
            callbacks["participant_connected"](self.phones[identity])

        async def playout():
            self.events.append("introduction_played")

        async def hosted():
            self.events.append("hosted")
            c.state.phase = "active"
            c.stop("completed", reason="finished")

        c.post = AsyncMock(side_effect=post)
        c.lk.sip.create_sip_participant.side_effect = sip
        self.source.wait_for_playout.side_effect = playout
        c.start_conversation = AsyncMock(side_effect=hosted)
        c.callbacks = callbacks
        return c

    async def run_controller(self, c, limit=3):
        with (
            patch("betterbill_voice.controller.rtc.AudioSource", return_value=self.source),
            patch("betterbill_voice.controller.rtc.LocalAudioTrack.create_audio_track"),
        ):
            await asyncio.wait_for(c.run(), limit)

    async def test_patient_briefing_then_billing_is_automatic_without_input(self):
        c = self.controller()
        await self.run_controller(c)
        self.assertEqual(
            self.events,
            [
                "claim:patient",
                "dial:patient",
                "patient_joined",
                "introduction_played",
                "patient_briefed",
                "claim:billing",
                "dial:hospital",
                "billing_connected",
                "hosted",
                "completed",
            ],
        )
        self.assertEqual(c.terminal_reason, "finished")
        self.assertTrue(c.closed)
        self.assertEqual(c.lk.room.delete_room.await_args.args[0].room, "bb-act_1")
        self.assertNotIn("sip_dtmf_received", c.callbacks)

    async def test_zero_call_limit_disables_worker_deadline_and_phone_override(self):
        c = self.controller()
        deadlines = []
        timeout = asyncio.timeout

        def capture_timeout(delay):
            deadlines.append(delay)
            return timeout(delay)

        with (
            patch("betterbill_voice.controller.MAX_CALL_SECONDS", 0),
            patch("betterbill_voice.controller.asyncio.timeout", side_effect=capture_timeout),
        ):
            await self.run_controller(c)
        self.assertIsNone(deadlines[0])
        self.assertEqual(c.terminal_reason, "finished")
        for call in c.lk.sip.create_sip_participant.await_args_list:
            self.assertEqual(call.args[0].max_call_duration.seconds, 0)
            self.assertEqual(call.args[0].ringing_timeout.seconds, 30)

    async def test_browser_patient_microphone_precedes_briefing_and_only_billing_is_dialed(self):
        c = self.controller()
        c.config["patientConnection"] = "browser"
        self.phones["patient"] = SimpleNamespace(identity="patient", track_publications={})

        async def publish_microphone():
            await asyncio.sleep(0.03)
            self.assertNotIn("claim:billing", self.events)
            self.assertNotIn("introduction_played", self.events)
            self.phones["patient"].track_publications["mic"] = SimpleNamespace(
                track=SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO)
            )

        await asyncio.gather(self.run_controller(c), publish_microphone())
        self.assertNotIn("claim:patient", self.events)
        self.assertLess(
            self.events.index("patient_joined"), self.events.index("introduction_played")
        )
        self.assertLess(self.events.index("patient_briefed"), self.events.index("claim:billing"))
        self.assertEqual(c.lk.sip.create_sip_participant.await_count, 1)

    async def test_browser_departure_before_microphone_never_dials_billing(self):
        c = self.controller()
        c.config["patientConnection"] = "browser"
        self.phones["patient"] = SimpleNamespace(identity="patient", track_publications={})

        async def leave():
            await asyncio.sleep(0.03)
            c.on_participant_left(self.phones.pop("patient"))

        await asyncio.gather(self.run_controller(c), leave())
        c.lk.sip.create_sip_participant.assert_not_awaited()
        self.assertEqual(c.terminal_reason, "patient_left")

    async def test_stream_failure_logs_origin_and_close_code_before_cleanup(self):
        c = self.controller()
        c.ws.close_code = 1006

        async def send_audio():
            raise aiohttp.ClientConnectionResetError("private transport details")

        with self.assertLogs("betterbill_voice.controller", level="INFO") as logs:
            c.spawn(send_audio())
            await asyncio.wait_for(c.done.wait(), 1)
        failure = next(r for r in logs.records if hasattr(r, "error_type"))
        self.assertTrue(failure.voice_stage.endswith("send_audio"))
        event = next(
            r
            for r in logs.records
            if getattr(r, "voice_event", "") == "background_operation_failed"
        )
        self.assertEqual(event.ws_close_code, 1006)
        self.assertEqual(c.terminal_reason, "error")
        c.lk.room.delete_room.assert_not_awaited()
        self.assertNotIn("private transport details", str([r.__dict__ for r in logs.records]))

    async def test_sip_answer_can_arrive_before_rtc_participant_event(self):
        c = self.controller()

        async def sip(request, **kwargs):
            identity = request.participant_identity
            self.events.append("dial:" + identity)

            def arrived():
                participant = SimpleNamespace(identity=identity, track_publications={})
                self.phones[identity] = participant
                c.on_participant_joined(participant)

            asyncio.get_running_loop().call_later(0.01, arrived)

        c.lk.sip.create_sip_participant.side_effect = sip
        await self.run_controller(c)
        self.assertIn("billing_connected", self.events)
        self.assertEqual(c.terminal_status, "completed")

    async def test_no_answer_or_failed_briefing_never_dials_billing(self):
        for fail_stage in ("dial", "capture", "drain"):
            with self.subTest(stage=fail_stage):
                c = self.controller()
                if fail_stage == "dial":
                    c.lk.sip.create_sip_participant.side_effect = TimeoutError
                elif fail_stage == "capture":
                    self.source.capture_frame.side_effect = RuntimeError("private")
                else:
                    self.source.wait_for_playout.side_effect = TimeoutError
                with self.assertLogs("betterbill_voice.controller", level="ERROR"):
                    await self.run_controller(c)
                self.assertNotIn("claim:billing", self.events)
                self.assertEqual(c.terminal_status, "failed")
                self.assertTrue(c.closed)

    async def test_patient_hangup_during_introduction_prevents_billing(self):
        c = self.controller()

        async def left():
            c.on_participant_left(self.phones["patient"])
            await asyncio.sleep(0)

        self.source.wait_for_playout.side_effect = left
        await self.run_controller(c)
        self.assertNotIn("claim:billing", self.events)
        self.assertEqual(c.terminal_reason, "patient_left")
        self.assertTrue(c.closed)

    async def test_patient_hangup_cancels_inflight_billing_and_cleans_room(self):
        c = self.controller()
        answered = c.lk.sip.create_sip_participant.side_effect
        cancelled = asyncio.Event()

        async def sip(request, **kwargs):
            if request.participant_identity == "patient":
                return await answered(request, **kwargs)
            self.events.append("dial:hospital")
            c.on_participant_left(self.phones["patient"])
            try:
                await asyncio.Future()
            finally:
                cancelled.set()

        c.lk.sip.create_sip_participant.side_effect = sip
        await self.run_controller(c)
        self.assertTrue(cancelled.is_set())
        self.assertNotIn("hosted", self.events)
        self.assertEqual(c.terminal_reason, "patient_left")
        self.assertTrue(c.closed)
        self.assertEqual(c.lk.room.delete_room.await_count, 1)

    async def test_denied_claim_and_invalid_destination_never_dial(self):
        for claim in ({"allowed": False}, {"allowed": True, "phoneNumber": "invalid"}):
            c = self.controller()
            bootstrap = c.config
            c.post.side_effect = lambda event, bootstrap=bootstrap, claim=claim, **kwargs: (
                bootstrap if event == "bootstrap" else claim
            )
            with self.assertLogs("betterbill_voice.controller", level="ERROR"):
                await self.run_controller(c)
            self.assertEqual(c.lk.sip.create_sip_participant.await_count, 0)

    async def test_stuck_introduction_drains_timeout_before_billing(self):
        c = self.controller()

        async def never_finishes():
            await asyncio.Future()

        self.source.wait_for_playout.side_effect = never_finishes
        with self.assertLogs("betterbill_voice.controller", level="ERROR"):
            await self.run_controller(c, limit=3)
        self.assertNotIn("claim:billing", self.events)
        self.assertEqual(c.terminal_reason, "timeout")
        self.assertTrue(c.closed)

    async def test_stale_bootstrap_fails_without_dialing(self):
        c = self.controller()
        c.config["flowVersion"] = "legacy"
        with self.assertLogs("betterbill_voice.controller", level="ERROR"):
            await self.run_controller(c)
        self.assertEqual(c.lk.sip.create_sip_participant.await_count, 0)

    async def test_failed_hosted_start_preserves_humans_until_patient_leaves(self):
        c = self.controller()
        c.start_conversation.side_effect = RuntimeError("private provider details")
        failed = asyncio.Event()
        original_status = c.status

        async def record_status(value, **kwargs):
            await original_status(value, **kwargs)
            if value == "ai_unavailable":
                failed.set()

        c.status = record_status

        async def patient_leaves_after_ai_failure():
            await failed.wait()
            self.assertFalse(c.done.is_set())
            c.lk.room.delete_room.assert_not_awaited()
            c.on_participant_left(self.phones["patient"])

        with self.assertLogs("betterbill_voice.controller", level="ERROR"):
            await asyncio.gather(self.run_controller(c), patient_leaves_after_ai_failure())
        self.assertIn("billing_connected", self.events)
        self.assertEqual(self.events[-1], "failed")
        self.assertEqual(c.terminal_reason, "patient_left")
        self.assertEqual(c.lk.room.delete_room.await_count, 1)

    async def test_terminal_status_rejection_falls_back_once_and_close_is_idempotent(self):
        c = self.controller()
        c.authorized = True
        c.stop("completed", reason="finished")
        c.status = AsyncMock(side_effect=[RuntimeError("state changed"), None])
        await c.close()
        await c.close()
        self.assertEqual(
            [call.args[0] for call in c.status.await_args_list], ["completed", "failed"]
        )
        self.assertEqual(c.lk.room.delete_room.await_count, 1)

    async def test_hosted_metadata_enables_audio_only_after_ready_recorded(self):
        c = self.controller()
        self.phones.update(
            {
                name: SimpleNamespace(identity=name, track_publications={})
                for name in ("patient", "hospital")
            }
        )
        await c.handle_event(
            {
                "type": "conversation_initiation_metadata",
                "conversation_initiation_metadata_event": {
                    "conversation_id": "conv_test",
                    "agent_output_audio_format": "pcm_16000",
                    "user_input_audio_format": "pcm_16000",
                },
            }
        )
        self.assertTrue(c.state.can_output)
        self.assertTrue(c.ready.is_set())
        self.assertEqual(
            c.post.await_args.kwargs, {"status": "ready", "conversationId": "conv_test"}
        )

    async def test_hosted_websocket_close_logs_only_numeric_code(self):
        c = self.controller()
        self.phones.update(
            {
                name: SimpleNamespace(identity=name, track_publications={})
                for name in ("patient", "hospital")
            }
        )
        c.signed_url = AsyncMock(return_value="wss://private-signed-url")
        c.spawn = lambda coroutine, **_kwargs: coroutine.close()
        ws = AsyncMock()
        ws.close_code, ws.close_reason = 1008, "private close reason"
        ws.__aiter__.return_value = []
        manager = AsyncMock()
        manager.__aenter__.return_value = ws
        c.http.ws_connect = Mock(return_value=manager)
        with self.assertLogs("betterbill_voice.controller", level="INFO") as logs:
            with self.assertRaises(RuntimeError):
                await CallController.start_conversation(c)
        closed = [r for r in logs.records if r.voice_event == "hosted_conversation_closed"]
        self.assertEqual(closed[0].ws_close_code, 1008)
        self.assertNotIn("private", str(closed[0].__dict__))

    async def test_rejected_duplicate_bootstrap_never_deletes_active_room(self):
        c = self.controller()
        c.post.side_effect = PermissionError
        with self.assertRaises(PermissionError):
            await self.run_controller(c)
        self.assertEqual(c.lk.room.delete_room.await_count, 0)

    async def test_presence_does_not_mute_advocate_and_hangup_blocks_buffered_audio(self):
        c = self.controller()
        c.state.phase = "active"
        await c.handle_event(
            {"type": "audio", "audio_event": {"audio_base_64": "AAA=", "event_id": 3}}
        )
        await c.handle_event(
            {"type": "agent_response_complete", "agent_response_complete_event": {"event_id": 3}}
        )
        self.assertFalse(c.audio_queue.empty())
        c.on_participant_left(SimpleNamespace(identity="patient"))
        self.assertTrue(c.audio_queue.empty())
        await c.handle_event(
            {"type": "audio", "audio_event": {"audio_base_64": "AAA=", "event_id": 4}}
        )
        self.assertTrue(c.audio_queue.empty())
        self.assertFalse(c.state.can_finish)

    async def test_initial_tracks_are_not_buffered_for_hosted_agent(self):
        c = self.controller()
        track = SimpleNamespace(kind=rtc.TrackKind.KIND_AUDIO, sid="track")
        participant = SimpleNamespace(identity="patient")
        c.spawn = lambda coroutine, **_kwargs: coroutine.close()
        with (
            patch("betterbill_voice.controller.rtc.AudioStream") as stream,
            patch.dict("os.environ", {"ELEVENLABS_API_KEY": "secret"}),
        ):
            c.on_track(track, None, participant)
            stream.assert_not_called()
            c.accepting_input = True
            c.on_track(track, None, participant)
            stream.assert_called_once()
        c.streams.clear()

    async def test_unknown_tool_never_invites_and_finish_only_withdraws_ai(self):
        c = self.controller()
        c.state.phase = "active"
        self.source.wait_for_playout.side_effect = None
        for name in ("invite_patient", "transfer_call"):
            await c.handle_tool({"tool_name": name, "tool_call_id": name, "parameters": {}})
        self.assertEqual(c.post.await_count, 0)
        await c.handle_tool(
            {"tool_name": "finish_call", "tool_call_id": "finish", "parameters": {}}
        )
        self.assertFalse(c.done.is_set())
        self.assertTrue(c.ai_disabled)
        c.lk.room.delete_room.assert_not_awaited()

    async def test_duplicate_finish_and_model_destination_are_rejected(self):
        c = self.controller()
        c.state.phase = "active"
        self.source.wait_for_playout.side_effect = None
        await c.handle_tool(
            {
                "tool_name": "finish_call",
                "tool_call_id": "bad",
                "parameters": {"phone": "+15555550111"},
            }
        )
        self.assertFalse(c.done.is_set())
        event = {"tool_name": "finish_call", "tool_call_id": "one", "parameters": {}}
        await c.handle_tool(event)
        count = c.ws.send_json.await_count
        await c.handle_tool(event)
        self.assertEqual(c.ws.send_json.await_count, count)

    async def test_interruption_clears_queue_and_stale_pcm(self):
        c = self.controller()
        c.state.phase = "active"
        await c.handle_event(
            {"type": "audio", "audio_event": {"audio_base_64": "AAA=", "event_id": 2}}
        )
        await c.handle_event({"type": "interruption", "interruption_event": {"event_id": 3}})
        self.assertTrue(c.audio_queue.empty())
        await c.handle_event(
            {"type": "audio", "audio_event": {"audio_base_64": "AAA=", "event_id": 2}}
        )
        self.assertTrue(c.audio_queue.empty())

        await c.handle_event(
            {"type": "audio", "audio_event": {"audio_base_64": "AAA=", "event_id": 3}}
        )
        self.assertFalse(c.audio_queue.empty(), "Interruption ID must not block the next reply")

    async def test_departure_of_either_human_ends_call(self):
        for identity, reason in (("patient", "patient_left"), ("hospital", "billing_left")):
            c = self.controller()
            c.state.phase = "active"
            c.on_participant_left(SimpleNamespace(identity=identity))
            self.assertTrue(c.done.is_set())
            self.assertEqual(c.terminal_status, "failed")
            self.assertEqual(c.terminal_reason, reason)

    async def test_safe_transition_logs_exclude_speech_numbers_and_raw_audio(self):
        c = self.controller()
        c.state.phase = "active"
        hospital = SimpleNamespace(identity="hospital")
        with self.assertLogs("betterbill_voice.controller", level="INFO") as logs:
            c.on_speakers([hospital])
            c.on_speakers([hospital])
            c.on_speakers([])
            c.on_participant_left(
                SimpleNamespace(identity="+15555550999", disconnect_reason="secret")
            )
            await c.handle_event(
                {
                    "type": "user_transcript",
                    "user_transcription_event": {
                        "user_transcript": "private words",
                        "event_id": 42,
                    },
                }
            )
            for index in (43, 44):
                await c.handle_event(
                    {"type": "audio", "audio_event": {"event_id": index, "audio_base_64": "AAA="}}
                )
        events = [r.voice_event for r in logs.records]
        self.assertEqual(events.count("speaker_activity_changed"), 2)
        self.assertEqual(events.count("hosted_audio_turn"), 1)
        for secret in ("+15555550999", "secret", "private words", "AAA="):
            self.assertNotIn(secret, str([r.__dict__ for r in logs.records]))
