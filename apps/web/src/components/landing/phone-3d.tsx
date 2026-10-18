import type { ReactNode } from "react";

import { PhoneFrame, SCREEN_H, SCREEN_W } from "./demo-phone";

// Phone with a slow float and a slight turn about its vertical axis. When
// `spinning` is true it does one fast full turn back to flat, and the back
// face (the BetterBill check where a logo would sit) shows mid-turn.
const DEPTH = 18;
const SLICES = 12;

export function Phone3D({
  scale,
  spinning,
  onSpinEnd,
  children,
}: {
  scale: number;
  spinning: boolean;
  onSpinEnd: () => void;
  children: ReactNode;
}) {
  const w = SCREEN_W * scale + 16;
  const h = SCREEN_H * scale + 16;
  return (
    <div
      style={{ perspective: spinning ? 1600 : undefined, width: w, height: h }}
    >
      <div
        className={spinning ? "lp-spin" : "lp-tilt"}
        onAnimationEnd={(e) => {
          if (e.animationName === "lp-spin") onSpinEnd();
        }}
        style={{
          transformStyle: spinning ? "preserve-3d" : "flat",
          width: w,
          height: h,
        }}
      >
        {/* Body: stacked slices give the frame real thickness mid-turn. */}
        {spinning
          ? Array.from({ length: SLICES }, (_, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static slices
                key={i}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[44px] bg-[#1b3045]"
                style={{
                  transform: `translateZ(${(i / (SLICES - 1) - 0.5) * (DEPTH - 2)}px)`,
                }}
              />
            ))
          : null}
        <div
          className="absolute inset-0"
          style={{
            transform: spinning ? `translateZ(${DEPTH / 2}px)` : undefined,
          }}
        >
          <PhoneFrame scale={scale} label="BetterBill results on a sample bill">
            {children}
          </PhoneFrame>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[44px] bg-ink shadow-[0_24px_60px_rgba(11,27,43,0.18)]"
          style={{
            visibility: spinning ? "visible" : "hidden",
            transform: `translateZ(${-DEPTH / 2}px) rotateY(180deg)`,
            backfaceVisibility: "hidden",
          }}
        >
          <div className="absolute inset-[3px] rounded-[41px] bg-[#13283c] ring-1 ring-white/10" />
          {/* camera plate */}
          <div className="absolute top-5 left-5 grid size-[72px] grid-cols-2 place-items-center gap-1.5 rounded-[22px] bg-ink p-3 ring-1 ring-white/10">
            <span className="size-6 rounded-full bg-[#0b1b2b] ring-2 ring-white/15" />
            <span className="size-6 rounded-full bg-[#0b1b2b] ring-2 ring-white/15" />
            <span className="size-6 rounded-full bg-[#0b1b2b] ring-2 ring-white/15" />
            <span className="size-2 rounded-full bg-[#5f7184]" />
          </div>
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative, hidden from assistive tech */}
          <svg
            viewBox="0 0 16 16"
            className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 text-[#5f7184]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 8.8 6.2 12.4 13.5 3.6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
