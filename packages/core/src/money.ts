// Money is integer cents everywhere. Display uses the true minus sign U+2212.
const MINUS = "−";
const grouping = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function moneyParts(cents: number): {
  sign: "" | typeof MINUS;
  dollars: string;
  cents: string;
} {
  const abs = Math.abs(Math.round(cents));
  return {
    sign: cents < 0 ? MINUS : "",
    dollars: grouping.format(Math.floor(abs / 100)),
    cents: String(abs % 100).padStart(2, "0"),
  };
}

export function formatMoney(cents: number): string {
  const p = moneyParts(cents);
  return `${p.sign}$${p.dollars}.${p.cents}`;
}

// "1,234.50" -> 123450; "$84" -> 8400; "-$5.5" -> -550; "abc" -> null.
// String math only, so no float rounding.
export function parseMoneyToCents(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/[$,\s]/g, "")
    .replace(MINUS, "-");
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const [, sign, whole, frac = ""] = m;
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return sign ? -cents : cents;
}
