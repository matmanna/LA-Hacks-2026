import { describe, expect, it } from "vitest";

import { transcriptText } from "./call";
import {
  buildConferenceIntroduction,
  CONFERENCE_OPENING,
  type ConferenceStatus,
  canReportConferenceStatus,
  isConferenceScript,
  isPatientFirstConferenceScript,
  PATIENT_CUE,
  patientConnectionForScript,
  renderConferenceScript,
  validConferenceDestinations,
  withConferenceParticipation,
} from "./conference";

const vars = {
  hospital_name: "Example",
  account_last4: "1234",
  disputed_items: "Duplicate test",
  review_topics: "Duplicate test",
  ask: "Please review.",
  patient_name: "Alex Morgan",
  patient_dob: "1990-04-12",
  case_context: "Fictional role-play patient: Alex Morgan, DOB 1990-04-12.",
};

describe("conference approval", () => {
  it("briefs the patient about the hospital and the asks before connecting billing", () => {
    const introduction = buildConferenceIntroduction(vars);
    expect(introduction).toContain("Alex Morgan");
    expect(introduction).toContain("Example");
    expect(introduction).toContain("hold your account");
    expect(introduction).toContain("Advocate, can you help?");
    // The controller refuses over 45 s of audio. 114 words measured 46.7 s,
    // so stay well under with a long hospital name and long service names.
    const long = buildConferenceIntroduction({
      ...vars,
      hospital_name: "Cedars-Sinai Medical Center",
      review_topics:
        "MRI LUMBAR SPINE W/O CONTRAST on September 14, 2026; ".repeat(3),
    });
    expect(long.split(" ").length).toBeLessThan(75);
    expect(
      renderConferenceScript(vars, "+13105550100", "+13105550101"),
    ).toContain(introduction);
  });
  it("binds the browser choice into the exact script without a patient phone", () => {
    const script = renderConferenceScript(vars, "+13105550100", "", "browser");
    expect(patientConnectionForScript(script)).toBe("browser");
    expect(isPatientFirstConferenceScript(script)).toBe(true);
    expect(script).toContain("Keep this browser tab open");
    expect(script).not.toContain("patient test participant at");
    expect(
      patientConnectionForScript(
        renderConferenceScript(vars, "+13105550100", "+13105550101"),
      ),
    ).toBe("phone");
  });
  it("automatically connects billing after the patient introduction without a response gate", () => {
    const script = renderConferenceScript(vars, "+13105550100", "+13105550101");
    expect(script).toContain("automatically call");
    expect(script).not.toMatch(
      /press 1|keypad|hang up when|stays connected and silent/i,
    );
    // Billing hears the request before verification; the patient gets one cue.
    expect(script).toContain(CONFERENCE_OPENING);
    expect(script).toContain(
      "account ending in 1234 at Example. Please review.",
    );
    expect(script).toContain(PATIENT_CUE);
    expect(script).toContain("does not argue charges");
    expect(buildConferenceIntroduction(vars)).toContain("itemized bill");
    expect(buildConferenceIntroduction(vars)).toContain("answer them yourself");
    expect(isPatientFirstConferenceScript(script)).toBe(true);
    expect(isPatientFirstConferenceScript("Patient connection approval:")).toBe(
      false,
    );
    expect(isConferenceScript("Patient connection approval:")).toBe(true);
  });

  it("binds both destinations and the exact invitation disclosure", () => {
    const script = renderConferenceScript(vars, "+13105550100", "+13105550101");
    expect(script).toContain("+13105550100");
    expect(script).toContain("+13105550101");
    expect(script).toContain(buildConferenceIntroduction(vars));
    expect(isConferenceScript(script)).toBe(true);
    expect(isConferenceScript("Ordinary direct call")).toBe(false);
    expect(
      renderConferenceScript(vars, "+13105550100", "+13105550102"),
    ).not.toBe(script);
    expect(
      renderConferenceScript(vars, "+13105550102", "+13105550101"),
    ).not.toBe(script);
  });

  it("requires distinct, valid, allowlisted destinations", () => {
    const allowlist = "+13105550100,+13105550101";
    expect(
      validConferenceDestinations("+13105550100", "+13105550101", allowlist),
    ).toBe(true);
    expect(
      validConferenceDestinations("+13105550100", "+13105550100", allowlist),
    ).toBe(false);
    expect(
      validConferenceDestinations("+13105550100", "+13105550102", allowlist),
    ).toBe(false);
    expect(validConferenceDestinations("123", "456", "123,456")).toBe(false);
  });

  it("does not attribute mixed human audio to billing", () => {
    expect(
      transcriptText([{ role: "user", message: "Yes", t: 1 }], "participant"),
    ).toBe("participant: Yes");
  });

  it("records patient participation without asserting confirmation or attributing mixed speech", () => {
    const result = withConferenceParticipation(
      {
        status: "done",
        summary: "The call ended.",
        referenceNumber: null,
        billingResponse: "Yes",
        holdAgreed: null,
        itemizedPromised: null,
        recordsProcess: null,
        nextStep: null,
        followUpDate: null,
        durationSecs: 40,
        transcript: [],
        recorded: true,
        source: "live",
      },
      true,
    );
    expect(result.summary).toContain("The patient line connected");
    expect(result.summary).toContain("does not confirm a person answered");
    expect(result.summary).toContain("does not establish approval");
    expect(result.billingResponse).toBeNull();
    expect(
      withConferenceParticipation(
        { ...result, summary: "Ended", billingResponse: "Review pending" },
        false,
      ),
    ).toMatchObject({
      billingResponse: "Review pending",
      summary: expect.stringContaining("No patient connection was recorded"),
    });
  });
});

