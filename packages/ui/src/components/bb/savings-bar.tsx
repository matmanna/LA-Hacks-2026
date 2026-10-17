import { Button } from "@betterbill/ui/components/button";
import { cn } from "@betterbill/ui/lib/utils";

import { Money } from "./money";

type SavingsBarProps = {
  confirmedCents: number;
  potentialLowCents: number;
  potentialHighCents: number;
  actionLabel:
    | "Send the letter"
    | "Call for me"
    | "Looks right"
    | "Check my bill";
  onAction: () => void;
  actionDisabled?: boolean;
  className?: string;
};

export function SavingsBar({
  confirmedCents,
  potentialLowCents,
  potentialHighCents,
  actionLabel,
  onAction,
  actionDisabled,
  className,
}: SavingsBarProps) {
  return (
    <section
      aria-label="Savings summary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-mint-ink text-sm leading-5">
            <Money cents={confirmedCents} cents_display="hide" /> confirmed
          </p>
          {potentialHighCents > 0 ? (
            <p className="text-muted-foreground text-xs leading-4">
              + <Money cents={potentialLowCents} cents_display="hide" /> to{" "}
              <Money cents={potentialHighCents} cents_display="hide" /> possible
              (estimate)
            </p>
          ) : null}
        </div>
        <Button
          className="h-12 rounded-xl px-5"
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      </div>
    </section>
  );
}
