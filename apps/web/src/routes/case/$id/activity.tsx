import { ActivityTimeline } from "@betterbill/ui/components/bb/activity-timeline";
import { CallTranscriptCard } from "@betterbill/ui/components/bb/call-transcript-card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppBar } from "@/components/app-bar";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/case/$id/activity")({
  head: () => ({
    meta: [
      { title: "Your case activity, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

// call.status returns the transcript as "agent:" / "billing:" lines and the
// outcome as a CallOutcome JSON string.
function parseTurns(transcript: string | null) {
  if (!transcript) return [];
  return transcript.split("\n").flatMap((line) => {
    const match = /^(agent|billing):\s*(.+)$/i.exec(line.trim());
    return match
      ? [
          {
            speaker: match[1].toLowerCase() as "agent" | "billing",
            text: match[2],
          },
        ]
      : [];
  });
}

function parseOutcome(outcome: string | null) {
  if (!outcome) return null;
  try {
    return JSON.parse(outcome) as {
      referenceNumber: string | null;
      nextStep: string | null;
      followUpDate: string | null;
      source: "live" | "recorded_fallback";
      recordedAt?: string;
    };
  } catch {
    return null;
  }
}

const CARD_STATUS = {
  ringing: "ringing",
  in_progress: "in_progress",
  done: "ended",
  no_consent: "ended",
  failed: "failed",
} as const;

const LIVE_CALL = new Set(["ringing", "in_progress"]);

function ActivityPage() {
  const { id } = Route.useParams();
  const events = useQuery(
    orpc.event.list.queryOptions({ input: { caseId: id } }),
  );
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const callAction = detail.data?.actions
    .filter((a) => a.kind === "call" && a.approvedAt !== null)
    .at(-1);
  const call = useQuery({
    ...orpc.call.status.queryOptions({
      input: { callId: `call-${callAction?.id ?? ""}` },
    }),
    enabled: Boolean(callAction),
    refetchInterval: (query) =>
      LIVE_CALL.has(query.state.data?.status ?? "") ? 3000 : false,
  });

  const pending = detail.data?.actions.find(
    (a) => a.approvedAt !== null && a.outcome === null && a.kind !== "call",
  );
  const turns = parseTurns(call.data?.transcript ?? null);
  const outcome = parseOutcome(call.data?.outcome ?? null);
  const cardStatus =
    CARD_STATUS[call.data?.status as keyof typeof CARD_STATUS] ?? null;
  const recorded = outcome?.source === "recorded_fallback";

  return (
    <>
      <AppBar title="Activity" back={`/case/${id}`} />
      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6 md:px-8">
        <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
          Your case activity
        </h1>
        {events.isLoading ? (
          <p className="text-muted-foreground">Loading activity</p>
        ) : (
          <ActivityTimeline
            current={
              pending
                ? {
                    title:
                      pending.kind === "call"
                        ? "Waiting for the billing office"
                        : "Waiting for a reply",
                    detail: `To ${pending.recipient}`,
                    icon: pending.kind === "call" ? "phone" : "mail",
                  }
                : undefined
            }
            events={(events.data ?? []).map((e) => ({
              id: e.id,
              at: e.at,
              summary: e.summary,
              actor: e.actor,
              done: true,
            }))}
          />
        )}
        {callAction && cardStatus ? (
          <div className="space-y-2" aria-live="polite">
            <CallTranscriptCard
              status={cardStatus}
              recorded={recorded}
              turns={turns}
              outcome={
                outcome
                  ? {
                      referenceNumber: outcome.referenceNumber ?? undefined,
                      nextStep: outcome.nextStep ?? undefined,
                      followUpBy: outcome.followUpDate ?? undefined,
                    }
                  : undefined
              }
            />
            {recorded ? (
              <p className="text-muted-foreground text-xs leading-4">
                Recorded rehearsal call
                {outcome?.recordedAt
                  ? ` from ${new Date(outcome.recordedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                  : ""}
                . The live call did not connect.
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="pb-6 text-center text-muted-foreground text-xs leading-4">
          BetterBill is informational, not legal or medical advice.
        </p>
      </main>
    </>
  );
}
