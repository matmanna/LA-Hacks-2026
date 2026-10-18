import { Button } from "@betterbill/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@betterbill/ui/components/sheet";
import { useIsDesktop } from "@betterbill/ui/hooks/use-is-desktop";
import { Copy } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { ComparePending, ComparePriceBar } from "./compare-price-bar";
import { Money } from "./money";
import { type Tier, TierBadge } from "./tier-badge";

type EvidenceFlag = {
  id: string;
  title: string;
  explanation: string;
  amountCents: number;
  tier: Tier;
  evidence: {
    kind: string;
    detail: string;
    quote?: string;
    sourceUrl?: string;
    capturedAt?: string;
  };
};

type EvidenceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: EvidenceFlag | null;
  line?: {
    description: string;
    code: string | null;
    serviceDate: string | null;
    chargeCents: number;
    page?: number;
  };
  whatToSay: string;
  compare?: {
    billedCents: number;
    publishedCents: number;
    sourceName: string;
    sourceUrl: string;
    capturedAt: string;
  };
};

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function H3({ children }: { children: string }) {
  return <h3 className="font-semibold text-lg leading-6">{children}</h3>;
}

export function EvidenceSheet({
  open,
  onOpenChange,
  flag,
  line,
  whatToSay,
  compare,
}: EvidenceSheetProps) {
  const isDesktop = useIsDesktop();
  const bodyRef = useRef<HTMLDivElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(whatToSay);
      toast("Copied");
    } catch {
      toast("Couldn't copy. Select the text instead.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        showCloseButton={false}
        initialFocus={bodyRef}
        className="p-0"
      >
        {flag ? (
          <>
            <div
              className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-border lg:hidden"
              aria-hidden="true"
            />
            <div
              ref={bodyRef}
              tabIndex={-1}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] outline-none"
            >
              <div className="space-y-2">
                <TierBadge tier={flag.tier} />
                <SheetTitle className="font-semibold text-[22px] leading-[28px]">
                  {flag.title}
                </SheetTitle>
                <p className="font-semibold text-coral-ink text-lg">
                  <Money cents={flag.amountCents} /> at stake
                </p>
              </div>

              <section className="space-y-1">
                <H3>What we found</H3>
                <SheetDescription className="text-base leading-6">
                  {flag.explanation}
                </SheetDescription>
              </section>

              {line ? (
                <section className="space-y-1">
                  <H3>The line on your bill</H3>
                  <div className="rounded-xl bg-muted p-4 text-sm leading-5">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-muted-foreground">
                      {[line.code, line.serviceDate]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-1">
                      <Money cents={line.chargeCents} />
                    </p>
                  </div>
                </section>
              ) : null}

              <section className="space-y-1">
                <H3>Why we think so</H3>
                <p className="text-base leading-6">{flag.evidence.detail}</p>
                {flag.evidence.quote ? (
                  <blockquote className="border-primary border-l-2 pl-3 text-sm italic">
                    {flag.evidence.quote}
                  </blockquote>
                ) : null}
              </section>

              {compare ? (
                <ComparePriceBar {...compare} />
              ) : flag.tier === "published" ? (
                <ComparePending />
              ) : null}

              <section className="space-y-1">
                <H3>Source</H3>
                {flag.evidence.sourceUrl ? (
                  <>
                    <a
                      href={flag.evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      Open the source
                    </a>
                    {flag.evidence.capturedAt ? (
                      <p className="text-muted-foreground text-xs leading-4">
                        Captured{" "}
                        {dateTime.format(new Date(flag.evidence.capturedAt))}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-base leading-6">
                    Source: your bill{line?.page ? `, page ${line.page}` : ""}
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <H3>What to say to billing</H3>
                <p className="rounded-xl bg-muted p-4 text-sm leading-6">
                  {whatToSay}
                </p>
                <Button variant="secondary" onClick={copy}>
                  <Copy strokeWidth={1.75} aria-hidden="true" />
                  Copy
                </Button>
              </section>

              <p className="text-muted-foreground text-xs leading-4">
                {flag.tier === "confirmed"
                  ? "BetterBill is informational, not legal or medical advice."
                  : "This is an estimate based on public information. BetterBill is informational, not legal or medical advice."}
              </p>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                aria-label="Close evidence"
              >
                Close
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
