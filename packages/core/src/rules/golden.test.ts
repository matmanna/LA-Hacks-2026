// Golden test on C's synthetic fixtures (data/synthetic/bills/*.json).
// Expected flags match by lever plus at least one shared lineId (C's rule).
// Unit bounds come from C's CMS MUE subset (data/rules/mue-subset.json);
// prices from C's captures (data/hospitals/*/capture.json, outpatient cash).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { Bill, Eob, Lever } from "../schemas";
import { pricesFromCapture } from "./capture";
import { runAudit } from "./index";
import { unitBoundsFromMue } from "./mue";
import type { PublishedPrice, UnitBound } from "./types";

const root = (p: string) =>
  fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
const billsDir = root("data/synthetic/bills");
const boundsFile = root("data/rules/mue-subset.json");
const hospitalsDir = root("data/hospitals");

type Fixture = {
  id: string;
  bill: Bill;
  eob: Eob | null;
  expected: { flags: { lever: Lever; lineIds: string[] }[] };
};

const fixtures: Fixture[] = existsSync(billsDir)
  ? readdirSync(billsDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => JSON.parse(readFileSync(`${billsDir}/${f}`, "utf8")))
  : [];

const unitBounds: UnitBound[] = existsSync(boundsFile)
  ? unitBoundsFromMue(JSON.parse(readFileSync(boundsFile, "utf8")))
  : [];

const prices: PublishedPrice[] = existsSync(hospitalsDir)
  ? readdirSync(hospitalsDir)
      .map((d) => `${hospitalsDir}/${d}/capture.json`)
      .filter((f) => existsSync(f))
      .flatMap((f) => pricesFromCapture(JSON.parse(readFileSync(f, "utf8"))))
  : [];

const levers: Lever[] = [
  "duplicate",
  "eob_mismatch",
  "missing_itemization",
  ...(unitBounds.length ? (["units"] as const) : []),
  ...(prices.length ? (["published_price"] as const) : []),
];

describe("golden fixtures", () => {
  it.skipIf(fixtures.length > 0)("no fixtures found yet", () => {});

  for (const fx of fixtures) {
    it(`${fx.id} yields its expected flags`, () => {
      const { flags } = runAudit({
        bill: fx.bill,
        eob: fx.eob,
        unitBounds,
        prices,
        enabledLevers: levers,
      });
      const expected = fx.expected.flags.filter((e) =>
        levers.includes(e.lever),
      );
      expect(flags).toHaveLength(expected.length);
      for (const e of expected) {
        const hit = flags.find(
          (f) =>
            f.lever === e.lever &&
            f.lineIds.some((id) => e.lineIds.includes(id)),
        );
        expect(hit, `${fx.id}: missing ${e.lever}`).toBeDefined();
      }
    });
  }
});
