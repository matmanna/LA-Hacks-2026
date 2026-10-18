import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIMEO_BASE =
  "https://player.vimeo.com/video/1236972348?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0";
// Small card: poster only, no controls. Big player: starts on open.
const CARD_SRC = `${VIMEO_BASE}&controls=0`;
const FULL_SRC = `${VIMEO_BASE}&autoplay=1`;

const MIN_W = 150;
const MAX_W = 250;
// Share of the room below the anchor that the video may fill (a bit under 3/5).
const HEIGHT_SHARE = 0.5;

// Card width from the screen height: bigger on tall screens, never below 150 px
// or above 250 px. About 640 px of the screen goes to the bars, the copy and
// the buttons above it; half of what is left (at 16:9) is the card.
export const VIDEO_W_DEFAULT = `clamp(${MIN_W}px, calc((100svh - 640px) * ${(HEIGHT_SHARE * 16) / 9}), ${MAX_W}px)`;

function Lightbox({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape and the close button cover the keyboard
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BetterBill video"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm md:p-10"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="lp-press absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="size-5" strokeWidth={1.75} />
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: only stops a click on the video from closing it */}
      <div
        className="lp-rise relative w-full max-w-[1100px] overflow-hidden rounded-2xl bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        style={{ aspectRatio: "16 / 9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={FULL_SRC}
          title="BetterBill - LA Hacks AI 2026"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    </div>,
    document.body,
  );
}

// Small poster card, floating bottom left of the hero on desktop. It sizes from
// the screen height in CSS, so it never changes size after the first paint. A
// click opens the video large, over a dark backdrop.
export function HeroVideo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="absolute bottom-0 left-0 hidden overflow-hidden rounded-xl border bg-ink shadow-card lg:block"
        style={{ width: "var(--vw)", aspectRatio: "16 / 9" }}
      >
        <iframe
          src={CARD_SRC}
          title="BetterBill video preview"
          loading="lazy"
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 size-full border-0"
        />
        <button
          type="button"
          aria-label="Play the BetterBill video"
          onClick={() => setOpen(true)}
          className="group absolute inset-0 z-10 flex cursor-pointer items-center justify-center focus-visible:outline-none"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card transition-transform duration-200 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
            <Play
              className="ml-0.5 size-5"
              fill="currentColor"
              strokeWidth={0}
            />
          </span>
        </button>
      </div>
      {open ? <Lightbox onClose={() => setOpen(false)} /> : null}
    </>
  );
}
