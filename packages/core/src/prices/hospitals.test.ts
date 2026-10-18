import { describe, expect, it } from "vitest";

import { hospitalDetail, nearbyHospitals } from "./hospitals";
import type { NearbyCapture } from "./nearby";
import { searchHospitals } from "./search";
import type { PriceService } from "./services";

const origin = { lat: 34.0, lng: -118.0 };

const services: PriceService[] = [
  { code: "1", name: "One", short: "One", what: "", notCovered: "", terms: [] },
  { code: "2", name: "Two", short: "Two", what: "", notCovered: "", terms: [] },
  {
    code: "3",
    name: "Three",
    short: "Three",
    what: "",
    notCovered: "",
    terms: [],
  },
];

const capture = (
  key: string,
  lat: number,
  cash: Record<string, number | null>,
): NearbyCapture => ({
  hospitalKey: key,
  hospitalName: `${key} Medical Center (synthetic)`,
  capturedAt: "2026-10-18T15:00:00Z",
  sources: [
    { kind: "mrf", url: `https://${key}.example/mrf.json`, sha256: "abc" },
  ],
  location: { address: `${key} St`, lat, lng: -118.0 },
  prices: Object.entries(cash).map(([code, c]) => ({
    code,
    setting: "outpatient",
    discountedCashCents: c,
    grossChargeCents: null,
  })),
});

// Service 1: a 100, b 200, c 300 (middle 200). Service 2: a 50, b 50 (tie,
// middle 50). Service 3: only c, so nobody is "lowest" against no one.
const captures = [
  capture("a", 34.1, { "1": 100, "2": 50 }),
  capture("b", 34.2, { "1": 200, "2": 50 }),
  capture("c", 34.3, { "1": 300, "3": 900 }),
  capture("d", 34.4, { "1": null }),
];

describe("nearbyHospitals", () => {
  it("lists hospitals nearest first with counts, never averages", () => {
    expect(
      nearbyHospitals({ captures, origin, services }).map((h) => [
        h.hospitalKey,
        h.services,
        h.lowestOn,
        h.belowMiddleOn,
      ]),
    ).toEqual([
      ["a", 2, 2, 1],
      ["b", 2, 1, 0],
      ["c", 2, 0, 0],
      ["d", 1, 0, 0],
    ]);
  });
});

describe("hospitalDetail", () => {
  it("ranks each service among nearby hospitals, lowest first", () => {
    const b = hospitalDetail({ captures, origin, services, hospitalKey: "b" });
    expect(
      b?.prices.map((p) => [p.code, p.rank, p.priced, p.lowest, p.belowMiddle]),
    ).toEqual([
      ["2", 2, 2, true, false],
      ["1", 2, 3, false, false],
    ]);
    expect(b?.sourceUrl).toBe("https://b.example/mrf.json");
  });

  it("puts services without a cash price last", () => {
    const d = hospitalDetail({ captures, origin, services, hospitalKey: "d" });
    expect(d?.prices.map((p) => [p.code, p.rank])).toEqual([["1", null]]);
  });

  it("returns null for a hospital we did not capture", () => {
    expect(
      hospitalDetail({ captures, origin, services, hospitalKey: "zzz" }),
    ).toBeNull();
  });
});

describe("searchHospitals", () => {
  const list = [
    { hospitalName: "Providence Saint John's Health Center" },
    { hospitalName: "Providence Saint Joseph Medical Center" },
    { hospitalName: "Cedars-Sinai Medical Center" },
  ];
  it("matches word starts in the name", () => {
    expect(searchHospitals("saint jo", list)).toHaveLength(2);
    expect(searchHospitals("cedars", list)).toHaveLength(1);
    expect(searchHospitals("sinai", list)).toHaveLength(1);
    expect(searchHospitals("kaiser", list)).toHaveLength(0);
    expect(searchHospitals("", list)).toHaveLength(3);
  });
});
