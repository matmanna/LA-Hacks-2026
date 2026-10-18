import { ActivityTimeline } from "@betterbill/ui/components/bb/activity-timeline";
import { Money } from "@betterbill/ui/components/bb/money";
import { TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { Wordmark } from "@betterbill/ui/components/bb/wordmark";
import { Button } from "@betterbill/ui/components/button";
import { Skeleton } from "@betterbill/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link2, Printer } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

// B2: read-only evidence packet. Anyone with the link can read it; the owner
// can turn the link off. Print or "save as PDF" uses the browser.
export const Route = createFileRoute("/packet/$token")({
  head: () => ({
    meta: [
      { title: "Evidence packet, BetterBill" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PacketPage,
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const when = (iso: string | null | undefined) =>
  iso ? dateTime.format(new Date(iso)) : "not recorded";

const ACTION_LABEL = {
  letter: "Dispute letter",
  itemized_request: "Itemized bill request",
  call: "Call script",
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid space-y-3 border-t pt-6">
      <h2 className="font-semibold text-[22px] leading-[28px]">{title}</h2>
      {children}
    </section>
  );
}

function PacketPage() {
  const { token } = Route.useParams();
  const { data, isLoading, isError } = useQuery(
    // A dead link should say so at once, not after retries.
    { ...orpc.case.packet.queryOptions({ input: { token } }), retry: false },
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-5 py-10 md:px-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }
  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl space-y-3 px-5 py-16 md:px-8">
        <h1 className="font-semibold text-[28px] leading-[34px]">
          This link is not active
        </h1>
        <p className="text-muted-foreground">
          The owner may have turned it off. Ask them for a new link.
        </p>
      </main>
    );
  }

  const { bill, flags, savings, balance, sources, actions, events } = data;
  const flagged = new Set(flags.flatMap((f) => f.lineIds));
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Copy the address bar instead.");
    }
  };

  return (
    <main className="mx-auto min-w-0 max-w-3xl space-y-8 overflow-x-hidden px-5 py-8 md:px-8 print:max-w-none print:px-0 print:py-0">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Wordmark />
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={copyLink}>
              <Link2 aria-hidden="true" /> Copy link
            </Button>
            <Button onClick={() => window.print()}>
              <Printer aria-hidden="true" /> Print or save as PDF
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="font-serif text-[40px] leading-[44px] lg:text-[64px] lg:leading-[68px]">
            Evidence packet
          </h1>
          <p className="text-muted-foreground">
            {bill.hospital.name}
            {bill.hospital.city ? `, ${bill.hospital.city}` : ""}
            {bill.statementDate ? ` · Statement ${bill.statementDate}` : ""}
            {bill.accountRefMasked
              ? ` · Account ending ${bill.accountRefMasked}`
              : ""}
          </p>
          <p className="text-muted-foreground text-xs leading-4">
            Prepared {when(data.generatedAt)}
          </p>
        </div>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-sm">Billed</p>
          <Money
            cents={balance.billedCents}
            className="text-2xl tabular-nums"
          />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">
            Fair balance{balance.isEstimate ? " (estimate)" : ""}
          </p>
          <Money
            cents={balance.fairBalanceCents}
            className="text-2xl tabular-nums"
          />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Less than billed</p>
          <Money
            cents={balance.lessThanBilledCents}
            className="text-2xl text-mint-ink tabular-nums"
          />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm sm:col-span-3">
          {savings.method.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <Section title={`What we found (${flags.length})`}>
        {flags.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing on this bill matched our checks.
          </p>
        ) : (
          <ol className="space-y-4">
            {flags.map((f) => (
              <li
                key={f.id}
                className="break-inside-avoid space-y-2 rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg leading-6">{f.title}</h3>
                  {f.amountCents > 0 ? (
                    <Money
                      cents={f.amountCents}
                      className="text-coral-ink tabular-nums"
                    />
                  ) : null}
                </div>
                <TierBadge tier={f.tier} size="sm" />
                <p>{f.explanation}</p>
                <p className="text-muted-foreground text-sm [overflow-wrap:anywhere]">
                  How we know: {f.evidence.detail}
                </p>
                {f.evidence.sourceUrl ? (
                  <p className="break-all text-sm">
                    Source:{" "}
                    <a
                      className="text-primary underline"
                      href={f.evidence.sourceUrl}
                    >
                      {f.evidence.sourceUrl}
                    </a>
                    {f.evidence.capturedAt
                      ? `, captured ${when(f.evidence.capturedAt)}`
                      : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Bill lines">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="hidden p-2 font-medium sm:table-cell">Date</th>
                <th className="p-2 font-medium">Code</th>
                <th className="p-2 font-medium">Description</th>
                <th className="p-2 text-right font-medium">Qty</th>
                <th className="p-2 pr-4 text-right font-medium">Charge</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="hidden p-2 tabular-nums sm:table-cell">
                    {l.serviceDate ?? "-"}
                  </td>
                  <td className="p-2 tabular-nums">{l.code ?? "-"}</td>
                  <td className="p-2">
                    {l.description}
                    {flagged.has(l.id) ? (
                      <span className="ml-2 rounded-full bg-coral-soft px-2 py-0.5 font-medium text-coral-ink text-xs">
                        Flagged
                      </span>
                    ) : null}
                    {l.userEdited ? (
                      <span className="ml-2 text-muted-foreground text-xs">
                        (edited by you)
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 text-right tabular-nums">{l.units}</td>
                  <td className="p-2 pr-4 text-right">
                    <Money cents={l.chargeCents} className="tabular-nums" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {sources.length > 0 ? (
        <Section title="Sources">
          <ul className="space-y-3 text-sm">
            {sources.map((s) => (
              <li key={s.url} className="break-all">
                <p className="font-medium">{s.label}</p>
                <a className="text-primary underline" href={s.url}>
                  {s.url}
                </a>
                <p className="text-muted-foreground">
                  Captured {when(s.capturedAt)}
                  {s.sha256 ? ` · SHA-256 ${s.sha256}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {actions.length > 0 ? (
        <Section title="Messages">
          <ul className="space-y-4">
            {actions.map((a) => (
              <li
                key={a.id}
                className="break-inside-avoid space-y-2 rounded-2xl border p-4"
              >
                <p className="font-medium">
                  {ACTION_LABEL[a.kind]} to {a.recipient}
                </p>
                <p className="text-muted-foreground text-xs leading-4">
                  {a.approvedAt
                    ? `Approved by you ${when(a.approvedAt)}`
                    : "Not approved"}
                  {a.sentAt ? ` · Sent ${when(a.sentAt)}` : ""}
                </p>
                <pre className="whitespace-pre-wrap font-sans text-sm [overflow-wrap:anywhere]">
                  {a.draft}
                </pre>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Case history">
        <ActivityTimeline
          events={events.map((e) => ({
            id: e.id,
            at: e.at,
            summary: e.summary,
            actor: e.actor,
            done: true,
          }))}
        />
      </Section>

      <footer className="border-t pt-6 text-muted-foreground text-sm">
        BetterBill is informational, not legal or medical advice.
      </footer>
    </main>
  );
}
