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
    expect(await client.price.services({})).toEqual([...SERVICES]);
  });

  it("returns only prices that are in a captured price file", async () => {
    for (const { code } of SERVICES) {
      const rows = await client.price.nearby({ code, ...downtownLA });
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
    const rows = await client.price.nearby({ code: "72148", ...downtownLA });
    const cash = rows
      .map((r) => r.discountedCashCents)
      .filter((c): c is number => c !== null);
    expect(cash).toEqual([...cash].sort((a, b) => a - b));
    expect(rows.every((r) => r.distanceMiles > 0)).toBe(true);
  });

  it("returns nothing for an unknown code and rejects a bad location", async () => {
    expect(await client.price.nearby({ code: "00000", ...downtownLA })).toEqual(
      [],
    );
    await expect(
      client.price.nearby({ code: "72148", lat: 120, lng: 0 }),
    ).rejects.toThrow();
  });
});
