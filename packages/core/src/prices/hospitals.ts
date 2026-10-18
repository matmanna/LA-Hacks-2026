// One hospital across every service we compare: where its published cash
// price ranks among the hospitals near the patient. Counts, never averages:
// an average across an MRI and a blood test would mean nothing.
import {
  type AssistancePolicy,
  type LatLng,
  type NearbyCapture,
  nearbyPrices,
  summarizeNearby,
} from "./nearby";
import { type PriceService, SERVICES } from "./services";

export type HospitalServicePrice = {
  code: string;
  name: string;
  short: string;
  discountedCashCents: number | null;
  grossChargeCents: number | null;
  // Order among the hospitals near the patient with a cash price for it.
  rank: number | null;
  // How many hospitals near the patient publish a cash price for it.
  priced: number;
  // Ties for the lowest price count as lowest.
  lowest: boolean;
  belowMiddle: boolean;
};

export type HospitalSummary = {
  hospitalKey: string;
  hospitalName: string;
  address: string;
  distanceMiles: number;
  lat: number;
  lng: number;
  // Services with a row in this hospital's file.
  services: number;
  // Services where its cash price is the lowest near the patient.
  lowestOn: number;
  // Services where its cash price is below the middle one near the patient.
  belowMiddleOn: number;
};

export type HospitalDetail = HospitalSummary & {
  prices: HospitalServicePrice[];
  capturedAt: string;
  sourceUrl: string;
  sourceSha256: string | null;
  pageUrl: string | null;
  fileUpdatedOn: string | null;
  policy: AssistancePolicy | null;
};

type Args = {
  captures: readonly NearbyCapture[];
  origin: LatLng;
  services?: readonly PriceService[];
};

function byHospital({ captures, origin, services = SERVICES }: Args) {
  const out = new Map<string, HospitalDetail>();
  for (const service of services) {
    const rows = nearbyPrices({ captures, code: service.code, origin });
    const s = summarizeNearby(rows);
    for (const r of rows) {
      const cash = r.discountedCashCents;
      const lowest = cash !== null && s.priced > 1 && cash === s.lowCents;
      const belowMiddle =
        cash !== null && s.middleCents !== null && cash < s.middleCents;
      const h = out.get(r.hospitalKey) ?? {
        hospitalKey: r.hospitalKey,
        hospitalName: r.hospitalName,
        address: r.address,
        distanceMiles: r.distanceMiles,
        lat: r.lat,
        lng: r.lng,
        services: 0,
        lowestOn: 0,
        belowMiddleOn: 0,
        prices: [],
        capturedAt: r.capturedAt,
        sourceUrl: r.sourceUrl,
        sourceSha256: r.sourceSha256,
        pageUrl: r.pageUrl,
        fileUpdatedOn: r.fileUpdatedOn,
        policy: r.policy,
      };
      h.services += 1;
      if (lowest) h.lowestOn += 1;
      if (belowMiddle) h.belowMiddleOn += 1;
      h.prices.push({
        code: service.code,
        name: service.name,
        short: service.short,
        discountedCashCents: cash,
        grossChargeCents: r.grossChargeCents,
        rank: r.rank,
        priced: s.priced,
        lowest,
        belowMiddle,
      });
      out.set(r.hospitalKey, h);
    }
  }
  return out;
}

// Every captured hospital with a location, nearest first.
export function nearbyHospitals(args: Args): HospitalSummary[] {
  return [...byHospital(args).values()]
    .map((h) => ({
      hospitalKey: h.hospitalKey,
      hospitalName: h.hospitalName,
      address: h.address,
      distanceMiles: h.distanceMiles,
      lat: h.lat,
      lng: h.lng,
      services: h.services,
      lowestOn: h.lowestOn,
      belowMiddleOn: h.belowMiddleOn,
    }))
    .sort(
      (a, b) =>
        a.distanceMiles - b.distanceMiles ||
        a.hospitalName.localeCompare(b.hospitalName),
    );
}

// One hospital's prices, lowest rank first (no cash price last), or null
// when the hospital is not captured or has no location.
export function hospitalDetail(
  args: Args & { hospitalKey: string },
): HospitalDetail | null {
  const h = byHospital(args).get(args.hospitalKey);
  if (!h) return null;
  const order = (p: HospitalServicePrice) =>
    p.lowest ? 0 : (p.rank ?? Number.POSITIVE_INFINITY);
  h.prices.sort((a, b) => order(a) - order(b));
  return h;
}
