import { Money } from "@betterbill/ui/components/bb/money";
import { type Tier, TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { cn } from "@betterbill/ui/lib/utils";
import { Check, RotateCcw } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";

import { FALLBACK_BALANCE, FALLBACK_FLAGS } from "../demo-phone";
import { usePrefersReducedMotion } from "../motion";

export type ConsoleFlag = {
  id: string;
  title: string;
  tier: Tier;
  amountCents: number;
  explanation?: string;
};

export type ConsoleData = {
  hospitalName: string;
  billedCents: number;
  flags: ConsoleFlag[];
  events: string[];
};

export const FALLBACK_CONSOLE: ConsoleData = {
  hospitalName: FALLBACK_BALANCE.hospitalName,
  billedCents: FALLBACK_BALANCE.billedCents,
  flags: FALLBACK_FLAGS,
  events: [
    "Bill read, 11 lines",
    "Member confirmed lines",
    "Audit run, 3 flags",
    "Dispute letter drafted",
    "Member approved letter",
  ],
};

// Review console: pick a flag to read its evidence, watch the event log fill.
const ADVANCE_MS = 5000;

export function Console({ data }: { data: ConsoleData }) {
  const reduced = usePrefersReducedMotion();
  const [openId, setOpenId] = useState(data.flags[0]?.id ?? null);
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const [hold, setHold] = useState(false);
  const open = data.flags.find((f) => f.id === openId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run restarts the log
  useEffect(() => {
    if (reduced) {
      setShown(data.events.length);
      return;
    }
    setShown(0);
    const timers = data.events.map((_, i) =>
      window.setTimeout(() => setShown(i + 1), 500 + i * 650),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [run, reduced, data.events]);

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-card shadow-card"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
    >
      <div className="flex items-center justify-between border-b bg-muted px-4 py-3">
        <div>
          <p className="font-semibold text-sm leading-5">
            {data.hospitalName} · claim review
          </p>
          <p className="text-muted-foreground text-xs leading-4">
            Billed <Money cents={data.billedCents} cents_display="hide" /> ·
            synthetic
          </p>
        </div>
        <span className="rounded-full bg-mint-soft px-2.5 py-1 font-medium text-mint-ink text-xs">
          {data.flags.length} flags
        </span>
      </div>

      <ul>
        {data.flags.map((f) => {
          const on = f.id === openId;
          return (
            <li key={f.id} className="border-b last:border-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setOpenId(f.id)}
                className={cn(
                  "lp-press flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  on ? "bg-secondary/60" : "hover:bg-muted/60",
                )}
              >
                <span
                  aria-hidden="true"
                  className="h-8 w-1 shrink-0 overflow-hidden rounded-full bg-border/60"
                >
                  {on && !reduced ? (
                    <span
                      key={`${f.id}-${run}`}
                      className="lp-progress-y block h-full w-full rounded-full bg-primary"
                      data-paused={hold}
                      style={{ "--dur": `${ADVANCE_MS}ms` } as CSSProperties}
                      onAnimationEnd={() => {
                        const i = data.flags.findIndex((x) => x.id === f.id);
                        setOpenId(
                          data.flags[(i + 1) % data.flags.length]?.id ?? f.id,
                        );
                      }}
                    />
                  ) : on ? (
                    <span className="block h-full w-full rounded-full bg-primary" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm leading-5">
                    {f.title}
                  </span>
                  <TierBadge tier={f.tier} size="sm" className="mt-1" />
                </span>
                <Money
                  cents={f.amountCents}
                  className="font-semibold text-coral-ink text-sm"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t bg-muted/50 px-4 py-3">
        <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
          Evidence
        </p>
        {open ? (
          <p key={open.id} className="lp-rise mt-1 min-h-10 text-sm leading-5">
            {open.explanation ??
              "Source, rule, and capture date are on the case."}
          </p>
        ) : null}
      </div>

      <div className="border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
            Event log
          </p>
          <button
            type="button"
            aria-label="Replay event log"
            onClick={() => setRun((r) => r + 1)}
            className="lp-press flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <ol className="mt-2 min-h-[120px] space-y-1.5">
          {data.events.slice(0, shown).map((e) => (
            <li
              key={e}
              className="lp-rise flex items-center gap-2 text-xs leading-4"
            >
              <Check
                className="size-3.5 shrink-0 text-mint"
                strokeWidth={2.5}
                aria-hidden="true"
              />
              {e}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
