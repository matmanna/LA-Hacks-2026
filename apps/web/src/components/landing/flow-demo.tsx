import { cn } from "@betterbill/ui/lib/utils";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";

import {
  type DemoBalance,
  type DemoFlag,
  DemoScreen,
  PhoneFrame,
  STAGES,
  type StageKey,
} from "./demo-phone";
import { Edge, PortedEdge } from "./edge";
import { useMediaQuery, usePrefersReducedMotion, useSeenOnce } from "./motion";
import { Section, SectionTitle } from "./section";

const BODY: Record<StageKey, { body: string; note: string }> = {
  snap: {
    body: "Take a photo of each page, or paste the text. We read every charge.",
    note: "StepFun reads the photo. Text paste works too.",
  },
  confirm: {
    body: "You see each line we read. Fix anything that's off before we check a thing.",
    note: "Nothing is audited until you confirm.",
  },
  check: {
    body: "Duplicates, units, your insurer's statement, and the hospital's own price file. Each flag shows its source.",
    note: "A rules engine decides. It's tested, not guessed.",
  },
  approve: {
    body: "We draft the email and the call script. You read the exact words first.",
    note: "Every send needs your approval, saved with the time.",
  },
  track: {
    body: "Follow the call and the email on one timeline. We text you when billing answers.",
    note: "Every step is traced from start to finish.",
  },
};

const AUTO_MS = 9000;

export function FlowDemo({
  balance,
  flags,
}: {
  balance?: DemoBalance;
  flags?: DemoFlag[];
}) {
  const reduced = usePrefersReducedMotion();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [ref, seen] = useSeenOnce<HTMLDivElement>(0.3);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const count = STAGES.length;
  const stage = STAGES[index] ?? STAGES[0];
  const auto = playing && !reduced && seen;

  function go(next: number, userPicked = true) {
    setIndex(((next % count) + count) % count);
    if (userPicked) setPlaying(false);
  }

  function onKey(e: KeyboardEvent, i: number) {
    const d =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + count) % count;
    go(n);
    buttons.current[n]?.focus();
  }

  return (
    <Section id="how" band>
      <SectionTitle>From a photo to a sent letter.</SectionTitle>
      <p className="mt-4 max-w-[60ch] text-base text-muted-foreground leading-6 lg:text-lg lg:leading-7">
        This is the real flow, on a synthetic bill. Tap around inside the phone,
        or pick a step.
      </p>

      <div
        ref={ref}
        className="mt-10 grid items-start gap-8 lg:grid-cols-12 lg:gap-12"
      >
        {/* Mobile: compact step row joined by edges */}
        <div
          role="tablist"
          aria-label="Steps"
          aria-orientation="horizontal"
          className="flex items-center lg:hidden"
        >
          {STAGES.map((s, i) => (
            <div key={s.key} className="contents">
              {i > 0 ? <Edge className="w-3 shrink-0" delay={i * 0.4} /> : null}
              <button
                type="button"
                role="tab"
                aria-selected={index === i}
                onClick={() => go(i)}
                className={cn(
                  "lp-press flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center transition-colors",
                  index === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                <span className="font-semibold text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[11px] leading-3">{s.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Desktop: node column with vertical edges */}
        <div className="hidden lg:col-span-5 lg:block">
          <div
            role="tablist"
            aria-label="Steps"
            aria-orientation="vertical"
            className="flex flex-col"
          >
            {STAGES.map((s, i) => {
              const active = index === i;
              return (
                <div key={s.key} className="contents">
                  {i > 0 ? (
                    <div className="flex h-6 pl-6" aria-hidden="true">
                      <PortedEdge axis="y" delay={i * 0.5} />
                    </div>
                  ) : null}
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`flow-tab-${s.key}`}
                    aria-selected={active}
                    aria-controls="flow-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => go(i)}
                    onKeyDown={(e) => onKey(e, i)}
                    className={cn(
                      "lp-lift lp-press relative flex items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left",
                      active
                        ? "border-primary/40 bg-card shadow-card"
                        : "bg-card/60 hover:bg-card",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm tabular-nums transition-colors duration-300",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-lg leading-6">
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "grid transition-[grid-template-rows,opacity] duration-300",
                          active
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="mt-1 block text-base text-muted-foreground leading-6">
                            {BODY[s.key].body}
                          </span>
                          <span className="mt-2 block font-medium text-primary text-sm">
                            {BODY[s.key].note}
                          </span>
                        </span>
                      </span>
                    </span>
                    {active && auto ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-[3px] bg-primary/10"
                      >
                        <span
                          key={`${s.key}-${index}`}
                          className="lp-progress block h-full bg-primary"
                          data-paused={hold}
                          style={{ "--dur": `${AUTO_MS}ms` } as CSSProperties}
                          onAnimationEnd={() => go(index + 1, false)}
                        />
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <ControlButton label="Previous step" onClick={() => go(index - 1)}>
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </ControlButton>
            <ControlButton
              label={playing ? "Pause tour" : "Play tour"}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <Pause className="size-5" strokeWidth={1.75} />
              ) : (
                <Play className="size-5" strokeWidth={1.75} />
              )}
            </ControlButton>
            <ControlButton label="Next step" onClick={() => go(index + 1)}>
              <ChevronRight className="size-5" strokeWidth={1.75} />
            </ControlButton>
            <span className="ml-2 text-muted-foreground text-sm tabular-nums">
              {index + 1} of {count}
            </span>
          </div>
        </div>

        {/* Phone */}
        <div className="lg:col-span-7">
          <div
            id="flow-panel"
            role="tabpanel"
            aria-labelledby={`flow-tab-${stage.key}`}
            className="relative"
            onPointerEnter={() => setHold(true)}
            onPointerLeave={() => setHold(false)}
            onPointerDown={() => setPlaying(false)}
          >
            <p className="mb-4 text-center text-muted-foreground text-sm lg:hidden">
              {BODY[stage.key].body}
            </p>
            <PhoneFrame
              scale={wide ? 0.86 : 0.74}
              label={`${stage.title}, phone demo`}
            >
              <div key={stage.key} className="lp-rise h-full">
                <DemoScreen
                  stage={stage.key}
                  onNext={() => go(index + 1)}
                  balance={balance}
                  flags={flags}
                />
              </div>
            </PhoneFrame>
          </div>
          <p className="mt-4 text-center text-muted-foreground text-xs leading-4">
            Sample bill. Synthetic data.
          </p>
        </div>
      </div>
    </Section>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="lp-press flex size-11 items-center justify-center rounded-xl border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </button>
  );
}
