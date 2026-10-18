import type { Assistance, Flag } from "../schemas";

// The letter's "please send me the application" paragraph, as a flag the
// letter drafter and claim checker already understand. $0 and tier estimate:
// the hospital decides, so it never claims an amount.
export function assistanceFlag(a: Assistance): Flag | null {
  if (a.status !== "likely" && a.status !== "possible") return null;
  const sources = (a.checks ?? [])
    .filter(
      (c) =>
        c.outcome === "may_help" &&
        (c.id === "policy" || c.id.startsWith("state:")),
    )
    .map((c) => (c.kind === "policy" ? c.title : (c.source?.label ?? c.title)));
  const under = sources.length
    ? sources.join(" and ")
    : "the hospital's policy";
  const what = a.freeCare ? "free care" : "a discount";
  return {
    id: "assistance:screen",
    lineIds: [],
    lever: "assistance",
    tier: "estimate",
    title: a.freeCare
      ? "May qualify for free care"
      : "May qualify for a discount",
    explanation: `Based on your answers, you may qualify for ${what} under ${under}. This is an estimate, and the hospital decides.`,
    amountCents: 0,
    evidence: {
      kind: "quote",
      detail: under,
      ...(a.quote ? { quote: a.quote } : {}),
      ...(a.sourceUrl ? { sourceUrl: a.sourceUrl } : {}),
      ...(a.capturedAt ? { capturedAt: a.capturedAt } : {}),
    },
    confidence: 0.5,
  };
}