describe("conference lifecycle", () => {
  const order: ConferenceStatus[] = [
    "patient_inviting",
    "patient_joined",
    "patient_briefed",
    "ringing",
    "billing_connected",
    "ready",
  ];
  it("records an unavailable advocate while keeping the human conference active", () => {
    expect(
      canReportConferenceStatus([], "ai_unavailable" as ConferenceStatus),
    ).toBe(false);
    expect(
      canReportConferenceStatus(order, "ai_unavailable" as ConferenceStatus),
    ).toBe(true);
    expect(
      canReportConferenceStatus(
        [...order, "ai_unavailable" as ConferenceStatus],
        "completed",
      ),
    ).toBe(true);
  });
  it("requires patient connection and completed introduction before billing, then allows completion with both present", () => {
    const seen: ConferenceStatus[] = [];
    for (const next of order) {
      for (const later of order.slice(order.indexOf(next) + 1))
        expect(canReportConferenceStatus(seen, later)).toBe(false);
      expect(canReportConferenceStatus(seen, next)).toBe(true);
      seen.push(next);
      expect(canReportConferenceStatus(seen, next)).toBe(false);
    }
    expect(canReportConferenceStatus(seen, "completed")).toBe(true);
  });
  it("stops further progress on patient departure, failure, or terminal completion", () => {
    expect(canReportConferenceStatus([], "patient_left")).toBe(false);
    expect(canReportConferenceStatus(order.slice(0, 2), "patient_left")).toBe(
      true,
    );
    for (const next of order) {
      expect(
        canReportConferenceStatus(
          ["patient_inviting", "patient_joined", "patient_left"],
          next,
        ),
      ).toBe(false);
      expect(canReportConferenceStatus(["failed"], next)).toBe(false);
      expect(canReportConferenceStatus([...order, "completed"], next)).toBe(
        false,
      );
    }
    expect(
      canReportConferenceStatus(
        ["patient_inviting", "patient_joined", "patient_left"],
        "failed",
      ),
    ).toBe(true);
    expect(canReportConferenceStatus([], "completed")).toBe(false);
    expect(
      canReportConferenceStatus(["patient_inviting"], "patient_failed"),
    ).toBe(true);
    expect(canReportConferenceStatus(order, "patient_failed")).toBe(false);
    expect(
      canReportConferenceStatus(
        ["patient_inviting", "patient_failed"],
        "patient_joined",
      ),
    ).toBe(false);
  });
});
