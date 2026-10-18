import { type RefObject, useEffect, useRef, useState } from "react";

const VIMEO_SRC =
  "https://player.vimeo.com/video/1236972348?badge=0&autopause=0&player_id=0&app_id=58479";

const VIMEO_ORIGIN = "https://player.vimeo.com";
const MIN_W = 160;
const MAX_W = 400;

// Small player, bottom left of the hero on desktop. Its height is at most 3/5
// of the space between the bottom of the anchor label and the bottom of the
// screen, so it sits in the first screen. Width follows at 16:9.
export function HeroVideo({
  anchor,
}: {
  anchor: RefObject<HTMLElement | null>;
}) {
  const [width, setWidth] = useState(MIN_W);
  const [started, setStarted] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  function post(message: object) {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify(message),
      VIMEO_ORIGIN,
    );
  }

  // Listen for the player's own play event, so starting from its controls
  // also counts as played.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== VIMEO_ORIGIN || typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data) as { event?: string };
        if (data.event === "play") setStarted(true);
      } catch {
        // not a player message
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A transparent layer covers the player until it plays, so the control bar
  // never shows on hover. A click on it starts the video.
  function start() {
    post({ method: "play" });
    // If the browser blocks play, drop the layer so the player's own button works.
    window.setTimeout(() => setStarted(true), 900);
  }

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
    // Layout shifts once fonts load and the page settles. Measure again.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [anchor]);

  return (
    <div
      className="relative hidden shrink-0 overflow-hidden rounded-xl border bg-ink shadow-card lg:block"
      style={{ width, aspectRatio: "16 / 9" }}
    >
      <iframe
        ref={frame}
        onLoad={() => post({ method: "addEventListener", value: "play" })}
        src={VIMEO_SRC}
        title="BetterBill - LA Hacks AI 2026"
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
      {started ? null : (
        <button
          type="button"
          aria-label="Play the BetterBill video"
          onClick={start}
          className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      )}
    </div>
  );
}
