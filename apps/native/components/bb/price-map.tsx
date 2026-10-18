export type PriceMapProps = {
  rows: readonly {
    hospitalKey: string;
    hospitalName: string;
    distanceMiles: number;
    discountedCashCents: number | null;
    lat: number;
    lng: number;
  }[];
  origin: { lat: number; lng: number };
  // True when distances are from the phone's own location.
  here: boolean;
};

// The map needs native maps (price-map.native.tsx). On the web the ranked
// list carries the screen, so this renders nothing.
export function PriceMap(_: PriceMapProps) {
  return null;
}
