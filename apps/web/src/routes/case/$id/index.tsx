import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@betterbill/ui/components/accordion";
import { BalanceCard } from "@betterbill/ui/components/bb/balance-card";
import { BillTable } from "@betterbill/ui/components/bb/bill-table";
import { EvidenceSheet } from "@betterbill/ui/components/bb/evidence-sheet";
import { FlagRow } from "@betterbill/ui/components/bb/flag-row";
import { Money } from "@betterbill/ui/components/bb/money";
import { SavingsBar } from "@betterbill/ui/components/bb/savings-bar";
import { type Tier, TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { Card, CardTitle } from "@betterbill/ui/components/card";
import { Skeleton } from "@betterbill/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppBar } from "@/components/app-bar";
import { AssistanceCard } from "@/components/assistance-card";
import { useLetterAction } from "@/features/actions/use-letter-action";
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
const ASSISTANCE_LABEL = {
  likely: "Likely",
  possible: "Possible",
  unlikely: "Unlikely",
  unknown: "Not checked yet",
} as const;

function whatToSay(
  lever: string,
  line?: {
    description: string;
    code: string | null;
    serviceDate: string | null;
  },
) {
  const what = line
    ? `"${line.description}"${line.code ? ` (${line.code})` : ""}`
    : "a charge on my bill";
  switch (lever) {
    case "duplicate":
      return `Hello, my bill lists ${what} twice${line?.serviceDate ? ` on ${line.serviceDate}` : ""}. Can you confirm I received it twice?`;
    case "units":
      return `Hello, I'd like to understand the number of units billed for ${what}. Can you check that it matches the care I received?`;
    case "eob_mismatch":
      return `Hello, my insurer's explanation of benefits shows a different amount owed than my bill for ${what}. Can you review it?`;
    case "published_price":
      return `Hello, the charge for ${what} looks higher than the hospital's own published price. Can you review it?`;
    default:
      return `Hello, I'd like to understand the charge for ${what}. Can you walk me through it?`;
  }
}

function CasePage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError, refetch } = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const [showAll, setShowAll] = useState(false);
  const [openFlagId, setOpenFlagId] = useState<string | null>(null);
  const letter = useLetterAction(id);

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
  const openFlag = flags.find((f) => f.id === openFlagId) ?? null;
  const openLine = bill.lines.find((l) => l.id === openFlag?.lineIds[0]);

  const balanceCard = (
    <BalanceCard
      hospitalName={bill.hospital.name}
      billedCents={audit.balance.billedCents}
      fairBalanceCents={audit.balance.fairBalanceCents}
      fairBalanceLowCents={audit.balance.fairBalanceLowCents}
      lessThanBilledCents={audit.balance.lessThanBilledCents}
      isEstimate={audit.balance.isEstimate}
    />
  );
  const tableRows = bill.lines.map((line) => {
    const flag = flags.find((f) => f.lineIds.includes(line.id));
    return {
      line,
      flag,
      savingsCents: flag?.amountCents,
    };
  });

  return (
    <>
      <AppBar title="Your bill check" back="/check" />
      <main className="mx-auto max-w-6xl px-5 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))] md:px-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-8 lg:pb-10">
        <div className="space-y-6 lg:col-span-8 lg:space-y-8">
          <div>
            <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
              {bill.hospital.name}
            </h1>
            {place ? (
              <p className="text-muted-foreground text-sm leading-5">{place}</p>
            ) : null}
          </div>

          <div className="lg:hidden">{balanceCard}</div>

          <section
            aria-labelledby="flags-heading"
            className="space-y-3 lg:hidden"
          >
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
                    onOpen={setOpenFlagId}
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

          <section
            aria-labelledby="bill-heading"
            className="hidden space-y-3 lg:block"
          >
            <h2
              id="bill-heading"
              className="font-semibold text-[22px] leading-[28px]"
            >
              Your bill
            </h2>
            <div className="overflow-hidden rounded-2xl border">
              <BillTable
                rows={tableRows}
                totalCents={bill.totals.chargesCents}
                onOpen={setOpenFlagId}
              />
            </div>
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
            className="flex min-h-14 items-center justify-between rounded-xl border px-4 font-medium text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          >
            Activity
            <ChevronRight
              className="size-5 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </Link>

          <p className="mt-10 pb-6 text-center text-muted-foreground text-xs leading-4 lg:hidden">
            BetterBill is informational, not legal or medical advice.
          </p>
        </div>

        <aside
          aria-label="Savings and actions"
          className="hidden space-y-4 lg:sticky lg:top-20 lg:col-span-4 lg:block lg:self-start"
        >
          {balanceCard}
          <Card>
            <CardTitle>Savings</CardTitle>
            <dl className="space-y-3 text-sm leading-5">
              <div className="flex items-baseline justify-between gap-3">
                <dt>Confirmed</dt>
                <dd className="font-semibold text-mint-ink">
                  <Money cents={audit.savings.confirmedCents} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="flex items-center gap-2">
                  Possible <TierBadge tier="estimate" />
                </dt>
                <dd className="font-semibold">
                  {audit.savings.potentialHighCents > 0 ? (
                    <>
                      <Money
                        cents={audit.savings.potentialLowCents}
                        cents_display="hide"
                      />{" "}
                      to{" "}
                      <Money
                        cents={audit.savings.potentialHighCents}
                        cents_display="hide"
                      />
                    </>
                  ) : (
                    "None found"
                  )}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt>Financial assistance</dt>
                <dd className="font-semibold">
                  {ASSISTANCE_LABEL[audit.savings.assistance.status]}
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs leading-4">
              Estimates depend on the hospital. Not guaranteed.
            </p>
          </Card>
          <Card>
            <Button
              className="w-full"
              onClick={letter.start}
              disabled={letter.busy}
            >
              Send the letter
            </Button>
            <Button variant="secondary" className="w-full" onClick={comingSoon}>
              Call for me
            </Button>
          </Card>
          <Card>
            <CardTitle>Activity</CardTitle>
            <p className="text-muted-foreground text-sm leading-5">
              No activity yet
            </p>
            <Link
              to="/case/$id/activity"
              params={{ id }}
              className="text-primary text-sm underline underline-offset-4"
            >
              See all
            </Link>
          </Card>
          <p className="text-center text-muted-foreground text-xs leading-4">
            BetterBill is informational, not legal or medical advice.
          </p>
        </aside>
      </main>
      <EvidenceSheet
        open={openFlag !== null}
        onOpenChange={(next) => {
          if (!next) setOpenFlagId(null);
        }}
        flag={openFlag}
        line={openLine}
        whatToSay={whatToSay(openFlag?.lever ?? "", openLine)}
      />
      <SavingsBar
        confirmedCents={audit.savings.confirmedCents}
        potentialLowCents={audit.savings.potentialLowCents}
        potentialHighCents={audit.savings.potentialHighCents}
        actionLabel="Send the letter"
        onAction={letter.start}
        actionDisabled={letter.busy}
      />
      {letter.sheet}
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
