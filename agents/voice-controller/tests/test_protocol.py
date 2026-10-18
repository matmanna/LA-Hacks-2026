import base64
import unittest

from betterbill_voice.protocol import BridgeState, parse_metadata, pcm_event, tool_result


class ProtocolTests(unittest.TestCase):
    def test_metadata_requires_version_and_bound_identifiers(self):
        self.assertEqual(
            parse_metadata(
                '{"actionId":"act_1","roomName":"bb-act_1","flowVersion":"patient-first-v1"}'
            ),
            ("act_1", "bb-act_1"),
        )
        for value in (
            "{}",
            "[]",
            '{"actionId":"x","roomName":"room"}',
            '{"actionId":"x","roomName":"","flowVersion":"patient-first-v1"}',
            '{"actionId":"x","roomName":"room","flowVersion":"legacy"}',
            '{"actionId":"x","roomName":"room","flowVersion":"patient-first-v1","patientNumber":"+123"}',
        ):
            with self.assertRaises(ValueError):
                parse_metadata(value)

    def test_agent_waits_until_humans_connected(self):
        state = BridgeState()
        self.assertFalse(state.can_output)
        self.assertFalse(state.can_finish)
        state.phase = "active"
        self.assertTrue(state.can_output)
        self.assertTrue(state.can_finish)
        state.end()
        self.assertFalse(state.can_output)
        self.assertFalse(state.can_finish)

    def test_pcm_is_strict_and_gate_applies_before_decode(self):
        payload = {
            "audio_event": {"audio_base_64": base64.b64encode(b"\x01\x00").decode(), "event_id": 12}
        }
        self.assertEqual(pcm_event(payload, enabled=True, interrupted_before=11), b"\x01\x00")
        self.assertIsNone(pcm_event(payload, enabled=False, interrupted_before=0))
        self.assertIsNone(pcm_event(payload, enabled=True, interrupted_before=12))
        with self.assertRaises(ValueError):
            pcm_event(
                {"audio_event": {"audio_base_64": "aQ==", "event_id": 13}},
                enabled=True,
                interrupted_before=0,
            )

    def test_tool_result_has_documented_wire_shape(self):
        self.assertEqual(
            tool_result("call_1", "waiting", error=True),
            {
                "type": "client_tool_result",
                "tool_call_id": "call_1",
                "result": "waiting",
                "is_error": True,
            },
        )
