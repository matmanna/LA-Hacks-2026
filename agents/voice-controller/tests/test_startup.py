import copy
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from livekit import api

from betterbill_voice.controller import CallController, VoiceHttpError, log_failure
from betterbill_voice.worker import entrypoint


def response(status=200, data=None, audio=b"\0\0" * 160):
    item = SimpleNamespace(
        status=status, json=AsyncMock(return_value=data), read=AsyncMock(return_value=audio)
    )
    manager = AsyncMock()
    manager.__aenter__.return_value = item
    return manager, item


def agent_config():
    return {
        "conversation_config": {
            "asr": {"user_input_audio_format": "pcm_16000"},
            "tts": {"agent_output_audio_format": "pcm_16000", "voice_id": "voice"},
            "vad": {"background_voice_detection": True},
            "conversation": {"client_events": ["agent_response_complete"]},
            "agent": {
                "prompt": {
                    "prompt": "Advocate with the patient present. Pause for direct spoken answers.",
                    "tool_ids": ["tool_finish", "tool_pause", "tool_resume"],
                    "built_in_tools": {"end_call": None},
                    "tools": [
                        {
                            "type": "client",
                            "name": name,
                            "expects_response": True,
                            "parameters": {"type": "object", "properties": {}, "required": []},
                        }
                        for name in ("finish_call", "pause_advocate", "resume_advocate")
                    ],
                }
            },
        },
        "workflow": {"nodes": {}, "edges": {}},
    }


