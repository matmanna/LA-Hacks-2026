import unittest

from betterbill_voice.floor import SpeechFloor


class SpeechFloorTests(unittest.TestCase):
    def test_finalized_human_turns_allow_ongoing_advocacy_without_a_wake_phrase(self):
        floor = SpeechFloor()
        for index, (role, text) in enumerate(
            (
                ("hospital", "Yes, you may continue."),
                ("patient", "I am here and authorize you to discuss my bill."),
                ("hospital", "Thanks, the account is open. What can I help with?"),
                ("hospital", "I can send the itemized bill tomorrow."),
                ("patient", "What does that mean?"),
            )
        ):
            with self.subTest(role=role, text=text):
                decision = floor.observe(role, text, final=True, utterance_id=str(index))
                self.assertEqual((decision.action, decision.source), ("grant", "human_turn"))
                self.assertTrue(floor.begin_response())
                self.assertFalse(floor.begin_response())
                floor.complete_response()
                self.assertTrue(floor.can_output)

    def test_partial_speech_never_clears_or_reopens_the_current_speech_gate(self):
        for role in ("patient", "hospital"):
            floor = SpeechFloor()
            self.assertTrue(floor.begin_response())
            for text in ("Actually", "Can you verify the patient", "Please stop recording"):
                with self.subTest(role=role, text=text):
                    self.assertEqual(floor.observe(role, text).action, "ignore")
                    self.assertTrue(floor.can_output)
                    self.assertFalse(floor.begin_response())
            floor.yield_floor("pause_tool")
            floor.observe(role, "Please continue", final=False)
            self.assertFalse(floor.can_output)

    def test_temporary_pause_releases_on_the_next_finalized_human_turn(self):
        for role in ("patient", "hospital"):
            floor = SpeechFloor()
            floor.yield_floor("pause_tool")
            self.assertFalse(floor.begin_response())
            floor.observe(role, "We are ready to continue.", final=True)
            self.assertTrue(floor.can_output)
            self.assertTrue(floor.begin_response())
            floor.complete_response()
            self.assertTrue(floor.can_output)

    def test_generated_handoff_text_does_not_mute_its_own_audio(self):
        floor = SpeechFloor()
        floor.begin_response()
        decision = floor.observe_agent("I'll step back and let the patient answer.")
        self.assertEqual(decision.action, "ignore")
        self.assertTrue(floor.can_output)

    def test_duplicate_finals_are_ignored_but_a_new_utterance_may_repeat_words(self):
        floor = SpeechFloor()
        self.assertEqual(
            floor.observe("hospital", "Yes", final=True, utterance_id="h1").action, "grant"
        )
        self.assertEqual(
            floor.observe("hospital", "YES", final=True, utterance_id="h1").source,
            "duplicate_commit",
        )
        self.assertEqual(
            floor.observe("hospital", "Yes", final=True, utterance_id="h2").action, "grant"
        )
        self.assertEqual(floor.observe("patient", "Thanks", final=True).action, "grant")
        self.assertEqual(
            floor.observe("patient", "  THANKS  ", final=True).source, "duplicate_commit"
        )

    def test_empty_or_untrusted_input_does_not_release_a_pause(self):
        floor = SpeechFloor()
        floor.yield_floor("pause_tool")
        for role, text in (
            ("patient", " "),
            ("hospital", ""),
            ("mixed", "Continue"),
            ("agent", "Continue"),
            ("staff", "Continue"),
        ):
            self.assertEqual(floor.observe(role, text, final=True).action, "ignore")
            self.assertFalse(floor.can_output)

    def test_explicit_final_participation_refusal_permanently_withdraws(self):
        for role in ("patient", "hospital"):
            for text in (
                "Please stop recording.",
                "Don't transcribe this call.",
                "Do not record me.",
                "I don't consent to recording.",
                "I do not consent to AI.",
                "Advocate, please leave the call.",
                "BetterBill, leave.",
                "No AI allowed.",
                "No bots allowed.",
            ):
                with self.subTest(role=role, text=text):
                    floor = SpeechFloor()
                    decision = floor.observe(role, text, final=True)
                    self.assertEqual(
                        (decision.action, decision.source), ("withdraw", "participation_declined")
                    )
                    self.assertFalse(floor.can_output)
                    self.assertFalse(floor.begin_response())
                    self.assertEqual(
                        floor.observe("patient", "Please continue", final=True).action, "ignore"
                    )

    def test_negations_and_ordinary_no_are_not_participation_refusals(self):
        floor = SpeechFloor()
        for index, text in enumerate(
            (
                "No",
                "Stop",
                "Don't stop recording",
                "We should not ask the advocate to leave",
                "I don't mind recording",
                "Advocate, I don't understand that bill",
            )
        ):
            self.assertEqual(
                floor.observe("patient", text, final=True, utterance_id=str(index)).action, "grant"
            )
        self.assertFalse(floor.ended)

    def test_ended_floor_cannot_be_reopened(self):
        floor = SpeechFloor()
        floor.end()
        self.assertFalse(floor.can_output)
        self.assertFalse(floor.begin_response())
        self.assertEqual(floor.observe("hospital", "Continue", final=True).action, "ignore")


if __name__ == "__main__":
    unittest.main()
