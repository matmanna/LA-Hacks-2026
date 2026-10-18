import unittest

from betterbill_voice.floor import SpeechFloor


class SpeechFloorTests(unittest.TestCase):
    def test_initial_advocacy_remains_available_until_handoff(self):
        floor = SpeechFloor()
        self.assertTrue(floor.can_output)
        self.assertTrue(floor.begin_response())
        floor.complete_response()
        self.assertTrue(floor.can_output)

    def test_patient_partial_immediately_latches_quiet_without_grant(self):
        floor = SpeechFloor()
        decision = floor.observe("patient", "Advocate, help", final=False)
        self.assertEqual((decision.action, decision.source), ("yield", "patient_partial"))
        self.assertTrue(floor.protected)
        self.assertTrue(floor.quiet)
        self.assertFalse(floor.can_output)
        self.assertFalse(floor.begin_response())

    def test_empty_audio_updates_do_not_yield_or_grant(self):
        floor = SpeechFloor()
        for role in ("patient", "hospital"):
            self.assertEqual(floor.observe(role, "  ", final=False).action, "ignore")
            self.assertEqual(floor.observe(role, "", final=True).action, "ignore")
        self.assertTrue(floor.can_output)

    def test_patient_identity_reply_stays_quiet(self):
        for text in ("Yes", "Alex Morgan", "My date of birth is April twelfth", "Thank you"):
            with self.subTest(text=text):
                floor = SpeechFloor()
                self.assertEqual(floor.observe("patient", text, final=True).action, "yield")
                self.assertFalse(floor.can_output)
                self.assertFalse(floor.begin_response())

    def test_only_finalized_direct_patient_requests_grant_one_response(self):
        for text in (
            "Advocate, help me",
            "BetterBill, could you explain that charge?",
            "Hey Advocate, please continue.",
            "Better Bill, I have a question about this.",
            "Advocate, what does that mean?",
        ):
            with self.subTest(text=text):
                floor = SpeechFloor()
                floor.observe("patient", text, final=False)
                self.assertFalse(floor.can_output)
                decision = floor.observe("patient", text, final=True)
                self.assertEqual((decision.action, decision.source), ("grant", "patient_request"))
                self.assertFalse(floor.can_output)
                self.assertTrue(floor.begin_response())
                self.assertTrue(floor.can_output)
                self.assertFalse(floor.begin_response())
                floor.complete_response()
                self.assertFalse(floor.can_output)
                self.assertFalse(floor.begin_response())

    def test_mentions_negations_and_unrelated_addresses_never_grant(self):
        for text in (
            "Can we ask the advocate later?",
            "My advocate can help explain that.",
            "Advocate, the name is Alex Morgan.",
            "Advocate, don't continue yet.",
            "BetterBill, I do not need help.",
            "Advocate, please help no one right now.",
            "Advocate help is something I may need later.",
            "BetterBill, thanks for helping.",
            "BetterBill, can you verify my name?",
            "Advocate, what a nice day.",
        ):
            with self.subTest(text=text):
                floor = SpeechFloor()
                self.assertEqual(floor.observe("patient", text, final=True).action, "yield")
                self.assertFalse(floor.begin_response())

    def test_staff_verification_and_direct_patient_requests_yield_conservatively(self):
        for text in (
            "Can you verify the patient's date of birth?",
            "What is your full name?",
            "I need to speak directly with the patient.",
            "May I verify your identity?",
            "Please have the patient answer this.",
            "What is your DOB?",
            "What's your birthday?",
            "When were you born?",
            "Can you confirm your address?",
            "I need the patient's authorization to speak to you.",
            "Can the patient authorize you to discuss this?",
            "What is the patient's name?",
        ):
            with self.subTest(text=text):
                floor = SpeechFloor()
                decision = floor.observe("hospital", text, final=False)
                self.assertEqual(
                    (decision.action, decision.source), ("yield", "staff_verification")
                )
                self.assertFalse(floor.can_output)

    def test_staff_billing_questions_allow_initial_advocacy_but_never_resume(self):
        floor = SpeechFloor()
        for text in ("Which charge are you asking about?", "Advocate, help explain this."):
            self.assertEqual(floor.observe("hospital", text, final=True).action, "ignore")
            self.assertTrue(floor.can_output)
        floor.yield_floor("handoff")
        self.assertEqual(
            floor.observe("hospital", "Advocate, please continue.", final=True).action,
            "yield",
        )
        self.assertFalse(floor.begin_response())

    def test_unknown_and_mixed_roles_cannot_authorize_output(self):
        floor = SpeechFloor()
        floor.yield_floor("handoff")
        for role in ("mixed", "user", "agent", "", "staff"):
            decision = floor.observe(role, "Advocate, help me", final=True)
            self.assertEqual(decision.action, "ignore")
            self.assertFalse(floor.begin_response())

    def test_agent_handoff_announcement_yields_even_without_tool(self):
        for text in (
            "I'll step back and let you two talk directly.",
            "I will stay quiet while you verify the patient's details.",
            "I'll let the patient answer directly.",
        ):
            with self.subTest(text=text):
                floor = SpeechFloor()
                decision = floor.observe_agent(text)
                self.assertEqual((decision.action, decision.source), ("yield", "agent_handoff"))
                self.assertFalse(floor.can_output)
        floor = SpeechFloor()
        self.assertEqual(
            floor.observe_agent("Please review the duplicate charge.").action, "ignore"
        )
        self.assertTrue(floor.can_output)

    def test_duplicate_commit_cannot_reuse_consumed_permission(self):
        floor = SpeechFloor()
        text = "Advocate, help me"
        floor.observe("patient", text, final=True, utterance_id="p1")
        self.assertTrue(floor.begin_response())
        floor.complete_response()
        duplicate = floor.observe("patient", text, final=True, utterance_id="p1")
        self.assertEqual(duplicate.action, "ignore")
        self.assertFalse(floor.begin_response())
        floor.observe("patient", text, final=True, utterance_id="p2")
        self.assertTrue(floor.begin_response())

    def test_duplicate_commit_without_provider_id_is_ignored(self):
        floor = SpeechFloor()
        text = "Advocate, help me"
        floor.observe("patient", text, final=True)
        self.assertTrue(floor.begin_response())
        duplicate = floor.observe("patient", "  ADVOCATE, HELP ME  ", final=True)
        self.assertEqual(duplicate.action, "ignore")
        self.assertTrue(floor.can_output)
        floor.complete_response()
        self.assertFalse(floor.begin_response())

    def test_any_new_patient_speech_revokes_pending_or_open_answer(self):
        for start_response in (False, True):
            with self.subTest(start_response=start_response):
                floor = SpeechFloor()
                floor.observe("patient", "Advocate, help me", final=True)
                if start_response:
                    self.assertTrue(floor.begin_response())
                floor.observe("patient", "Actually", final=False)
                self.assertFalse(floor.can_output)
                self.assertFalse(floor.begin_response())

    def test_staff_verification_revokes_an_open_requested_answer(self):
        floor = SpeechFloor()
        floor.observe("patient", "Advocate, explain that", final=True)
        self.assertTrue(floor.begin_response())
        floor.observe("hospital", "First, what is your date of birth?", final=True)
        self.assertFalse(floor.can_output)
        self.assertFalse(floor.begin_response())

    def test_any_staff_speech_revokes_a_patient_requested_answer(self):
        for final in (False, True):
            with self.subTest(final=final):
                floor = SpeechFloor()
                floor.observe("patient", "Advocate, explain that", final=True)
                self.assertTrue(floor.begin_response())
                decision = floor.observe("hospital", "Let me check that charge", final=final)
                self.assertEqual((decision.action, decision.source), ("yield", "staff_speech"))
                self.assertFalse(floor.can_output)
                self.assertFalse(floor.begin_response())

    def test_ended_floor_cannot_be_reopened(self):
        floor = SpeechFloor()
        floor.end()
        self.assertFalse(floor.can_output)
        self.assertEqual(floor.observe("patient", "Advocate, help me", final=True).action, "ignore")
        self.assertFalse(floor.begin_response())

    def test_final_explicit_participation_refusal_withdraws_for_either_role(self):
        for role in ("patient", "hospital"):
            for text in (
                "Please stop recording.",
                "Don't transcribe this call.",
                "Do not record me.",
                "I don't consent to recording.",
                "I do not consent to AI.",
                "Advocate, please leave the call.",
                "No AI allowed.",
                "No bots allowed.",
            ):
                with self.subTest(role=role, text=text):
                    floor = SpeechFloor()
                    floor.yield_floor("existing_handoff")
                    decision = floor.observe(role, text, final=True)
                    self.assertEqual(
                        (decision.action, decision.source), ("withdraw", "participation_declined")
                    )
                    self.assertFalse(floor.can_output)
                    self.assertFalse(floor.begin_response())

    def test_partial_refusals_and_ordinary_no_do_not_withdraw(self):
        for role in ("patient", "hospital"):
            for text, final in (
                ("Please stop recording", False),
                ("No", True),
                ("Stop", True),
                ("Don't stop recording", True),
                ("We should not ask the advocate to leave", True),
                ("I don't mind recording", True),
            ):
                with self.subTest(role=role, text=text, final=final):
                    floor = SpeechFloor()
                    self.assertNotEqual(floor.observe(role, text, final=final).action, "withdraw")


if __name__ == "__main__":
    unittest.main()
