import { SERVICES } from "@betterbill/core";
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "../context";
import { DATA } from "../data.gen";
import { appRouter } from "./index";

const context: Context = { db: {} as never, session: null, adapter: false };
const client = createRouterClient(appRouter, { context });
const downtownLA = { lat: 34.0522, lng: -118.2437 };

describe("price routes", () => {
  it("lists the four services", async () => {
    expect(await client.price.services({})).toEqual(
      SERVICES.map((s) => ({ ...s, terms: [...s.terms] })),
    );
  });

  it("returns only prices that are in a captured price file", async () => {
    for (const { code } of SERVICES) {
      const { rows, summary } = await client.price.nearby({
        code,
        ...downtownLA,
      });
      expect(summary.hospitals).toBe(rows.length);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const capture = DATA.captures.find(
          (c) => c.hospitalKey === r.hospitalKey,
        );
        const file = capture?.sources.find((s) => s.kind === "mrf");
        expect(file?.url).toBe(r.sourceUrl);
        expect(file?.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(r.sourceSha256).toBe(file?.sha256);
        expect(capture?.location?.lat).toBe(r.lat);
        expect(r.pageUrl).toMatch(/^https:\/\//);
        expect(r.fileUpdatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(
          capture?.prices.some(
            (p) =>
              p.code === code &&
              p.setting === r.setting &&
              p.discountedCashCents === r.discountedCashCents,
          ),
        ).toBe(true);
      }
    }
  });

  it("ranks by cash price and measures distance from the patient", async () => {
    const { rows, summary } = await client.price.nearby({
      code: "72148",
      ...downtownLA,
    });
    expect(summary.lowCents).toBe(rows[0]?.discountedCashCents);
    expect(rows[0]?.rank).toBe(1);
    const cash = rows
      .map((r) => r.discountedCashCents)
      .filter((c): c is number => c !== null);
    expect(cash).toEqual([...cash].sort((a, b) => a - b));
    expect(rows.every((r) => r.distanceMiles > 0)).toBe(true);
  });

  it("carries a captured assistance policy only where one exists", async () => {
    const { rows } = await client.price.nearby({
      code: "72148",
      ...downtownLA,
    });
    const cedars = rows.find((r) => r.hospitalKey === "cedars-sinai");
    expect(cedars?.policy?.freeCareMaxFplPct).toBe(400);
    expect(
      rows.find((r) => r.hospitalKey === "providence-tarzana")?.policy,
    ).toBe(null);
  });

  it("returns nothing for an unknown code and rejects a bad location", async () => {
    const none = await client.price.nearby({ code: "00000", ...downtownLA });
    expect(none.rows).toEqual([]);
    expect(none.summary.priced).toBe(0);
    await expect(
      client.price.nearby({ code: "72148", lat: 120, lng: 0 }),
    ).rejects.toThrow();
  });
});
