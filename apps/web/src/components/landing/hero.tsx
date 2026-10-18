import {
  TIER_LABELS,
  type Tier,
} from "@betterbill/ui/components/bb/tier-badge";
import { Button } from "@betterbill/ui/components/button";
import { cn } from "@betterbill/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { useStartSample } from "@/hooks/use-start-sample";
import { ArrowSlide } from "./arrow-slide";
import {
  CheckScreen,
  type DemoFlag,
  FALLBACK_BALANCE,
  FALLBACK_FLAGS,
} from "./demo-phone";
import { PortedEdge } from "./edge";
import { HeroVideo, VIDEO_W_DEFAULT } from "./hero-video";
import { useMediaQuery, usePrefersReducedMotion } from "./motion";
import { Phone3D } from "./phone-3d";

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
  flags: (DemoFlag & { lever: string })[];
};

// Printed lines on the bill card. `levers` says which flag lights each line.
const BILL: { text: string; amt: string; levers?: string[] }[] = [
  { text: "99284 ED VISIT LEVEL 4", amt: "2,950.00" },
  {
    text: "72148 MRI LUMBAR W/O",
    amt: "6,900.00",
    levers: ["published_price"],
  },
  { text: "72100 XR LUMBAR 2-3V", amt: "640.00" },
  { text: "85025 CBC W/ AUTO DIFF", amt: "84.00", levers: ["duplicate"] },
  { text: "85025 CBC W/ AUTO DIFF", amt: "84.00", levers: ["duplicate"] },
  { text: "36415 VENIPUNCTURE x4", amt: "152.00", levers: ["units"] },
];

const TRUST = [
  [BadgeCheck, "Every flag shows its source"],
  [ShieldCheck, "You approve every send"],
  [FileCheck2, "Line by line, not a summary"],
] as const;

export function Hero({ sample }: { sample: HeroSample | null }) {
  const start = useStartSample();
  const phoneArea = useRef<HTMLDivElement>(null);
  const [phoneScale, setPhoneScale] = useState(0.8);
  const wide = useMediaQuery("(min-width: 1024px)");
  const balance = sample
    ? { hospitalName: sample.hospitalName, ...sample.balance }
    : FALLBACK_BALANCE;
  const flags = sample ? sample.flags.slice(0, 3) : FALLBACK_FLAGS;
  const [openId, setOpenId] = useState<string | null>(flags[0]?.id ?? null);
  const reduced = usePrefersReducedMotion();
  const [spinning, setSpinning] = useState(false);
  // The demo button only plays the flip. It never navigates away.
  function handleIt() {
    if (spinning || reduced) return;
    setSpinning(true);
  }
  // On desktop the phone fits the height the hero has left, so the video row
  // below it stays inside the first screen.
  useEffect(() => {
    const el = phoneArea.current;
    if (!el || !wide) return;
    function fit() {
      const h = el?.clientHeight ?? 0;
      // frame padding 16 px, caption about 36 px
      setPhoneScale(Math.min(0.86, Math.max(0.58, (h - 16 - 36) / 780)));
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);
  const openFlag = flags.find((f) => f.id === openId) ?? null;

  return (
    <section className="overflow-hidden px-5 pt-10 pb-16 md:px-8 lg:flex lg:min-h-[calc(100svh-104px)] lg:flex-col lg:pt-6 lg:pb-6">
      <div className="mx-auto w-full max-w-6xl lg:grid lg:flex-1 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-6 lg:self-start lg:pt-10 lg:[@media(min-height:860px)]:self-center lg:[@media(min-height:860px)]:pt-0">
          <h1 className="text-balance font-serif text-[40px] leading-[44px] tracking-[-0.01em] lg:text-[64px] lg:leading-[68px]">
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
            what looks wrong with the proof, drafts the letter, and can make the
            call. Nothing is sent until you approve it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link to="/check" />}
            >
              Check my bill
              <ArrowSlide />
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

        <div className="mt-14 lg:relative lg:col-span-6 lg:mt-0 lg:min-h-0">
          <div
            ref={phoneArea}
            className="lg:absolute lg:inset-0 lg:flex lg:flex-col lg:items-center lg:justify-center"
          >
            <div className="relative mx-auto w-fit">
              {/* Bill node, left. Lights the lines behind the open flag. */}
              <div className="lp-float absolute top-16 -left-3 z-10 hidden w-[196px] -translate-x-full rounded-xl border bg-card p-3 shadow-card xl:block">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                  Your bill
                </p>
                <div className="mt-2 space-y-1 font-mono text-[#2A3440] text-[8.5px] leading-[11px]">
                  {BILL.map((l, i) => {
                    const on =
                      !!openFlag && !!l.levers?.includes(openFlag.lever ?? "");
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: static list
                        key={i}
                        className={cn(
                          "flex justify-between rounded-[3px] px-0.5 transition-colors duration-300",
                          on && "bg-mint/15 outline outline-1 outline-mint",
                        )}
                      >
                        <span>{l.text}</span>
                        <span>{l.amt}</span>
                      </div>
                    );
                  })}
                </div>
                <div
                  aria-hidden="true"
                  className="absolute top-1/2 -right-5 w-5 -translate-y-1/2"
                >
                  <PortedEdge />
                </div>
              </div>

              <Phone3D
                scale={wide ? phoneScale : 0.76}
                spinning={spinning}
                onSpinEnd={() => setSpinning(false)}
              >
                <CheckScreen
                  onNext={handleIt}
                  balance={balance}
                  flags={flags}
                  onOpenChange={setOpenId}
                />
              </Phone3D>

              {/* Evidence node, right. Follows the open flag. */}
              <div
                className="lp-float absolute bottom-20 -left-3 z-10 hidden w-[196px] -translate-x-full rounded-xl border bg-card p-3 shadow-card xl:block"
                style={{ "--d": "-2s" } as React.CSSProperties}
              >
                <div
                  aria-hidden="true"
                  className="absolute top-1/2 -right-5 w-5 -translate-y-1/2"
                >
                  <PortedEdge delay={0.6} />
                </div>
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                  Evidence
                </p>
                {openFlag ? (
                  <div key={openFlag.id} className="lp-rise mt-1.5">
                    <p className="font-semibold text-sm leading-5">
                      {TIER_LABELS[openFlag.tier as Tier]}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs leading-4">
                      {openFlag.explanation}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1.5 text-muted-foreground text-xs leading-4">
                    Tap a flag to see why it's there.
                  </p>
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-muted-foreground text-xs leading-4">
              Sample bill. Synthetic data. Tap a flag.
            </p>
          </div>
        </div>
      </div>
      <div
        className="relative mx-auto mt-12 w-full max-w-6xl border-t pt-4 lg:mt-4"
        style={{ "--vw": VIDEO_W_DEFAULT } as CSSProperties}
      >
        <HeroVideo />
        <ul
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 lg:flex-nowrap"
          style={wide ? { paddingLeft: "calc(var(--vw) + 40px)" } : undefined}
        >
          {TRUST.map(([Icon, label]) => (
            <li
              key={label}
              className="flex items-start gap-2 text-sm leading-5 lg:whitespace-nowrap"
            >
              <Icon
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
