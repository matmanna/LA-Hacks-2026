import { cn } from "@betterbill/ui/lib/utils";

type CallTranscriptCardProps = {
  status: "ringing" | "in_progress" | "ended" | "failed";
  recorded?: boolean;
  turns: { speaker: "agent" | "billing"; text: string; at?: string }[];
  outcome?: {
    referenceNumber?: string;
    nextStep?: string;
    followUpBy?: string;
  };
  className?: string;
};

const STATUS = {
  ringing: "Calling",
  in_progress: "On the call",
  ended: "Call ended",
  failed: "Call didn't connect",
} as const;

const SPEAKER = { agent: "BetterBill assistant", billing: "Billing office" };

export function CallTranscriptCard({
  status,
  recorded,
  turns,
  outcome,
  className,
}: CallTranscriptCardProps) {
  const rows: [string, string | undefined][] = outcome
    ? [
        ["Reference number", outcome.referenceNumber],
        ["Next step", outcome.nextStep],
        ["Follow up by", outcome.followUpBy],
      ]
    : [];
  return (
    <section
      aria-label="Call with the billing office"
      className={cn(
        "space-y-4 rounded-2xl border bg-card p-5 shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold text-lg leading-6">
          Call with the billing office
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-xs">
          {STATUS[status]}
        </span>
        {recorded ? (
          <span className="rounded-full bg-amber-soft px-2.5 py-1 font-medium text-amber-ink text-xs">
            Recorded call, labelled
          </span>
        ) : null}
      </div>
      <div
        className="space-y-3"
        aria-live={status === "in_progress" ? "polite" : undefined}
      >
        {turns.map((turn) => {
          const key = turn.at ?? `${turn.speaker}:${turn.text}`;
          return (
            <div key={key}>
              <p className="font-medium text-muted-foreground text-xs leading-4">
                {SPEAKER[turn.speaker]}
              </p>
              <p className="text-sm leading-6">{turn.text}</p>
            </div>
          );
        })}
      </div>
      {outcome ? (
        <dl className="space-y-2 rounded-xl bg-mint-soft p-4 text-mint-ink text-sm leading-5">
          {rows.map(([label, value]) =>
            value ? (
              <div key={label}>
                <dt className="font-medium">{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      ) : null}
    </section>
  );
}
