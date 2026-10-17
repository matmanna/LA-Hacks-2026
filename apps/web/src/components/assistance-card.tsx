import { TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Card, CardTitle } from "@betterbill/ui/components/card";

type Assistance = {
  status: "likely" | "possible" | "unlikely" | "unknown";
  quote?: string;
  sourceUrl?: string;
  capturedAt?: string;
};

const STATUS_LABEL: Record<Assistance["status"], string> = {
  likely: "Likely",
  possible: "Possible",
  unlikely: "Unlikely",
  unknown: "Not checked yet",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function AssistanceCard({
  assistance,
  onCheck,
}: {
  assistance: Assistance;
  onCheck?: () => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardTitle>You might qualify for help</CardTitle>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-medium text-xs">
          {STATUS_LABEL[assistance.status]}
        </span>
      </div>
      <TierBadge tier="estimate" className="self-start" />
      {assistance.quote ? (
        <blockquote className="border-primary border-l-2 pl-3 text-sm italic leading-5">
          {assistance.quote}
        </blockquote>
      ) : null}
      {assistance.sourceUrl ? (
        <p className="text-muted-foreground text-xs leading-4">
          Source:{" "}
          <a
            href={assistance.sourceUrl}
            className="text-primary underline underline-offset-4"
            rel="noreferrer"
            target="_blank"
          >
            hospital policy
          </a>
          {assistance.capturedAt
            ? `, captured ${dateFormat.format(new Date(assistance.capturedAt))}`
            : null}
        </p>
      ) : null}
      <Button
        variant="secondary"
        onClick={onCheck}
        className="w-full sm:w-auto"
      >
        Check if I qualify
      </Button>
    </Card>
  );
}
