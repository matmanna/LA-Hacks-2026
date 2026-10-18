import { BillTable } from "@betterbill/ui/components/bb/bill-table";
import type { Tier } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Link } from "@tanstack/react-router";

export type PlansSample = {
  lines: {
    id: string;
    description: string;
    code: string | null;
    serviceDate: string | null;
    chargeCents: number;
  }[];
  flags: {
    id: string;
    lineIds: string[];
    title: string;
    tier: Tier;
    amountCents: number;
  }[];
  totalCents: number;
  events: { id: string; at: string; actor: string; summary: string }[];
};

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function PlansHero({ sample }: { sample: PlansSample | null }) {
  const rows = sample?.lines.slice(0, 4).map((line) => {
    const flag = sample.flags.find((f) => f.lineIds.includes(line.id));
    return { line, flag, savingsCents: flag?.amountCents };
  });

  return (
    <section className="px-5 pt-10 pb-16 md:px-8 lg:pt-20 lg:pb-28">
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-6">
          <p className="font-medium text-muted-foreground text-xs uppercase leading-4 tracking-[0.08em]">
            For self-funded employers, TPAs, and health plans
          </p>
          <h1 className="mt-4 text-balance font-serif text-[40px] leading-[44px] tracking-[-0.01em] lg:text-[64px] lg:leading-[68px]">
            Bill review your members can see.
          </h1>
          <p className="mt-5 max-w-[52ch] text-base text-muted-foreground leading-6 lg:text-lg lg:leading-7">
            BetterBill checks hospital bills line by line and shows the evidence
            behind every flag. Use it before you pay a claim, after you pay, or
            give it to members as a self-serve tool.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              render={<a href="#pilot" />}
              nativeButton={false}
            >
              Book a pilot
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link to="/case/$id" params={{ id: "case-demo" }} />}
            >
              See a sample review
            </Button>
          </div>
        </div>

        {sample && rows ? (
          <div className="mt-12 lg:col-span-6 lg:mt-0">
            <div
              inert
              className="pointer-events-none overflow-hidden rounded-2xl border bg-card shadow-card"
            >
              <BillTable
                rows={rows}
                totalCents={sample.totalCents}
                onOpen={() => {}}
              />
            </div>
            <ul className="mt-4 space-y-1 text-xs tabular-nums leading-4">
              {sample.events.slice(0, 3).map((event) => (
                <li
                  key={event.id}
                  className="grid grid-cols-[64px_64px_1fr] gap-2"
                >
                  <span>{timeFormat.format(new Date(event.at))}</span>
                  <span className="text-muted-foreground">{event.actor}</span>
                  <span>{event.summary}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-muted-foreground text-xs leading-4">
              Sample review. Synthetic data.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
