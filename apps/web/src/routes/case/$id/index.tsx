import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@betterbill/ui/components/accordion";
import { BalanceCard } from "@betterbill/ui/components/bb/balance-card";
import { FlagRow } from "@betterbill/ui/components/bb/flag-row";
import { SavingsBar } from "@betterbill/ui/components/bb/savings-bar";
import type { Tier } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Card } from "@betterbill/ui/components/card";
import { Skeleton } from "@betterbill/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppBar } from "@/components/app-bar";
import { AssistanceCard } from "@/components/assistance-card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/case/$id/")({
  head: () => ({
    meta: [
      { title: "Your bill check, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CasePage,
});

const TIER_ORDER: Tier[] = ["confirmed", "published", "rule", "estimate"];
const VISIBLE_FLAGS = 3;

function CasePage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return <CaseSkeleton />;

  if (isError || !data?.audit || !data.bill) {
    return (
      <>
        <AppBar title="Your bill check" back="/check" />
        <main className="mx-auto flex max-w-sm flex-col items-center gap-3 px-5 py-12 text-center">
          <h1 className="font-semibold text-lg leading-6">
            {isError
              ? "Something went wrong on our side"
              : "We can't find that case"}
          </h1>
          <p className="text-muted-foreground text-sm leading-5">
            {isError
              ? "Your bill is safe. Try again in a moment."
              : "It may have been removed."}
          </p>
          {isError ? (
            <Button onClick={() => refetch()}>Try again</Button>
          ) : (
            <Button nativeButton={false} render={<Link to="/check" />}>
              Check a bill
            </Button>
          )}
        </main>
      </>
    );
  }

  const { bill, audit } = data;
  const flags = [...audit.flags].sort(
    (a, b) =>
      TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
      b.amountCents - a.amountCents,
  );
  const shown = showAll ? flags : flags.slice(0, VISIBLE_FLAGS);
  const place = [bill.hospital.city, bill.hospital.state]
    .filter(Boolean)
    .join(", ");
  const comingSoon = () => toast("Coming soon");

  return (
    <>
      <AppBar title="Your bill check" back="/check" />
      <main className="mx-auto max-w-6xl space-y-6 px-5 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] md:px-8">
        <div>
          <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
            {bill.hospital.name}
          </h1>
          {place ? (
            <p className="text-muted-foreground text-sm leading-5">{place}</p>
          ) : null}
        </div>

        <BalanceCard
          hospitalName={bill.hospital.name}
          billedCents={audit.balance.billedCents}
          fairBalanceCents={audit.balance.fairBalanceCents}
          fairBalanceLowCents={audit.balance.fairBalanceLowCents}
          lessThanBilledCents={audit.balance.lessThanBilledCents}
          isEstimate={audit.balance.isEstimate}
        />

        <section aria-labelledby="flags-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="flags-heading"
              className="font-semibold text-[22px] leading-[28px]"
            >
              What looks wrong
            </h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {flags.length} {flags.length === 1 ? "flag" : "flags"}
            </span>
          </div>
          {flags.length > 0 ? (
            <Card className="p-2">
              {shown.map((flag) => (
                <FlagRow
                  key={flag.id}
                  flag={flag}
                  amountPrefix={
                    flag.tier === "published" || flag.tier === "estimate"
                      ? "up_to"
                      : "none"
                  }
                  onOpen={comingSoon}
                />
              ))}
              {flags.length > VISIBLE_FLAGS && !showAll ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAll(true)}
                >
                  See all {flags.length}
                </Button>
              ) : null}
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm leading-5">
              We checked {bill.lines.length} lines and found nothing to flag.
            </p>
          )}
        </section>

        <AssistanceCard
          assistance={audit.savings.assistance}
          onCheck={comingSoon}
        />

        {audit.savings.method.length > 0 ? (
          <Accordion>
            <AccordionItem value="method">
              <AccordionTrigger>How we estimated this</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 pl-5">
                  {audit.savings.method.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        <Link
          to="/case/$id/activity"
          params={{ id }}
          className="flex min-h-14 items-center justify-between rounded-xl border px-4 font-medium text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Activity
          <ChevronRight
            className="size-5 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </Link>

        <p className="mt-10 pb-6 text-center text-muted-foreground text-xs leading-4">
          BetterBill is informational, not legal or medical advice.
        </p>
      </main>
      <SavingsBar
        confirmedCents={audit.savings.confirmedCents}
        potentialLowCents={audit.savings.potentialLowCents}
        potentialHighCents={audit.savings.potentialHighCents}
        actionLabel="Send the letter"
        onAction={comingSoon}
      />
    </>
  );
}

function CaseSkeleton() {
  return (
    <>
      <AppBar title="Your bill check" back="/check" />
      <main className="mx-auto max-w-6xl space-y-6 px-5 pt-4 md:px-8">
        <Skeleton className="h-9 w-64" />
        <BalanceCard
          hospitalName=""
          billedCents={0}
          fairBalanceCents={0}
          lessThanBilledCents={0}
          isEstimate={false}
          loading
        />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </main>
    </>
  );
}
