import { cn } from "@betterbill/ui/lib/utils";
import { ChevronRight, CircleAlert } from "lucide-react";

import { Money } from "./money";
import { TIER_LABELS, type Tier, TierBadge } from "./tier-badge";

type FlagRowProps = {
  flag: {
    id: string;
    title: string;
    explanation: string;
    amountCents: number;
    tier: Tier;
    lever: string;
  };
  amountPrefix?: "none" | "up_to";
  onOpen: (flagId: string) => void;
  className?: string;
};

function spokenAmount(cents: number) {
  const dollars = Math.trunc(cents / 100);
  const rest = cents % 100;
  return `${dollars.toLocaleString("en-US")} dollars${rest ? ` and ${rest} cents` : ""}`;
}

export function FlagRow({
  flag,
  amountPrefix = "none",
  onOpen,
  className,
}: FlagRowProps) {
  const spoken = `${amountPrefix === "up_to" ? "up to " : ""}${spokenAmount(flag.amountCents)}`;
  return (
    <button
      type="button"
      data-sentry-block
      onClick={() => onOpen(flag.id)}
      aria-label={`${flag.title}. ${TIER_LABELS[flag.tier]}. ${spoken}. Show evidence`}
      className={cn(
        "group flex min-h-[64px] w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-coral-soft text-destructive">
        <CircleAlert className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-base text-foreground leading-6">
          {flag.title}
        </span>
        <span className="line-clamp-2 block text-muted-foreground text-sm leading-5">
          {flag.explanation}
        </span>
        <TierBadge tier={flag.tier} className="mt-2" />
      </span>
      <span className="flex shrink-0 items-start gap-1">
        <span className="text-right">
          {amountPrefix === "up_to" ? (
            <span className="block text-right text-muted-foreground text-xs">
              Up to
            </span>
          ) : null}
          <Money
            cents={flag.amountCents}
            className="font-semibold text-base text-coral-ink leading-6"
          />
        </span>
        <ChevronRight
          className="mt-0.5 size-5 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
