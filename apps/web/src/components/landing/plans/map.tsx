import { cn } from "@betterbill/ui/lib/utils";
import { useState } from "react";

import { Section, SectionTitle } from "../section";

// Illustrative only. The hospitals are made up and so are the rates. Nothing
// here is a measurement, and the section says so on screen.
const MASK = [
  "...XXXXXXXXXXXXXXXXXXXXXXXXXX......XXX....XXXX....",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXXXX..XXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..XXXX..XXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX..",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...",
  "..XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
  "...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX....",
  "...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.....",
  "...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "....XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  ".....XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  ".....XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "......XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "......XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.......",
  ".......XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "..........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX......",
  "...........XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.......",
  "............XXXXXXXXXXXXXXXXXXXXXXXXXXXX...XX.....",
  "..................XXXXXXXXXXXXXXXXXX......XXX.....",
  "..................XXXXXXXXXXXXXX..........XXX.....",
  "....................XXXXXXXXXXX...........XX......",
  "......................XXXXXXX.....................",
];

type Lever = "all" | "duplicate" | "units" | "published_price";

const LEVERS: { key: Lever; label: string }[] = [
  { key: "all", label: "All checks" },
  { key: "duplicate", label: "Duplicates" },
  { key: "units", label: "Unit counts" },
  { key: "published_price", label: "Published price" },
];

// Flags per 100 bills, made up.
const HOSPITALS: {
  id: string;
  name: string;
  area: string;
  x: number;
  y: number;
  rate: Record<Lever, number>;
}[] = [
  {
    id: "a",
    name: "Hospital A",
    area: "Pacific Northwest",
    x: 6,
    y: 4,
    rate: { all: 21, duplicate: 6, units: 5, published_price: 10 },
  },
  {
    id: "b",
    name: "Hospital B",
    area: "Northern California",
    x: 5,
    y: 11,
    rate: { all: 34, duplicate: 9, units: 8, published_price: 17 },
  },
  {
    id: "c",
    name: "Hospital C",
    area: "Southern California",
    x: 8,
    y: 17,
    rate: { all: 52, duplicate: 14, units: 12, published_price: 26 },
  },
  {
    id: "d",
    name: "Hospital D",
    area: "Mountain West",
    x: 17,
    y: 10,
    rate: { all: 27, duplicate: 5, units: 11, published_price: 11 },
  },
  {
    id: "e",
    name: "Hospital E",
    area: "Texas",
    x: 25,
    y: 20,
    rate: { all: 46, duplicate: 10, units: 18, published_price: 18 },
  },
  {
    id: "f",
    name: "Hospital F",
    area: "Upper Midwest",
    x: 31,
    y: 6,
    rate: { all: 18, duplicate: 7, units: 4, published_price: 7 },
  },
  {
    id: "g",
    name: "Hospital G",
    area: "Southeast",
    x: 38,
    y: 19,
    rate: { all: 41, duplicate: 12, units: 9, published_price: 20 },
  },
  {
    id: "h",
    name: "Hospital H",
    area: "Northeast",
    x: 44,
    y: 9,
    rate: { all: 38, duplicate: 8, units: 7, published_price: 23 },
  },
];

const CELL = 16;
const W = MASK[0].length * CELL;
const H = MASK.length * CELL;

// Marker fill steps from calm to hot. Flat colors, no gradients.
function tone(rate: number, max: number) {
  const k = rate / max;
  if (k > 0.75) return "#E5484D";
  if (k > 0.5) return "#F08A6E";
  if (k > 0.3) return "#F5C36B";
  return "#9FB3C8";
}

