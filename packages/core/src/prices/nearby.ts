// Ranks hospitals by the cash price they publish for one service, with the
// distance from the patient. Pure: captures come from data/hospitals.
export type NearbyCapture = {
  hospitalKey: string;
  hospitalName: string;
  capturedAt: string;
  sources: readonly {
    kind: string;
    url: string;
    sha256?: string | null;
    fileLastUpdatedOn?: string | null;
  }[];
  location?: { address: string; lat: number; lng: number } | null;
  policy?: AssistancePolicy | null;
  prices: readonly {
    code: string;
    setting: string;
    discountedCashCents: number | null;
    grossChargeCents?: number | null;
  }[];
};

export type LatLng = { lat: number; lng: number };

export type PriceLevel = "lower" | "middle" | "higher";

// The hospital's captured financial assistance policy (data/hospitals/*/policy.json).
export type AssistancePolicy = {
  policyUrl: string;
  capturedAt: string;
  freeCareMaxFplPct: number | null;
  discountMaxFplPct: number | null;
};

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
  // The date the hospital put on its own file (last_updated_on).
  fileUpdatedOn: string | null;
  policy: AssistancePolicy | null;
  // 1 = lowest published cash price; null when the file lists no cash price.
  rank: number | null;
  // This cash price as a share of the highest one (0..1), for compare bars.
  shareOfHighest: number | null;
  // Which third of the published cash prices near the patient this one is
  // in, for map colours: lower (green), middle, higher (red). Null without
  // a cash price or when only one hospital publishes one.
  level: PriceLevel | null;
  lat: number;
  lng: number;
};

// Lowest, middle and highest published cash price among the rows. "Middle"
// is a real hospital's price (the lower middle when the count is even),
// never an average.
export type NearbySummary = {
  hospitals: number;
  priced: number;
  lowCents: number | null;
  middleCents: number | null;
  highCents: number | null;
  middleShareOfHighest: number | null;
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
      fileUpdatedOn: file?.fileLastUpdatedOn ?? null,
      policy: c.policy ?? null,
      rank: null,
      shareOfHighest: null,
      level: null,
      lat: c.location.lat,
      lng: c.location.lng,
    });
  }
  // Lowest published cash price first; no cash price last; then nearest.
  rows.sort(
    (a, b) =>
      (a.discountedCashCents ?? Number.POSITIVE_INFINITY) -
        (b.discountedCashCents ?? Number.POSITIVE_INFINITY) ||
      a.distanceMiles - b.distanceMiles ||
      a.hospitalName.localeCompare(b.hospitalName),
  );
  const high = rows.findLast(
    (r) => r.discountedCashCents !== null,
  )?.discountedCashCents;
  const priced = rows.filter((r) => r.discountedCashCents !== null).length;
  let rank = 0;
  return rows.map((r) => {
    if (r.discountedCashCents === null) return r;
    rank += 1;
    return {
      ...r,
      rank,
      shareOfHighest: high ? r.discountedCashCents / high : null,
      level: thirdOf(rank, priced),
    };
  });
}

export function summarizeNearby(rows: readonly NearbyPrice[]): NearbySummary {
  const cash = rows
    .map((r) => r.discountedCashCents)
    .filter((c): c is number => c !== null)
    .sort((a, b) => a - b);
  const low = cash[0] ?? null;
  const high = cash[cash.length - 1] ?? null;
  const middle = cash[Math.floor((cash.length - 1) / 2)] ?? null;
  return {
    hospitals: rows.length,
    priced: cash.length,
    lowCents: low,
    middleCents: middle,
    highCents: high,
    middleShareOfHighest: middle !== null && high ? middle / high : null,
  };
}

// Lower, middle or higher third by rank among n priced hospitals.
export function thirdOf(rank: number, n: number): PriceLevel | null {
  if (n < 2) return null;
  const at = (rank - 1) / (n - 1);
  return at <= 1 / 3 ? "lower" : at >= 2 / 3 ? "higher" : "middle";
}
