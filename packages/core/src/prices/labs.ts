// Labs' own online self-pay prices (Labcorp OnDemand, Quest): the test is
// ordered online and the blood is drawn at one of the lab's locations. A
// different source from hospitals' price files, so it is never ranked with
// them. Pure: captures come from data/labs.
import { formatWholeDollars } from "../money";

export type LabCapture = {
  labKey: string;
  labName: string;
  capturedAt: string;
  sources: readonly { kind: string; url: string; sha256?: string | null }[];
  prices: readonly {
    code: string;
    productName: string;
    cashCents: number | null;
    listedPriceCents?: number | null;
    addedFees?: readonly { name: string; cents: number }[];
    includes?: string | null;
    sourceUrl: string;
    quote: string;
  }[];
};

export type LabPrice = {
  labKey: string;
  // "Quest Diagnostics", without the site name in brackets.
  labName: string;
  productName: string;
  cashCents: number;
  // What the price is made of, in the lab's terms: "$29 test + $6 Physician
  // Service Fee", or the lab's own words on what it includes.
  detail: string | null;
  // The exact price text on the lab's page.
  quote: string;
  sourceUrl: string;
  sourceSha256: string | null;
  capturedAt: string;
};

// Each lab's published online price for one service, lowest first.
export function labPrices({
  labs,
  code,
}: {
  labs: readonly LabCapture[];
  code: string;
}): LabPrice[] {
  const rows: LabPrice[] = [];
  for (const lab of labs) {
    const p = lab.prices.find((x) => x.code === code);
    if (!p || p.cashCents === null) continue;
    const fees = p.addedFees ?? [];
    const detail =
      fees.length > 0 && p.listedPriceCents != null
        ? [
            `${formatWholeDollars(p.listedPriceCents)} test`,
            ...fees.map((f) => `${formatWholeDollars(f.cents)} ${f.name}`),
          ].join(" + ")
        : (p.includes ?? null);
    rows.push({
      labKey: lab.labKey,
      labName: lab.labName.replace(/\s*\(.*\)\s*$/, ""),
      productName: p.productName,
      cashCents: p.cashCents,
      detail,
      quote: p.quote,
      sourceUrl: p.sourceUrl,
      sourceSha256:
        lab.sources.find((s) => s.url === p.sourceUrl)?.sha256 ?? null,
      capturedAt: lab.capturedAt,
    });
  }
  return rows.sort(
    (a, b) => a.cashCents - b.cashCents || a.labName.localeCompare(b.labName),
  );
}
