import { LineConfirmRow } from "@betterbill/ui/components/bb/line-confirm-row";
import { Money } from "@betterbill/ui/components/bb/money";
import { AuditingState, ErrorState } from "@betterbill/ui/components/bb/states";
import { Button } from "@betterbill/ui/components/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { AppBar } from "@/components/app-bar";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/case/$id/confirm")({
  head: () => ({
    meta: [
      { title: "Check what we read, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmPage,
});

type Lines = NonNullable<
  Awaited<ReturnType<typeof client.case.get>>["bill"]
>["lines"];

function ConfirmPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(
    orpc.case.get.queryOptions({ input: { caseId: id } }),
  );
  const [lines, setLines] = useState<Lines | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (data?.bill && lines === null) {
      // Low-confidence lines float to the top.
      setLines(
        [...data.bill.lines].sort((a, b) => a.confidence - b.confidence),
      );
    }
  }, [data, lines]);

  async function confirm() {
    if (!lines) return;
    setAuditing(true);
    setFailed(false);
    try {
      // eob is left out so a stored EOB is kept (null would delete it).
      await client.bill.confirmLines({ caseId: id, lines });
      await client.audit.run({ caseId: id });
      // The cached case.get is from before the audit; drop it so the results
      // page loads the audited case instead of "We can't find that case".
      await queryClient.invalidateQueries();
      await navigate({ to: "/case/$id", params: { id } });
    } catch {
      setAuditing(false);
      setFailed(true);
    }
  }

  if (auditing) {
    return (
      <>
        <AppBar title="Confirm lines" />
        <main className="mx-auto max-w-6xl px-5 md:px-8">
          <AuditingState />
        </main>
      </>
    );
  }

  if (isError || (!isLoading && !data?.bill)) {
    return (
      <>
        <AppBar title="Confirm lines" back="/check" />
        <main className="mx-auto max-w-6xl px-5 md:px-8">
          <ErrorState
            title="We can't find that case"
            body="It may have been removed."
            action={{
              label: "Check a bill",
              onClick: () => void navigate({ to: "/check" }),
            }}
          />
        </main>
      </>
    );
  }

  const bill = data?.bill;
  const needLook = (lines ?? []).filter((l) => l.confidence < 0.9).length;
  // Input check only: do the lines add up to the total printed on the bill?
  const linesSum = (lines ?? []).reduce((sum, l) => sum + l.chargeCents, 0);
  const matches = bill ? linesSum === bill.totals.chargesCents : true;

  return (
    <>
      <AppBar title="Confirm lines" back="/check" />
      <main className="mx-auto max-w-2xl space-y-4 px-5 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 lg:pb-10">
        <div>
          <h1 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em] lg:text-[36px] lg:leading-[42px]">
            Check what we read
          </h1>
          {bill && lines ? (
            <p className="text-muted-foreground">
              {lines.length} lines from {bill.hospital.name}. Tap a line to fix
              it.
            </p>
          ) : null}
          {needLook > 0 ? (
            <p className="text-amber-ink text-sm leading-5">
              {needLook} {needLook === 1 ? "line needs" : "lines need"} a look
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          {(lines ?? []).map((line) => (
            <LineConfirmRow
              key={line.id}
              line={line}
              editing={editingId === line.id}
              onEditToggle={() =>
                setEditingId(editingId === line.id ? null : line.id)
              }
              onChange={(next) =>
                setLines((prev) =>
                  (prev ?? []).map((l) => (l.id === next.id ? next : l)),
                )
              }
            />
          ))}
        </div>

        {bill ? (
          matches ? (
            <p className="flex items-center gap-2 text-mint-ink text-sm leading-5">
              <Check className="size-5" strokeWidth={1.75} aria-hidden="true" />
              Lines add up to the bill total,{" "}
              <Money cents={bill.totals.chargesCents} />
            </p>
          ) : (
            <p className="rounded-xl bg-amber-soft p-3 text-amber-ink text-sm leading-5">
              The lines add up to <Money cents={linesSum} />, but the bill says{" "}
              <Money cents={bill.totals.chargesCents} />. Check the lines marked
              above.
            </p>
          )
        ) : null}

        {failed ? (
          <p role="alert" className="text-coral-ink text-sm leading-5">
            Something went wrong on our side. Your bill is safe. Try again in a
            moment.
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:pb-0">
          <div className="mx-auto flex h-20 max-w-2xl items-center px-5 md:px-8 lg:h-auto lg:px-0">
            <Button className="w-full" disabled={!lines} onClick={confirm}>
              Looks right
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
