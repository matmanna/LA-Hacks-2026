import { Pause, Play } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";

const VIMEO_SRC =
  "https://player.vimeo.com/video/1236972348?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0&controls=0";

const VIMEO_ORIGIN = "https://player.vimeo.com";
const MIN_W = 160;
const MAX_W = 400;

// Small player, bottom left of the hero on desktop. Its height is at most 3/5
// of the space between the bottom of the anchor label and the bottom of the
// screen, so it sits in the first screen. Width follows at 16:9.
export function HeroVideo({
  anchor,
  onWidth,
}: {
  anchor: RefObject<HTMLElement | null>;
  onWidth: (width: number) => void;
}) {
  const [width, setWidth] = useState(MIN_W);
  const [playing, setPlaying] = useState(false);
  // Set when the browser refuses a scripted play, so the player's own button works.
  const [passthrough, setPassthrough] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const playingRef = useRef(false);
  playingRef.current = playing;

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
        if (data.event === "play") setPlaying(true);
        if (data.event === "pause" || data.event === "ended") setPlaying(false);
      } catch {
        // not a player message
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // A layer over the player holds the only control: one round button that
  // plays and pauses. Nothing else of the player's UI is reachable.
  function toggle() {
    post({ method: playing ? "pause" : "play" });
    // No play event soon after a click: the browser blocked it. Step aside.
    if (!playing) {
      window.setTimeout(() => {
        if (!playingRef.current) setPassthrough(true);
      }, 1200);
    }
  }

  useEffect(() => {
    function measure() {
      const el = anchor.current;
      if (!el) return;
      const bottom = el.getBoundingClientRect().bottom + window.scrollY;
      const room = window.innerHeight - bottom;
      const h = Math.max(0, room) * 0.6;
      const w = Math.round(Math.min(MAX_W, Math.max(MIN_W, (h * 16) / 9)));
      setWidth(w);
      onWidth(w);
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
  }, [anchor, onWidth]);

  return (
    <div
      className="absolute bottom-0 left-0 hidden overflow-hidden rounded-xl border bg-ink shadow-card lg:block"
      style={{ width, aspectRatio: "16 / 9" }}
    >
      <iframe
        ref={frame}
        onLoad={() => {
          for (const value of ["play", "pause", "ended"])
            post({ method: "addEventListener", value });
        }}
        src={VIMEO_SRC}
        title="BetterBill - LA Hacks AI 2026"
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
      {passthrough ? null : (
        <button
          type="button"
          aria-label={
            playing ? "Pause the BetterBill video" : "Play the BetterBill video"
          }
          onClick={toggle}
          className="group absolute inset-0 z-10 flex cursor-pointer items-center justify-center focus-visible:outline-none"
        >
          <span
            className={`flex size-12 items-center justify-center rounded-full bg-white/95 text-ink shadow-card transition-all duration-200 group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-ring ${
              playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
            }`}
          >
            {playing ? (
              <Pause className="size-5" fill="currentColor" strokeWidth={0} />
            ) : (
              <Play
                className="ml-0.5 size-5"
                fill="currentColor"
                strokeWidth={0}
              />
            )}
          </span>
        </button>
      )}
    </div>
  );
}
