import { cn } from "@betterbill/ui/lib/utils";

import { Money } from "./money";

type ComparePriceBarProps = {
  billedCents: number;
  publishedCents: number;
  publishedLabel?: string;
  sourceName: string;
  sourceUrl: string;
  capturedAt: string;
  className?: string;
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ComparePriceBar({
  billedCents,
  publishedCents,
  publishedLabel = "Hospital's published cash price",
  sourceName,
  sourceUrl,
  capturedAt,
  className,
}: ComparePriceBarProps) {
  // Display ratio for the bar width only. Not a savings computation.
  const publishedWidth =
    billedCents > 0
      ? Math.min(100, Math.round((publishedCents / billedCents) * 100))
      : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span>As billed</span>
          <Money cents={billedCents} className="font-semibold" />
        </div>
        <div
          className="mt-2 h-2 w-full rounded-full bg-muted"
          aria-hidden="true"
        >
          <div className="h-2 w-full rounded-full bg-destructive" />
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span>{publishedLabel}</span>
          <Money cents={publishedCents} className="font-semibold" />
        </div>
        <div
          className="mt-2 h-2 w-full rounded-full bg-muted"
          aria-hidden="true"
        >
          <div
            className="h-2 rounded-full bg-mint"
            style={{ width: `${publishedWidth}%` }}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-4">
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          {sourceName} price file
        </a>
        , captured {dateFormat.format(new Date(capturedAt))}.
      </p>
    </div>
  );
}

export function ComparePending() {
  return (
    <p className="text-muted-foreground text-xs leading-4">
      Price capture pending. We only compare against prices we've captured with
      a date.
    </p>
  );
}
