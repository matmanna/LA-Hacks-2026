import asyncio
import base64
import unittest
from unittest.mock import patch

import test_patient_floor


class DemoStreamTests(unittest.IsolatedAsyncioTestCase):
    controller = test_patient_floor.PatientFloorTests.controller
    audio = test_patient_floor.PatientFloorTests.audio
    complete = test_patient_floor.PatientFloorTests.complete

    async def test_silent_input_clock_continues_during_reply_without_interrupting_it(self):
        c = self.controller()
        c.ready.set()
        task = asyncio.create_task(c.keep_listening())
        try:
            await asyncio.sleep(0.12)
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        chunks = [call.args[0] for call in c.ws.send_json.await_args_list]
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(
            all(base64.b64decode(chunk["user_audio_chunk"]) == bytes(3200) for chunk in chunks)
        )

    async def test_watchdog_allows_continued_audio_but_detects_a_stalled_reply(self):
        c = self.controller()
        c.response_activity = 100

        async def progress(_):
            c.response_activity = 200
            c.response_serial += 1

        with (
            patch("betterbill_voice.controller.asyncio.sleep", side_effect=progress),
            patch("betterbill_voice.controller.time.monotonic", return_value=200),
        ):
            c.watch_response()
            await asyncio.gather(*list(c.tasks))
        c = self.controller()
        c.response_activity = 100
        with (
            patch("betterbill_voice.controller.asyncio.sleep", return_value=None),
            patch("betterbill_voice.controller.time.monotonic", return_value=200),
        ):
            c.watch_response()
            result = await asyncio.gather(*list(c.tasks), return_exceptions=True)
        self.assertIsInstance(result[0], TimeoutError)
        await asyncio.gather(*list(c.tasks), return_exceptions=True)
        self.assertFalse(c.done.is_set())

    async def test_opening_streams_before_response_completion_and_survives_partials(self):
        c = self.controller()
        await self.audio(c)
        self.assertEqual(c.audio_queue.qsize(), 1)
        for role in ("hospital", "patient"):
            await c.on_transcript(role, "Hello", final=False)
        self.assertEqual(c.audio_queue.qsize(), 1)
        self.assertTrue(c.state.can_output)
        c.ws.send_json.assert_not_awaited()

    async def test_final_turn_waits_for_audible_reply_then_continues_without_magic_phrase(self):
        c = self.controller()
        await self.audio(c)
        await c.on_transcript("hospital", "Yes, what can I help with?", final=True)
        c.ws.send_json.assert_not_awaited()
        await self.complete(c)
        await asyncio.sleep(0)
        c.ws.send_json.assert_not_awaited()
        c.audio_queue.get_nowait()
        c.audio_queue.task_done()
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        self.assertEqual(c.ws.send_json.call_args.args[0]["type"], "user_message")
        self.assertIn("hospital:", c.ws.send_json.call_args.args[0]["text"])
        self.assertTrue(c.state.can_output)


if __name__ == "__main__":
    unittest.main()
