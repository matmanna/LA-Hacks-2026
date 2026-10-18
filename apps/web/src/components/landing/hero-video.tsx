import { type RefObject, useEffect, useState } from "react";

const VIMEO_SRC =
  "https://player.vimeo.com/video/1236972348?badge=0&autopause=0&player_id=0&app_id=58479";

const MIN_W = 200;
const MAX_W = 290;

// Small player, bottom left of the hero on desktop. Its height is at most 3/5
// of the space between the bottom of the anchor label and the bottom of the
// screen, so it sits in the first screen. Width follows at 16:9.
export function HeroVideo({
  anchor,
}: {
  anchor: RefObject<HTMLElement | null>;
}) {
  const [width, setWidth] = useState(MIN_W);

  useEffect(() => {
    function measure() {
      const el = anchor.current;
      if (!el) return;
      const bottom = el.getBoundingClientRect().bottom + window.scrollY;
      const room = window.innerHeight - bottom;
      const h = Math.max(0, room) * 0.6;
      setWidth(Math.round(Math.min(MAX_W, Math.max(MIN_W, (h * 16) / 9))));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchor]);

  return (
    <div
      className="relative hidden shrink-0 overflow-hidden rounded-xl border bg-ink shadow-card lg:block"
      style={{ width, aspectRatio: "16 / 9" }}
    >
      <iframe
        src={VIMEO_SRC}
        title="BetterBill - LA Hacks AI 2026"
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
