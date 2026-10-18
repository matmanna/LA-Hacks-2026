import { describe, expect, it } from "vitest";

import {
  distanceMiles,
  type NearbyCapture,
  nearbyPrices,
  summarizeNearby,
} from "./nearby";
import { SERVICES } from "./services";

const origin = { lat: 34.0522, lng: -118.2437 };

const capture = (
  key: string,
  prices: NearbyCapture["prices"],
  location: NearbyCapture["location"] = {
    address: `${key} St (synthetic)`,
    lat: 34.1,
    lng: -118.3,
  },
): NearbyCapture => ({
  hospitalKey: key,
  hospitalName: `${key} Hospital (synthetic)`,
  capturedAt: "2026-10-18T15:00:00Z",
  sources: [
    { kind: "cms_hpt_txt", url: `https://${key}.example/cms-hpt.txt` },
    { kind: "price_page", url: `https://${key}.example/prices` },
    {
      kind: "mrf",
      url: `https://${key}.example/mrf.json`,
      sha256: "abc",
      fileLastUpdatedOn: "2026-04-01",
    },
  ],
  location,
  prices,
});

const row = (
  code: string,
  cash: number | null,
  setting = "outpatient",
  gross: number | null = 9_999,
) => ({
  code,
  setting,
  discountedCashCents: cash,
  grossChargeCents: gross,
});

describe("distanceMiles", () => {
  it("matches the known great-circle distance from LAX to JFK", () => {
    const lax = { lat: 33.9425, lng: -118.4081 };
    const jfk = { lat: 40.6397, lng: -73.7789 };
    expect(distanceMiles(lax, jfk)).toBeGreaterThan(2465);
    expect(distanceMiles(lax, jfk)).toBeLessThan(2480);
  });

  it("rounds to one decimal and is zero for the same point", () => {
    expect(distanceMiles(origin, origin)).toBe(0);
    // One degree of latitude is about 69.1 miles.
    expect(distanceMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBe(69.1);
  });
});

describe("nearbyPrices", () => {
  const captures = [
    capture("b", [row("72148", 5_000)]),
    capture("a", [row("72148", 3_000), row("85025", 700)]),
    capture("c", [row("72148", null)]),
    capture("d", [row("72148", 1_000)], null),
    capture("e", [row("72148", 4_000, "inpatient")]),
    capture("f", [
      row("72148", 2_000, "inpatient"),
      row("72148", 4_500, "both"),
    ]),
  ];

  it("ranks by published cash price, with no cash price last", () => {
    const rows = nearbyPrices({ captures, code: "72148", origin });
    expect(rows.map((r) => [r.hospitalKey, r.discountedCashCents])).toEqual([
      ["a", 3_000],
      ["f", 4_500],
      ["b", 5_000],
      ["c", null],
    ]);
  });

  it("omits hospitals without a location and inpatient-only rows", () => {
    const keys = nearbyPrices({ captures, code: "72148", origin }).map(
      (r) => r.hospitalKey,
    );
    expect(keys).not.toContain("d");
    expect(keys).not.toContain("e");
  });

  it("cites the price file and its hash", () => {
    const [first] = nearbyPrices({ captures, code: "85025", origin });
    expect(first).toEqual({
      hospitalKey: "a",
      hospitalName: "a Hospital (synthetic)",
      address: "a St (synthetic)",
      distanceMiles: distanceMiles(origin, { lat: 34.1, lng: -118.3 }),
      discountedCashCents: 700,
      grossChargeCents: 9_999,
      setting: "outpatient",
      capturedAt: "2026-10-18T15:00:00Z",
      sourceUrl: "https://a.example/mrf.json",
      sourceSha256: "abc",
      pageUrl: "https://a.example/prices",
      fileUpdatedOn: "2026-04-01",
      policy: null,
      rank: 1,
      shareOfHighest: 1,
      lat: 34.1,
      lng: -118.3,
    });
  });

  it("breaks price ties by distance", () => {
    const near = capture("near", [row("1", 100)], {
      address: "x",
      lat: 34.06,
      lng: -118.25,
    });
    const far = capture("far", [row("1", 100)], {
      address: "y",
      lat: 34.5,
      lng: -118.9,
    });
    const rows = nearbyPrices({ captures: [far, near], code: "1", origin });
    expect(rows.map((r) => r.hospitalKey)).toEqual(["near", "far"]);
  });

  it("falls back when a capture has no mrf source, hash, page or list price", () => {
    const bare = (key: string, sources: NearbyCapture["sources"]) => ({
      ...capture(key, [
        { code: "1", setting: "outpatient", discountedCashCents: 100 },
      ]),
      sources,
    });
    const rows = nearbyPrices({
      captures: [
        bare("z", [{ kind: "cms_hpt_txt", url: "https://z.example/hpt" }]),
        bare("y", []),
      ],
      code: "1",
      origin,
    });
    // Same price and distance: ties go by name.
    expect(rows.map((r) => r.hospitalKey)).toEqual(["y", "z"]);
    expect(rows[0]).toMatchObject({
      sourceUrl: "",
      sourceSha256: null,
      pageUrl: null,
      grossChargeCents: null,
      fileUpdatedOn: null,
    });
    expect(rows[1]?.sourceUrl).toBe("https://z.example/hpt");
  });

  it("ranks priced rows and gives each a share of the highest price", () => {
    const rows = nearbyPrices({ captures, code: "72148", origin });
    expect(rows.map((r) => [r.rank, r.shareOfHighest])).toEqual([
      [1, 0.6],
      [2, 0.9],
      [3, 1],
      [null, null],
    ]);
  });

  it("carries the hospital's captured assistance policy", () => {
    const policy = {
      policyUrl: "https://p.example/fap",
      capturedAt: "2026-10-17T23:10:40Z",
      freeCareMaxFplPct: 400,
      discountMaxFplPct: 600,
    };
    const [row] = nearbyPrices({
      captures: [{ ...capture("p", [row85025()]), policy }],
      code: "85025",
      origin,
    });
    expect(row?.policy).toEqual(policy);
  });

  it("returns an empty list for an unknown code", () => {
    expect(nearbyPrices({ captures, code: "00000", origin })).toEqual([]);
  });
});

const row85025 = () => row("85025", 700);

describe("summarizeNearby", () => {
  it("gives the lowest, a real middle price and the highest", () => {
    const rows = nearbyPrices({
      captures: [
        capture("a", [row("1", 100)]),
        capture("b", [row("1", 300)]),
        capture("c", [row("1", 200)]),
        capture("d", [row("1", 400)]),
        capture("e", [row("1", null)]),
      ],
      code: "1",
      origin,
    });
    expect(summarizeNearby(rows)).toEqual({
      hospitals: 5,
      priced: 4,
      lowCents: 100,
      middleCents: 200,
      highCents: 400,
      middleShareOfHighest: 0.5,
    });
  });

  it("is empty when nothing has a cash price", () => {
    expect(summarizeNearby([])).toEqual({
      hospitals: 0,
      priced: 0,
      lowCents: null,
      middleCents: null,
      highCents: null,
      middleShareOfHighest: null,
    });
  });
});

describe("SERVICES", () => {
  it("lists each comparable service once, with plain words to find it", () => {
    const codes = SERVICES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toEqual([
      "72148",
      "85025",
      "99284",
      "70450",
      "72100",
      "71046",
      "76700",
      "74177",
      "73721",
      "77067",
      "80053",
    ]);
    for (const s of SERVICES) {
      expect(s.terms.length).toBeGreaterThan(0);
      expect(s.notCovered).not.toBe("");
    }
  });
});