class StartupTests(unittest.IsolatedAsyncioTestCase):
    def controller(self, config_status=200, tts_status=200, signed_status=200):
        config, config_body = response(config_status, agent_config())
        tts, tts_body = response(tts_status)
        signed, signed_body = response(
            signed_status,
            {"signed_url": "wss://api.elevenlabs.io/v1/convai/conversation?token=private-token"},
        )
        http = SimpleNamespace(get=Mock(side_effect=[config, signed]), post=Mock(return_value=tts))
        ctx = SimpleNamespace(
            job=SimpleNamespace(room=SimpleNamespace(name="bb-act")), connect=AsyncMock()
        )
        c = CallController(ctx, http, Mock(), "act", "bb-act")
        c.config = {
            "actionId": "act",
            "roomName": "bb-act",
            "flowVersion": "patient-first-v1",
            "agentId": "agent",
            "branchId": "branch",
            "vars": {},
            "introductionText": "Approved introduction text",
            "photonTrunkId": "trunk",
        }
        c.post = AsyncMock(return_value=c.config)
        c.close = AsyncMock()
        return c, (config_body, tts_body, signed_body)

    def test_twirp_logs_no_private_message_or_metadata(self):
        for code, expected in (
            ("permission_denied", "permission_denied"),
            ("private code", "unknown"),
        ):
            error = api.TwirpError(
                code, "private message", status=403, metadata={"secret": "value"}
            )
            with self.assertLogs("betterbill_voice.controller", level="ERROR") as logs:
                log_failure("patient_dial", error)
            self.assertEqual(logs.records[0].twirp_code, expected)
            for secret in ("private", "secret"):
                self.assertNotIn(secret, str(logs.records[0].__dict__))

    async def test_preflight_rejections_stop_before_phone_setup(self):
        for rejection, stage in (
            ({"config_status": 403}, "elevenlabs_agent_config"),
            ({"tts_status": 401}, "elevenlabs_introduction_tts"),
        ):
            with (
                self.subTest(stage=stage),
                patch.dict("os.environ", {"ELEVENLABS_API_KEY": "secret"}),
            ):
                c, _ = self.controller(**rejection)
                with self.assertLogs("betterbill_voice.controller", level="ERROR") as logs:
                    await c.run()
                self.assertEqual(logs.records[0].voice_stage, stage)
                self.assertEqual(logs.records[0].http_status, next(iter(rejection.values())))
                for secret in ("private-token", "secret", "1555555", "introduction text"):
                    self.assertNotIn(secret, " ".join(logs.output))
                c.ctx.connect.assert_not_awaited()
                c.close.assert_awaited_once()

    async def test_preflight_prepares_pcm_but_defers_signed_url(self):
        c, _ = self.controller()
        with (
            patch.dict("os.environ", {"ELEVENLABS_API_KEY": "secret"}),
            self.assertLogs("betterbill_voice.controller", level="INFO") as logs,
        ):
            await c.preflight()
            self.assertEqual(c.http.get.call_count, 1)
            self.assertEqual(c.disclosure_pcm, b"\0\0" * 160)
            signed = await c.signed_url()
        self.assertTrue(logs.records[0].background_voice_filter_enabled)
        self.assertTrue(signed.startswith("wss://api.elevenlabs.io/"))
        self.assertEqual(c.http.post.call_args.kwargs["params"], {"output_format": "pcm_16000"})

    async def test_voice_override_only_changes_fixed_introduction(self):
        c, _ = self.controller()
        with patch.dict(
            "os.environ",
            {"ELEVENLABS_API_KEY": "secret", "ELEVENLABS_INVITATION_VOICE_ID": "permittedVoice123"},
        ):
            await c.preflight()
        self.assertTrue(c.http.post.call_args.args[0].endswith("/text-to-speech/permittedVoice123"))
        self.assertEqual(c.http.get.call_args.kwargs["params"], {"branch_id": "branch"})

    async def test_signed_url_failure_and_wrong_host_are_rejected(self):
        c, _ = self.controller(signed_status=429)
        c.http.get.side_effect = [response(429)[0]]
        with patch.dict("os.environ", {"ELEVENLABS_API_KEY": "secret"}):
            with self.assertRaises(VoiceHttpError) as caught:
                await c.signed_url()
            self.assertEqual(caught.exception.stage, "elevenlabs_signed_url")
            c.http.get.side_effect = [
                response(data={"signed_url": "wss://wrong.invalid/?token=secret"})[0]
            ]
            with self.assertRaises(ValueError):
                await c.signed_url()

    def test_preflight_rejects_old_tools_instructions_and_workflow_overrides(self):
        original = agent_config()
        CallController.validate_hosted_agent(original)
        original["workflow"]["nodes"] = {
            "start_node": {"type": "start", "edge_order": [], "position": {"x": 0, "y": 0}}
        }
        CallController.validate_hosted_agent(original)
        changes = (
            lambda a: a["conversation_config"]["agent"]["prompt"]["tools"][0].update(
                name="invite_patient"
            ),
            lambda a: a["conversation_config"]["agent"]["prompt"].update(
                prompt="Use invite_patient"
            ),
            lambda a: a["conversation_config"]["agent"]["prompt"]["built_in_tools"].update(
                end_call={"type": "system"}
            ),
            lambda a: a["workflow"]["nodes"].update(greeting={"type": "override_agent"}),
            lambda a: a["workflow"]["nodes"]["start_node"].update(edge_order=["stage"]),
            lambda a: a["workflow"]["edges"].update(edge={"source": "old", "target": "stage"}),
            lambda a: a["conversation_config"]["agent"]["prompt"]["tools"][0]["parameters"].update(
                properties={"phone": {"type": "string"}}
            ),
        )
        for change in changes:
            agent = copy.deepcopy(original)
            change(agent)
            with self.assertRaises(ValueError):
                CallController.validate_hosted_agent(agent)

    def test_preflight_allows_only_native_skip_turn_for_temporary_waits(self):
        agent = agent_config()
        skip = {
            "type": "system", "name": "skip_turn",
            "params": {"system_tool_type": "skip_turn"},
        }
        prompt = agent["conversation_config"]["agent"]["prompt"]
        prompt["built_in_tools"]["skip_turn"] = skip
        CallController.validate_hosted_agent(agent)
        # The provider may expand built-in tools into the resolved tools list.
        prompt["tools"].append(skip)
        CallController.validate_hosted_agent(agent)
        for change in (
            lambda p: p["built_in_tools"].update(end_call={"type": "system"}),
            lambda p: p["built_in_tools"]["skip_turn"]["params"].update(
                system_tool_type="end_call"
            ),
            lambda p: p["tools"].append(skip),
            lambda p: p["tools"][-1].update(type="client"),
        ):
            changed = copy.deepcopy(agent)
            change(changed["conversation_config"]["agent"]["prompt"])
            with self.assertRaises(ValueError):
                CallController.validate_hosted_agent(changed)

    async def test_post_binds_version_action_and_room_without_redirecting(self):
        c, _ = self.controller()
        c.http.post.return_value = response(data={"allowed": False})[0]
        with patch.dict(
            "os.environ",
            {"BETTERBILL_VOICE_API_URL": "http://127.0.0.1:3001", "BB_VOICE_WORKER_KEY": "secret"},
        ):
            await CallController.post(c, "dial", leg="patient")
        self.assertEqual(
            c.http.post.call_args.kwargs["json"],
            {
                "event": "dial",
                "actionId": "act",
                "roomName": "bb-act",
                "flowVersion": "patient-first-v1",
                "leg": "patient",
            },
        )
        self.assertFalse(c.http.post.call_args.kwargs["allow_redirects"])

    async def test_entrypoint_shuts_down_job_after_startup_failure(self):
        ctx = SimpleNamespace(
            job=SimpleNamespace(
                metadata='{"actionId":"act","roomName":"bb-act","flowVersion":"patient-first-v1"}',
                room=SimpleNamespace(name="bb-act"),
            ),
            add_shutdown_callback=Mock(),
            shutdown=Mock(),
        )
        controller = Mock(run=AsyncMock(side_effect=RuntimeError("safe failure")))
        with (
            patch("betterbill_voice.worker.aiohttp.ClientSession", return_value=AsyncMock()),
            patch("betterbill_voice.worker.api.LiveKitAPI", return_value=AsyncMock()),
            patch("betterbill_voice.worker.CallController", return_value=controller),
        ):
            with self.assertRaises(RuntimeError):
                await entrypoint(ctx)
        ctx.shutdown.assert_called_once_with("betterbill_voice_session_finished")
