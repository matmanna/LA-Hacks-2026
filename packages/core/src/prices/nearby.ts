// Ranks hospitals by the cash price they publish for one service, with the
// distance from the patient. Pure: captures come from data/hospitals.
export type NearbyCapture = {
  hospitalKey: string;
  hospitalName: string;
  capturedAt: string;
  sources: readonly { kind: string; url: string; sha256?: string | null }[];
  location?: { address: string; lat: number; lng: number } | null;
  prices: readonly {
    code: string;
    setting: string;
    discountedCashCents: number | null;
    grossChargeCents?: number | null;
  }[];
};

export type LatLng = { lat: number; lng: number };

export type NearbyPrice = {
  hospitalKey: string;
  hospitalName: string;
  address: string;
  distanceMiles: number;
  discountedCashCents: number | null;
  grossChargeCents: number | null;
  setting: string;
  capturedAt: string;
  // The machine-readable file the price came from, and its sha256.
  sourceUrl: string;
  sourceSha256: string | null;
  // The hospital's price transparency page that links the file (the file
  // itself is hundreds of MB, too big to open on a phone).
  pageUrl: string | null;
  lat: number;
  lng: number;
};

const EARTH_RADIUS_MILES = 3958.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

// Great-circle (haversine) distance in miles, rounded to one decimal.
export function distanceMiles(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const miles = 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(miles * 10) / 10;
}

// A visit price: the outpatient row, else a row the file marks "both".
// Inpatient-only rows are not a price for a visit.
const SETTINGS = ["outpatient", "both"];

export function nearbyPrices({
  captures,
  code,
  origin,
}: {
  captures: readonly NearbyCapture[];
  code: string;
  origin: LatLng;
}): NearbyPrice[] {
  const rows: NearbyPrice[] = [];
  for (const c of captures) {
    if (!c.location) continue;
    const price = SETTINGS.map((s) =>
      c.prices.find((p) => p.code === code && p.setting === s),
    ).find(Boolean);
    if (!price) continue;
    const file = c.sources.find((s) => s.kind === "mrf") ?? c.sources[0];
    const page = c.sources.find((s) => s.kind === "price_page");
    rows.push({
      hospitalKey: c.hospitalKey,
      hospitalName: c.hospitalName,
      address: c.location.address,
      distanceMiles: distanceMiles(origin, c.location),
      discountedCashCents: price.discountedCashCents,
      grossChargeCents: price.grossChargeCents ?? null,
      setting: price.setting,
      capturedAt: c.capturedAt,
      sourceUrl: file?.url ?? "",
      sourceSha256: file?.sha256 ?? null,
      pageUrl: page?.url ?? null,
      lat: c.location.lat,
      lng: c.location.lng,
    });
  }
  // Lowest published cash price first; no cash price last; then nearest.
  return rows.sort(
    (a, b) =>
      (a.discountedCashCents ?? Number.POSITIVE_INFINITY) -
        (b.discountedCashCents ?? Number.POSITIVE_INFINITY) ||
      a.distanceMiles - b.distanceMiles ||
      a.hospitalName.localeCompare(b.hospitalName),
  );
}
