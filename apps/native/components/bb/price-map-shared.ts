// Shared by price-map.tsx (web) and price-map.native.tsx (phones). Kept in
// its own file: on phones "./price-map" resolves to the .native file itself.
// Pins appear one every PIN_STEP_MS; the sheet waits for the last one.
export const PIN_STEP_MS = 180;

export type PriceMapProps = {
  rows: readonly {
    hospitalKey: string;
    hospitalName: string;
    distanceMiles: number;
    discountedCashCents: number | null;
    rank: number | null;
    shareOfHighest: number | null;
    lat: number;
    lng: number;
  }[];
  origin: { lat: number; lng: number };
  // True when distances are from the phone's own location.
  here: boolean;
  onSelect?: (hospitalKey: string) => void;
  // Room the floating controls cover, so the pins stay visible.
  insets?: { top: number; bottom: number };
};
