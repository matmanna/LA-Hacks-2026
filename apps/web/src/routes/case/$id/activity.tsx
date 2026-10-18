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

// A owns the transcript format. Until A defines turns, only lines that start
// with "agent:" or "billing:" are shown as turns.
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

function ActivityPage() {
  const { id } = Route.useParams();
  const events = useQuery(
    orpc.event.list.queryOptions({ input: { caseId: id } }),
  );
  const detail = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const callAction = detail.data?.actions.find((a) => a.kind === "call");
  const call = useQuery({
    ...orpc.call.status.queryOptions({
      input: { callId: `call-${callAction?.id ?? ""}` },
    }),
    enabled: Boolean(callAction),
  });

  const pending = detail.data?.actions.find(
    (a) => a.approvedAt !== null && a.outcome === null,
  );
  const turns = parseTurns(call.data?.transcript ?? null);

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
        {callAction && turns.length > 0 ? (
          <CallTranscriptCard
            status={call.data?.outcome ? "ended" : "in_progress"}
            turns={turns}
            outcome={
              call.data?.outcome ? { nextStep: call.data.outcome } : undefined
            }
          />
        ) : null}
        <p className="pb-6 text-center text-muted-foreground text-xs leading-4">
          BetterBill is informational, not legal or medical advice.
        </p>
      </main>
    </>
  );
}
