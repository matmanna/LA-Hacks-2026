import { BalanceCard } from "@betterbill/ui/components/bb/balance-card";
import { FlagRow } from "@betterbill/ui/components/bb/flag-row";
import { Money } from "@betterbill/ui/components/bb/money";
import type { Tier } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Link } from "@tanstack/react-router";

import { useStartSample } from "@/hooks/use-start-sample";

export type HeroSample = {
  hospitalName: string;
  balance: {
    billedCents: number;
    fairBalanceCents: number;
    fairBalanceLowCents: number;
    lessThanBilledCents: number;
    isEstimate: boolean;
  };
  confirmedCents: number;
  flags: {
    id: string;
    title: string;
    explanation: string;
    amountCents: number;
    tier: Tier;
    lever: string;
  }[];
};

export function Hero({ sample }: { sample: HeroSample | null }) {
  const start = useStartSample();

  return (
    <section className="px-5 pt-10 pb-16 md:px-8 lg:py-0 lg:pt-20 lg:pb-28">
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-6">
          <p className="font-medium text-muted-foreground text-xs uppercase leading-4 tracking-[0.08em]">
            Free hospital bill check
          </p>
          <h1 className="mt-4 text-balance font-serif text-[40px] leading-[44px] tracking-[-0.01em] lg:text-[64px] lg:leading-[68px]">
            Your hospital bill, checked{" "}
            <span className="relative inline-block">
              line by line.
              <img
                src="/marks/underline.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1 left-0 w-full"
              />
            </span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-base text-muted-foreground leading-6 lg:text-lg lg:leading-7">
            Snap a photo or paste the text. BetterBill reads every charge, shows
            what looks wrong with the proof, and drafts the letter. Nothing is
            sent until you approve it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link to="/check" />}
            >
              Check my bill
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={start.pending}
              onClick={start.start}
            >
              Try a sample bill
            </Button>
          </div>
          <p className="mt-4 text-muted-foreground text-xs leading-4">
            Free. No account needed to see your results.
          </p>
        </div>

        {sample ? (
          <div className="lg:col-span-5 lg:col-start-8">
            <div className="relative mt-12 rounded-3xl border bg-muted p-4 lg:mt-0 lg:p-6">
              <p className="sr-only">
                Sample result for {sample.hospitalName}: {sample.flags.length}{" "}
                flags, <Money cents={sample.confirmedCents} /> confirmed from
                the bill, balance shown as an estimate.
              </p>
              <div inert className="pointer-events-none">
                <BalanceCard
                  hospitalName={sample.hospitalName}
                  {...sample.balance}
                />
                <div className="mt-4 rounded-2xl border bg-card p-2 shadow-card [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
                  {sample.flags.slice(0, 3).map((flag) => (
                    <FlagRow
                      key={flag.id}
                      flag={flag}
                      amountPrefix={
                        flag.tier === "published" || flag.tier === "estimate"
                          ? "up_to"
                          : "none"
                      }
                      onOpen={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-3 text-muted-foreground text-xs leading-4">
              Sample bill. Synthetic data.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
