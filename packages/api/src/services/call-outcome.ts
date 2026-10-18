// Turns a finished ElevenLabs conversation into the call outcome (ticket A-09).
// Only facts the conversation reports; nothing is guessed or filled in.
import type { CallOutcome } from "@betterbill/core";

import type { Conversation } from "./elevenlabs";

function field(conv: Conversation, key: string): string | null {
  const value = conv.analysis?.data_collection_results?.[key]?.value;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

export function buildOutcome(conv: Conversation): CallOutcome {
  const transcript = (conv.transcript ?? []).flatMap((t) =>
    t.message
      ? [
          {
            role: t.role === "agent" ? ("agent" as const) : ("user" as const),
            message: t.message,
            t: t.time_in_call_secs ?? 0,
          },
        ]
      : [],
  );
  const durationSecs = conv.metadata?.call_duration_secs ?? null;
  const firstReply = transcript.find((t) => t.role === "user");
  const declined =
    firstReply !== undefined &&
    /\bno\b/i.test(firstReply.message) &&
    durationSecs !== null &&
    durationSecs < 20;

  return {
    status: declined ? "no_consent" : "done",
    summary: conv.analysis?.transcript_summary?.trim() || "Call finished.",
    referenceNumber: field(conv, "reference_number"),
    billingResponse: field(conv, "billing_response"),
    nextStep: field(conv, "next_step"),
    followUpDate: field(conv, "follow_up_date"),
    durationSecs,
    transcript,
    recorded: true,
    source: "live",
  };
}
