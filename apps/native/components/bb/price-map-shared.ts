// Shared by price-map.tsx (web) and price-map.native.tsx (phones). Kept in
// its own file: on phones "./price-map" resolves to the .native file itself.
// Pins appear one every PIN_STEP_MS; the sheet waits for the last one.
export const PIN_STEP_MS = 180;

export type PriceMapProps = {
  rows: readonly {
    hospitalKey: string;
    hospitalName: string;
    distanceMiles: number;
    // Price pins only; hospital pins leave these out.
    discountedCashCents?: number | null;
    rank?: number | null;
    shareOfHighest?: number | null;
    // Lower, middle or higher third (price pins) or how often the hospital
    // is below the middle (hospital pins), from the server.
    level?: "lower" | "middle" | "higher" | null;
    lat: number;
    lng: number;
  }[];
  origin: { lat: number; lng: number };
  // True when distances are from the phone's own location.
  here: boolean;
  onSelect?: (hospitalKey: string) => void;
  // "price": a price tag per hospital (default). "hospital": a hospital
  // marker with its short name, for the map before a service is picked.
  kind?: "price" | "hospital";
  // Room the floating controls cover, so the pins stay visible.
  insets?: { top: number; bottom: number };
};

// Green to red: the colours for lower, middle and higher prices.
export const LEVEL_COLORS = {
  lower: { solid: "#0F9D76", bg: "bg-mint-soft", text: "text-mint-ink" },
  middle: { solid: "#D97706", bg: "bg-amber-soft", text: "text-amber-ink" },
  higher: { solid: "#E5484D", bg: "bg-coral-soft", text: "text-coral-ink" },
} as const;

export const LEVEL_WORDS = {
  lower: "lower than most near you",
  middle: "in the middle near you",
  higher: "higher than most near you",
} as const;
