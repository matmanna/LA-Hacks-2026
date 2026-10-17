import { Skeleton } from "@betterbill/ui/components/skeleton";
import { cn } from "@betterbill/ui/lib/utils";

import { Money } from "./money";

type BalanceCardProps = {
  hospitalName: string;
  billedCents: number;
  fairBalanceCents: number;
  fairBalanceLowCents?: number;
  lessThanBilledCents: number;
  isEstimate: boolean;
  loading?: boolean;
  className?: string;
};

const ROOT = "rounded-2xl bg-ink p-5 text-white shadow-card lg:p-6";

export function BalanceCard({
  hospitalName,
  billedCents,
  fairBalanceCents,
  fairBalanceLowCents,
  lessThanBilledCents,
  isEstimate,
  loading = false,
  className,
}: BalanceCardProps) {
  if (loading) {
    return (
      <section
        className={cn(ROOT, className)}
        aria-label="Your fair balance"
        aria-busy="true"
      >
        <Skeleton className="h-7 w-40 bg-white/10" />
        <Skeleton className="mt-3 h-[52px] w-48 bg-white/10" />
        <Skeleton className="mt-3 h-6 w-44 bg-white/10" />
        <Skeleton className="mt-4 h-4 w-full bg-white/10" />
      </section>
    );
  }

  const hasSavings = lessThanBilledCents > 0;

  return (
    <section
      className={cn(ROOT, className)}
      aria-label={`Your fair balance at ${hospitalName}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[22px] text-white/90 leading-7">
          Your fair balance
        </h2>
        {isEstimate ? (
          <span className="rounded-full bg-amber-soft px-2.5 py-1 font-medium text-amber-ink text-xs">
            Estimate
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-serif text-[48px] text-mint tabular-nums leading-[52px] tracking-[-0.01em] lg:text-[56px] lg:leading-[60px]">
        <Money cents={fairBalanceCents} cents_display="hide" />
      </p>
      {hasSavings ? (
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 font-medium text-mint-ink text-xs">
          <Money cents={lessThanBilledCents} sign="negative" /> less than billed
        </p>
      ) : null}
      <p className="mt-4 text-white/70 text-xs leading-4">
        {hasSavings ? (
          <>
            Billed <Money cents={billedCents} cents_display="inline" />.
            {fairBalanceLowCents !== undefined ? (
              <>
                {" "}
                As low as{" "}
                <Money cents={fairBalanceLowCents} cents_display="hide" /> if
                every flag holds.
              </>
            ) : null}
          </>
        ) : (
          "We didn't find anything to lower yet."
        )}
      </p>
    </section>
  );
}