export function PlansMap() {
  const [lever, setLever] = useState<Lever>("all");
  const [active, setActive] = useState<string>("c");
  const max = Math.max(...HOSPITALS.map((h) => h.rate[lever]));
  const ranked = [...HOSPITALS].sort((a, b) => b.rate[lever] - a.rate[lever]);
  const current = HOSPITALS.find((h) => h.id === active) ?? HOSPITALS[0];

  return (
    <Section id="map" band>
      <SectionTitle>See where flags cluster.</SectionTitle>
      <p className="mt-4 max-w-[60ch] text-base text-muted-foreground leading-6 lg:text-lg lg:leading-7">
        A plan view ranks hospitals by how often reviews raise flags, so you
        know where to look first. This map is a mock-up.
      </p>

      <div
        role="tablist"
        aria-label="Check"
        className="mt-8 flex flex-wrap gap-2"
      >
        {LEVERS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={lever === l.key}
            onClick={() => setLever(l.key)}
            className={cn(
              "lp-press h-10 rounded-full border px-4 font-medium text-sm transition-colors",
              lever === l.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border bg-card p-3 pt-12 lg:col-span-8 lg:p-5 lg:pt-12">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full"
            role="img"
            aria-label="Illustrative map of made-up hospitals, sized by how often reviews raise flags"
          >
            {MASK.flatMap((row, y) =>
              [...row].map((c, x) =>
                c === "X" ? (
                  <circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: static grid
                    key={`${x}-${y}`}
                    cx={x * CELL + CELL / 2}
                    cy={y * CELL + CELL / 2}
                    r={2.4}
                    fill="#D5DCE6"
                  />
                ) : null,
              ),
            )}
            {HOSPITALS.map((h) => {
              const r = 9 + (h.rate[lever] / max) * 14;
              const s = 22 + (h.rate[lever] / max) * 14;
              const on = h.id === active;
              const cx = h.x * CELL + CELL / 2;
              const cy = h.y * CELL + CELL / 2;
              return (
                // biome-ignore lint/a11y/useSemanticElements: SVG marker, keyboard handled
                <g
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${h.name}, ${h.area}, ${h.rate[lever]} flags per 100 bills, illustrative`}
                  className="cursor-pointer outline-none"
                  onClick={() => setActive(h.id)}
                  onMouseEnter={() => setActive(h.id)}
                  onFocus={() => setActive(h.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActive(h.id);
                  }}
                >
                  {/* Halo carries the heat. The icon is the hospital. */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 1.35}
                    fill={tone(h.rate[lever], max)}
                    fillOpacity={0.22}
                    style={{
                      transition:
                        "r 400ms cubic-bezier(0.22,1,0.36,1), fill 300ms",
                    }}
                  />
                  <rect
                    x={cx - s / 2}
                    y={cy - s / 2}
                    width={s}
                    height={s}
                    rx={s * 0.28}
                    fill={tone(h.rate[lever], max)}
                    stroke="#0B1B2B"
                    strokeWidth={on ? 2.5 : 0}
                    style={{
                      transition:
                        "all 400ms cubic-bezier(0.22,1,0.36,1), fill 300ms",
                    }}
                  />
                  <path
                    d={`M${cx - s * 0.11} ${cy - s * 0.3}h${s * 0.22}v${s * 0.19}h${s * 0.19}v${s * 0.22}h${-s * 0.19}v${s * 0.19}h${-s * 0.22}v${-s * 0.19}h${-s * 0.19}v${-s * 0.22}h${s * 0.19}z`}
                    fill="#fff"
                    style={{
                      transition: "d 400ms cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </g>
              );
            })}
          </svg>
          <p className="absolute top-4 left-4 rounded-full bg-amber-soft px-2.5 py-1 font-medium text-amber-ink text-xs">
            Illustrative. Made-up data.
          </p>
          <div className="mt-2 flex items-center gap-3 px-2 text-muted-foreground text-xs">
            <span>Fewer flags</span>
            {["#9FB3C8", "#F5C36B", "#F08A6E", "#E5484D"].map((c) => (
              <span
                key={c}
                className="size-3 rounded-full"
                style={{ background: c }}
              />
            ))}
            <span>More flags</span>
          </div>
        </div>

        <div className="mt-6 lg:col-span-4 lg:mt-0">
          <div className="rounded-2xl border bg-card p-5">
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
              Selected
            </p>
            <p className="mt-1 font-semibold text-lg leading-6">
              {current.name}
            </p>
            <p className="text-muted-foreground text-sm">{current.area}</p>
            <p
              key={`${current.id}-${lever}`}
              className="lp-rise mt-3 font-serif text-[44px] tabular-nums leading-[48px]"
            >
              {current.rate[lever]}
              <span className="ml-1 text-base text-muted-foreground">
                flags per 100 bills
              </span>
            </p>
          </div>
          <ol className="mt-4 space-y-1.5">
            {ranked.map((h, i) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setActive(h.id)}
                  className={cn(
                    "lp-press flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    h.id === active
                      ? "bg-card shadow-card"
                      : "hover:bg-card/70",
                  )}
                >
                  <span className="w-4 text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="w-24 shrink-0 font-medium">{h.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full origin-left rounded-full transition-transform duration-500 ease-out"
                      style={{
                        background: tone(h.rate[lever], max),
                        transform: `scaleX(${h.rate[lever] / max})`,
                      }}
                    />
                  </span>
                  <span className="w-6 text-right tabular-nums">
                    {h.rate[lever]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="mt-4 text-muted-foreground text-xs leading-4">
        Hospitals A to H and every rate are made up to show the view. They are
        not measurements. A flag is a question to ask, not a finding of error.
      </p>
    </Section>
  );
}
