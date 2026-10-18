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

// The map needs native maps (price-map.native.tsx). On the web the ranked
// list carries the screen, so this renders nothing.
export function PriceMap(_: PriceMapProps) {
  return null;
}
