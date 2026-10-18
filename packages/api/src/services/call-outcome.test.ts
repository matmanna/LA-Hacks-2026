import {
  CallOutcomeSchema,
  checkDisclosure,
  DISCLOSURE,
} from "@betterbill/core";
import { describe, expect, it } from "vitest";

import { buildOutcome } from "./call-outcome";
import type { Conversation } from "./elevenlabs";

// Synthetic conversation shaped like ElevenLabs' documented response.
const conversation: Conversation = {
  status: "done",
  transcript: [
    {
      role: "agent",
      message: `${DISCLOSURE} Is it okay to continue?`,
      time_in_call_secs: 0,
    },
    { role: "user", message: "Yes, go ahead.", time_in_call_secs: 5 },
    { role: "agent", message: null, time_in_call_secs: 6 },
    {
      role: "user",
      message: "Your reference number is R-1001.",
      time_in_call_secs: 40,
    },
  ],
  analysis: {
    transcript_summary: "Billing will review the duplicate lab charge.",
    data_collection_results: {
      reference_number: { value: "R-1001" },
      billing_response: { value: "They will review it." },
      next_step: { value: "Wait for a corrected statement." },
      follow_up_date: { value: "" },
    },
  },
  metadata: { call_duration_secs: 95 },
};

describe("buildOutcome", () => {
  it("keeps only what the conversation reports", () => {
    const outcome = buildOutcome(conversation);
    expect(CallOutcomeSchema.safeParse(outcome).success).toBe(true);
    expect(outcome).toMatchObject({
      status: "done",
      summary: "Billing will review the duplicate lab charge.",
      referenceNumber: "R-1001",
      billingResponse: "They will review it.",
      nextStep: "Wait for a corrected statement.",
      followUpDate: null,
      durationSecs: 95,
      source: "live",
    });
    expect(outcome.transcript).toHaveLength(3);
    expect(checkDisclosure(outcome.transcript)).toBe(true);
  });

  it("reads what billing agreed to, as yes, no, or not said", () => {
    const outcome = buildOutcome({
      ...conversation,
      analysis: {
        data_collection_results: {
          hold_agreed: { value: true },
          itemized_promised: { value: "false" },
          records_process: {
            value: "Fax the release form to medical records.",
          },
        },
      },
    });
    expect(outcome).toMatchObject({
      holdAgreed: true,
      itemizedPromised: false,
      recordsProcess: "Fax the release form to medical records.",
    });
    expect(buildOutcome(conversation)).toMatchObject({
      holdAgreed: null,
      itemizedPromised: null,
      recordsProcess: null,
    });
  });

  it("leaves facts empty when the analysis is missing", () => {
    const outcome = buildOutcome({ status: "done", transcript: [] });
    expect(outcome).toMatchObject({
      summary: "Call finished.",
      referenceNumber: null,
      nextStep: null,
      durationSecs: null,
    });
  });

  it("marks a short call where the person said no as no_consent", () => {
    const outcome = buildOutcome({
      status: "done",
      transcript: [
        { role: "agent", message: DISCLOSURE, time_in_call_secs: 0 },
        { role: "user", message: "No, thank you.", time_in_call_secs: 4 },
      ],
      metadata: { call_duration_secs: 8 },
    });
    expect(outcome.status).toBe("no_consent");
  });

  it("keeps non-string analysis values as text", () => {
    const outcome = buildOutcome({
      status: "done",
      analysis: {
        data_collection_results: { reference_number: { value: 1234 } },
      },
    });
    expect(outcome.referenceNumber).toBe("1234");
  });
});
