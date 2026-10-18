import { Money } from "@betterbill/ui/components/bb/money";
import { type Tier, TierBadge } from "@betterbill/ui/components/bb/tier-badge";
import { cn } from "@betterbill/ui/lib/utils";
import {
  Camera,
  Check,
  ChevronRight,
  FileText,
  Mail,
  PhoneCall,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { usePrefersReducedMotion } from "./motion";

export type DemoFlag = {
  id: string;
  title: string;
  explanation: string;
  amountCents: number;
  tier: Tier;
  lever?: string;
};

export type DemoBalance = {
  hospitalName: string;
  billedCents: number;
  fairBalanceCents: number;
  lessThanBilledCents: number;
};

// Synthetic sample bill. The same figures the audit returns for the demo case
// (SB-01). When the live sample loads, the check stage uses that instead.
export const FALLBACK_BALANCE: DemoBalance = {
  hospitalName: "Cedars-Sinai",
  billedCents: 1_200_000,
  fairBalanceCents: 1_008_315,
  lessThanBilledCents: 191_685,
};

export const FALLBACK_FLAGS: DemoFlag[] = [
  {
    id: "mri",
    lever: "published_price",
    title: "MRI above their cash price",
    explanation:
      "Billed $6,900.00. The hospital's own price file lists a cash price of $5,143.15.",
    amountCents: 175_685,
    tier: "published",
  },
  {
    id: "cbc",
    lever: "duplicate",
    title: "Blood test listed twice",
    explanation:
      "The same test appears twice on Sep 14. Ask billing whether two tests were done.",
    amountCents: 8_400,
    tier: "confirmed",
  },
  {
    id: "draw",
    lever: "units",
    title: "Blood draw billed 4 times",
    explanation:
      "Medicare's usual daily limit for this code is 2. Ask why 4 were billed.",
    amountCents: 7_600,
    tier: "rule",
  },
];

export const STAGES = [
  { key: "snap", label: "Snap", title: "Snap or paste your bill" },
  { key: "confirm", label: "Confirm", title: "Confirm every line" },
  { key: "check", label: "Check", title: "See what looks wrong" },
  { key: "approve", label: "Approve", title: "Approve what we send" },
  { key: "track", label: "Track", title: "Follow along" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const SCREEN_W = 390;
export const SCREEN_H = 780;

// Device frame. The screen is laid out at 390 px and scaled to fit.
export function PhoneFrame({
  scale = 0.78,
  label,
  children,
}: {
  scale?: number;
  label: string;
  children: ReactNode;
}) {
  const pad = 8;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a framed demo, not a form group
    <div
      role="group"
      aria-label={label}
      className="relative mx-auto rounded-[44px] bg-ink p-2 shadow-[0_24px_60px_rgba(11,27,43,0.18)]"
      style={{
        width: SCREEN_W * scale + pad * 2,
        height: SCREEN_H * scale + pad * 2,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[36px] bg-white"
        style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
      <span
        aria-hidden="true"
        className="absolute top-3.5 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-ink"
      />
    </div>
  );
}

const screenClass =
  "flex h-full flex-col gap-4 bg-white px-5 pt-9 pb-6 text-foreground";

function Cta({
  children,
  onClick,
  tone = "primary",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "lp-press flex h-12 w-full items-center justify-center rounded-xl font-semibold text-base transition-colors disabled:cursor-not-allowed",
        tone === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
          : "bg-muted text-foreground hover:bg-border",
      )}
    >
      {children}
    </button>
  );
}

const BILL_LINES: { code: string; text: string; amt: string; hit?: boolean }[] =
  [
    { code: "99284", text: "ED VISIT LEVEL 4", amt: "2,950.00" },
    { code: "72148", text: "MRI LUMBAR W/O", amt: "6,900.00", hit: true },
    { code: "72100", text: "XR LUMBAR 2-3V", amt: "640.00" },
    { code: "85025", text: "CBC W/ AUTO DIFF", amt: "84.00", hit: true },
    { code: "85025", text: "CBC W/ AUTO DIFF", amt: "84.00", hit: true },
    { code: "80053", text: "COMP METABOLIC", amt: "212.00" },
    { code: "36415", text: "VENIPUNCTURE x4", amt: "152.00", hit: true },
    { code: "96374", text: "IV PUSH SINGLE", amt: "486.00" },
    { code: "J1885", text: "KETOROLAC 15MG", amt: "96.00" },
  ];

// Stage 1: the camera sees a bill and reads it row by row.
function SnapScreen({ onNext }: { onNext: () => void }) {
  const [shot, setShot] = useState(false);
  return (
    <div className={screenClass}>
      <div>
        <h3 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
          Snap your bill
        </h3>
        <p className="mt-1 text-base text-muted-foreground leading-6">
          Fit the whole page in the frame.
        </p>
      </div>
      <div className="relative flex h-[330px] justify-center overflow-hidden rounded-[20px] bg-muted">
        <div className="mt-4 h-fit w-[300px] rounded bg-[#F7F5EF] px-4 py-3.5 font-mono text-[#2A3440] text-[9px] leading-[11px] shadow-[0_8px_24px_rgba(11,27,43,0.10)]">
          <div className="font-bold font-sans text-[11px]">
            CEDARS-SINAI MEDICAL CENTER
          </div>
          <div className="my-1.5 h-px bg-[#B8BFC8]" />
          <div className="space-y-[7px]">
            {BILL_LINES.map((l, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static list
                key={i}
                className={cn(
                  "flex justify-between rounded-[3px] transition-all duration-500",
                  shot && "lp-rise",
                  shot &&
                    l.hit &&
                    "bg-mint/15 outline outline-[1.5px] outline-mint",
                )}
                style={{ "--d": `${i * 0.07}s` } as React.CSSProperties}
              >
                <span>
                  {l.code} {l.text}
                </span>
                <span>{l.amt}</span>
              </div>
            ))}
          </div>
        </div>
        {!shot ? (
          <span
            aria-hidden="true"
            className="lp-scan absolute right-0 left-0 h-0.5 bg-primary"
          />
        ) : null}
        {/* Corner brackets */}
        {[
          "top-3 left-3",
          "top-3 right-3 rotate-90",
          "bottom-3 right-3 rotate-180",
          "bottom-3 left-3 -rotate-90",
        ].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={cn(
              "absolute size-5 rounded-tl-lg border-primary border-t-2 border-l-2",
              pos,
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm" aria-live="polite">
        {shot ? (
          <>
            <Check className="size-5 text-mint" strokeWidth={2.5} />
            <span className="font-semibold">Read 11 lines</span>
            <span className="ml-auto text-muted-foreground">
              Next: you confirm
            </span>
          </>
        ) : (
          <>
            <span className="lp-pulse size-2.5 rounded-full bg-mint" />
            <span className="text-muted-foreground">
              Looking for line items
            </span>
          </>
        )}
      </div>
      <div className="flex-1" />
      {shot ? (
        <Cta onClick={onNext}>Review the lines</Cta>
      ) : (
        <button
          type="button"
          aria-label="Take photo"
          onClick={() => setShot(true)}
          className="lp-press mx-auto flex size-[72px] items-center justify-center rounded-full border-4 border-primary bg-white"
        >
          <Camera className="size-7 text-primary" strokeWidth={1.75} />
        </button>
      )}
      <p className="text-center text-muted-foreground text-xs leading-4">
        Or paste the text. Nothing is checked until you confirm.
      </p>
    </div>
  );
}

const CONFIRM_ROWS = [
  ["ED visit, level 4", "99284", 295_000],
  ["MRI lower back, no contrast", "72148", 690_000],
  ["X-ray lower back", "72100", 64_000],
  ["Blood count (CBC)", "85025", 8_400],
  ["Blood count (CBC)", "85025", 8_400],
] as const;

// Stage 2: one unclear line needs a quick answer before "Looks right" unlocks.
function ConfirmScreen({ onNext }: { onNext: () => void }) {
  const [units, setUnits] = useState<null | 4>(null);
  return (
    <div className={screenClass}>
      <div>
        <h3 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
          Do these look right?
        </h3>
        <p className="mt-1 text-base text-muted-foreground leading-6">
          We only check what you confirm.
        </p>
      </div>
      <div
        className={cn(
          "rounded-2xl border-[1.5px] p-4 transition-colors",
          units ? "border-mint bg-mint-soft" : "border-primary bg-secondary",
        )}
      >
        <p className="text-sm leading-5">
          {units
            ? "Confirmed: 4 units of blood draw."
            : "We couldn't tell how many blood draws. Is that right?"}
        </p>
        <div className="mt-2 flex items-center justify-between font-mono text-[#2A3440] text-xs">
          <span>09/14 36415 VENIPUNCTURE x4</span>
          <span>152.00</span>
        </div>
        {units ? null : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="lp-press h-11 rounded-xl bg-white font-semibold text-sm"
            >
              Fix it
            </button>
            <button
              type="button"
              onClick={() => setUnits(4)}
              className="lp-press h-11 rounded-xl bg-primary font-semibold text-primary-foreground text-sm"
            >
              Yes, 4
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Check className="size-4 text-mint" strokeWidth={2.5} />
          10 lines read clearly
        </span>
        <span className="font-medium text-primary">Review</span>
      </div>
      <ul className="divide-y rounded-2xl border">
        {CONFIRM_ROWS.map(([name, code, cents], i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: duplicate rows are the point
            key={i}
            className="lp-rise flex items-center gap-3 px-3.5 py-2.5"
            style={{ "--d": `${i * 0.06}s` } as React.CSSProperties}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-[15px]">
                {name}
              </span>
              <span className="block text-muted-foreground text-xs">
                {code} · Sep 14
              </span>
            </span>
            <Money cents={cents} className="font-semibold text-[15px]" />
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      <Cta onClick={onNext} disabled={!units}>
        {units ? "Looks right" : "Answer the quick check first"}
      </Cta>
    </div>
  );
}

// Stage 3: balance card and flags. A tap opens the evidence behind a flag.
export function CheckScreen({
  onNext,
  balance,
  flags,
  onOpenChange,
}: {
  onNext: () => void;
  balance: DemoBalance;
  flags: DemoFlag[];
  onOpenChange?: (id: string | null) => void;
}) {
  const [open, setOpenState] = useState<string | null>(flags[0]?.id ?? null);
  const setOpen = (id: string | null) => {
    setOpenState(id);
    onOpenChange?.(id);
  };
  return (
    <div className={screenClass}>
      <div className="rounded-3xl bg-ink p-5 text-white">
        <span className="text-[#B9C4D0] text-sm">
          {balance.hospitalName} · Sep 14
        </span>
        <p className="mt-1 font-serif text-[28px] leading-[34px]">
          Your fair balance
        </p>
        <Money
          cents={balance.fairBalanceCents}
          label="Fair balance estimate"
          className="block font-semibold text-[48px] leading-[56px] tracking-[-0.02em]"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="rounded-full bg-mint-soft px-3 py-1.5 font-semibold text-mint-ink text-sm">
            <Money
              cents={balance.lessThanBilledCents}
              sign="negative"
              cents_display="inline"
            />
          </span>
          <span className="text-[#B9C4D0] text-xs">
            Billed <Money cents={balance.billedCents} cents_display="hide" /> ·
            estimate
          </span>
        </div>
      </div>
      <h3 className="font-semibold text-[22px] leading-7">
        {flags.length} things to ask about
      </h3>
      <ul className="-mt-2">
        {flags.map((flag) => {
          const isOpen = open === flag.id;
          return (
            <li key={flag.id} className="border-b">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : flag.id)}
                className="flex w-full items-center gap-3 py-3.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-base">
                    {flag.title}
                  </span>
                  <TierBadge tier={flag.tier} size="sm" className="mt-1" />
                </span>
                <Money
                  cents={flag.amountCents}
                  className="font-semibold text-base text-coral-ink"
                />
                <ChevronRight
                  className={cn(
                    "size-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90",
                  )}
                />
              </button>
              {isOpen ? (
                <p className="lp-rise -mt-1 pb-3.5 text-muted-foreground text-sm leading-5">
                  {flag.explanation}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex-1" />
      <Cta onClick={onNext}>Handle it for me</Cta>
      <p className="-mt-2 text-center text-muted-foreground text-xs leading-4">
        BetterBill is informational, not legal or medical advice.
      </p>
    </div>
  );
}

// Stage 4: the exact words, shown before anything is sent.
function ApproveScreen({
  onNext,
  hospitalName,
}: {
  onNext: () => void;
  hospitalName: string;
}) {
  const [view, setView] = useState<"call" | "email" | null>("email");
  const [approved, setApproved] = useState(false);
  return (
    <div className={screenClass}>
      <div>
        <h3 className="font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
          Read it, then approve
        </h3>
        <p className="mt-1 text-base text-muted-foreground leading-6">
          Nothing goes out until you say so.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm">
        {(
          [
            ["email", "Email", Mail],
            ["call", "Call script", PhoneCall],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "lp-press flex h-10 items-center justify-center gap-2 rounded-lg font-medium transition-colors",
              view === key ? "bg-white shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>
      <div className="lp-rise rounded-2xl border bg-muted p-4 text-[13px] leading-5">
        {view === "call" ? (
          <>
            <p className="font-semibold">To {hospitalName} billing</p>
            <p className="mt-2">
              "Hi, this is an automated assistant calling on behalf of a
              patient. I'm asking about three items on a bill dated Sep 14."
            </p>
            <p className="mt-2 text-muted-foreground">
              Only the minimum is said. The call is saved to your timeline.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold">To {hospitalName} billing</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>
                MRI (72148): billed $6,900.00. Published cash price is
                $5,143.15.
              </li>
              <li>
                Blood test (85025): listed twice on Sep 14. Were two done?
              </li>
              <li>
                Blood draw (36415): 4 units. Medicare's usual daily limit is 2.
              </li>
            </ol>
            <p className="mt-2">
              Please correct these, send an updated bill, and pause collections.
            </p>
          </>
        )}
      </div>
      <p className="flex items-start gap-2 text-muted-foreground text-xs leading-4">
        <FileText className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        Approving covers the script, the email, and your signed form. We save
        your approval with the time.
      </p>
      <div className="flex-1" />
      {approved ? (
        <div className="lp-rise flex h-12 items-center justify-center gap-2 rounded-xl bg-mint-soft font-semibold text-mint-ink">
          <Check className="size-5" strokeWidth={2.5} /> Approved
        </div>
      ) : (
        <Cta
          onClick={() => {
            setApproved(true);
            window.setTimeout(onNext, 900);
          }}
        >
          Approve and send
        </Cta>
      )}
      <Cta tone="ghost" onClick={() => setApproved(false)}>
        Not now
      </Cta>
    </div>
  );
}

const TRACK_STEPS = [
  {
    title: "Advocate is on hold",
    sub: "It gets through the phone menu and waits.",
  },
  { title: "Billing picked up", sub: "Your advocate does the talking." },
  { title: "Call done", sub: "Sending the email. You're CC'd." },
  {
    title: "Waiting on billing",
    sub: "They'll send the itemized bill. We'll text you.",
  },
];

// Stage 5: a timeline that plays itself, with replay.
function TrackScreen({ hospitalName }: { hospitalName: string }) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run restarts the clock
  useEffect(() => {
    if (reduced) {
      setStep(TRACK_STEPS.length - 1);
      return;
    }
    setStep(0);
    const timers = TRACK_STEPS.slice(1).map((_, i) =>
      window.setTimeout(() => setStep(i + 1), (i + 1) * 1600),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [run, reduced]);
  return (
    <div className={screenClass}>
      <div>
        <p className="text-muted-foreground text-sm">
          {hospitalName} · billing
        </p>
        <h3 className="mt-1 font-semibold text-[28px] leading-[34px] tracking-[-0.01em]">
          {TRACK_STEPS[step]?.title}
        </h3>
        <p className="mt-1 text-base text-muted-foreground leading-6">
          {TRACK_STEPS[step]?.sub}
        </p>
      </div>
      <ol className="mt-2 space-y-0">
        {TRACK_STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
              {i < TRACK_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-7 bottom-0 left-[13px] w-0.5 transition-colors duration-500",
                    done ? "bg-ink" : "bg-border",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  done && "border-mint bg-mint text-white",
                  current && "lp-pulse border-primary bg-white",
                  !done && !current && "border-border bg-white",
                )}
              >
                {done ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : current ? (
                  <span className="size-2 rounded-full bg-primary" />
                ) : null}
              </span>
              <span
                className={cn(
                  "pt-0.5 text-[15px] transition-colors",
                  current
                    ? "font-semibold"
                    : done
                      ? ""
                      : "text-muted-foreground",
                )}
              >
                {s.title}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex-1" />
      <div className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
        <Mail className="size-5 text-muted-foreground" strokeWidth={1.75} />
        <span className="flex-1">
          Email: {step >= 2 ? "sent, you're CC'd" : "ready to send"}
        </span>
        {step >= 2 ? (
          <Check className="size-4 text-mint" strokeWidth={2.5} />
        ) : null}
      </div>
      <Cta tone="ghost" onClick={() => setRun((r) => r + 1)}>
        Replay
      </Cta>
    </div>
  );
}

export function DemoScreen({
  stage,
  onNext,
  balance = FALLBACK_BALANCE,
  flags = FALLBACK_FLAGS,
}: {
  stage: StageKey;
  onNext: () => void;
  balance?: DemoBalance;
  flags?: DemoFlag[];
}) {
  switch (stage) {
    case "snap":
      return <SnapScreen onNext={onNext} />;
    case "confirm":
      return <ConfirmScreen onNext={onNext} />;
    case "check":
      return <CheckScreen onNext={onNext} balance={balance} flags={flags} />;
    case "approve":
      return (
        <ApproveScreen onNext={onNext} hospitalName={balance.hospitalName} />
      );
    case "track":
      return <TrackScreen hospitalName={balance.hospitalName} />;
  }
}
