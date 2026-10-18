import type { HospitalPolicy } from "./types";

// What the Browser Use agent returns when it looks up a hospital's
// financial assistance policy (the output schema below).
export type PolicyLookupOutput = {
  policy_url: string;
  policy_title: string;
  pdf_urls: string[];
  quotes: string[];
  free_care_max_fpl_pct: number | null;
  discount_max_fpl_pct: number | null;
  references_501r_quote: string | null;
  billing_phone: string | null;
};

export const POLICY_LOOKUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    policy_url: { type: "string" },
    policy_title: { type: "string" },
    pdf_urls: { type: "array", items: { type: "string" } },
    quotes: { type: "array", items: { type: "string" } },
    free_care_max_fpl_pct: { type: ["number", "null"] },
    discount_max_fpl_pct: { type: ["number", "null"] },
    references_501r_quote: { type: ["string", "null"] },
    billing_phone: { type: ["string", "null"] },
  },
  required: [
    "policy_url",
    "policy_title",
    "pdf_urls",
    "quotes",
    "free_care_max_fpl_pct",
    "discount_max_fpl_pct",
    "references_501r_quote",
    "billing_phone",
  ],
} as const;

export function policyLookupTask(h: {
  name: string;
  city: string | null;
  state: string | null;
}): string {
  const where = [h.city, h.state].filter(Boolean).join(", ");
  return [
    `Find the financial assistance (charity care) policy for ${h.name}${where ? ` in ${where}` : ""}.`,
    "Use the hospital's own official website.",
    "Return the policy page URL, its title, and any policy PDF links.",
    "Copy verbatim every sentence that states an income limit as a percent of the federal poverty level (FPL) or a discount amount. Do not paraphrase.",
    "Set free_care_max_fpl_pct to the highest FPL percent that gets free care, and discount_max_fpl_pct to the highest FPL percent that gets any discount, only if a copied sentence states it. Otherwise null.",
    "Copy verbatim any sentence that cites Internal Revenue Code section 501(r), else null.",
    "Give the billing or financial counseling phone number if the site shows one, else null.",
  ].join(" ");
}

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// True when a quote states this percent (e.g. "400%" or "400 percent").
export function quoteStates(quote: string, pct: number): boolean {
  const q = norm(quote);
  return new RegExp(`(^|[^0-9])${pct}\\s*(%|percent)`, "i").test(q);
}

// A policy from the agent's output, keeping only what its quotes support:
// a limit counts only when a quote states that number. When source text is
// given (the PDF or page as captured), quotes not found in it are dropped
// first. Returns null when nothing usable is left.
export function policyFromLookup(
  out: PolicyLookupOutput,
  meta: { hospitalName: string; capturedAt: string; sourceText?: string },
): { policy: HospitalPolicy; quotes: string[]; dropped: string[] } | null {
  const text = meta.sourceText ? norm(meta.sourceText).toLowerCase() : null;
  const quotes: string[] = [];
  const dropped: string[] = [];
  for (const q of out.quotes) {
    const n = norm(q);
    if (!n) continue;
    if (text && !text.includes(n.toLowerCase())) dropped.push(q);
    else quotes.push(n);
  }
  const backed = (pct: number | null) =>
    pct !== null && pct > 0
      ? quotes.find((q) => quoteStates(q, pct))
      : undefined;
  const freeQuote = backed(out.free_care_max_fpl_pct);
  const discQuote = backed(out.discount_max_fpl_pct);
  if (!out.policy_url || (!freeQuote && !discQuote)) return null;
  const r501 = out.references_501r_quote
    ? norm(out.references_501r_quote)
    : null;
  return {
    policy: {
      hospitalName: meta.hospitalName,
      policyTitle: out.policy_title || "Financial Assistance Policy",
      policyUrl: out.policy_url,
      capturedAt: meta.capturedAt,
      freeCareMaxFplPct: freeQuote ? out.free_care_max_fpl_pct : null,
      freeCareQuote: freeQuote ?? null,
      discountMaxFplPct: discQuote ? out.discount_max_fpl_pct : null,
      discountQuote: discQuote ?? null,
      references501r:
        r501 &&
        /501\s*\(r\)/i.test(r501) &&
        (!text || text.includes(r501.toLowerCase()))
          ? r501
          : null,
    },
    quotes,
    dropped,
  };
}

// One Browser Use run event (GET /api/v4/runs/{id}/events).
export type LookupEvent = {
  id: number;
  ts: string;
  type: string;
  data: Record<string, unknown>;
};

export type LookupStep = { id: number; at: string; text: string };

const firstSentence = (s: string, max = 140) => {
  const one = s.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

// The agent's own words: the text of a "text" part, quoted either way.
function narration(part: string): string | null {
  const m =
    part.match(/'text': '((?:[^'\\]|\\.)*)'/) ??
    part.match(/'text': "((?:[^"\\]|\\.)*)"/) ??
    part.match(/"text":\s*"((?:[^"\\]|\\.)*)"/);
  const text = m?.[1]?.replace(/\\(.)/g, "$1").replace(/`/g, "").trim();
  return text ? firstSentence(text) : null;
}

// A page the agent's browser navigated to.
function opened(part: string): string | null {
  const m = part.match(/navigate\(\{\s*url:\s*\\*['"](https?:\/\/[^'"\\\s]+)/);
  if (!m?.[1]) return null;
  try {
    const u = new URL(m[1]);
    // Warm-up and local pages aren't part of the search.
    if (/^(www\.)?example\.(com|org|net)$|^localhost$|^127\./.test(u.hostname))
      return null;
    if (/\.pdf$/i.test(u.pathname)) return "Opened the policy PDF";
    return `Opened ${u.hostname.replace(/^www\./, "")}`;
  } catch {
    return null;
  }
}

// Plain progress steps from a run's events: what the agent said it was doing,
// the pages it opened and its web searches. Repeats are dropped; the latest
// steps are kept.
export function lookupSteps(events: LookupEvent[], keep = 6): LookupStep[] {
  const steps: LookupStep[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    let text: string | null = null;
    if (e.type === "search.performed") text = "Searched the web for the policy";
    else if (e.type === "core.event") {
      const part =
        typeof e.data.part === "string"
          ? e.data.part
          : JSON.stringify(e.data.part ?? "");
      if (e.data.type === "text") text = narration(part);
      else if (e.data.type === "tool_use" && part.includes("browser_execute"))
        text = opened(part);
    }
    if (!text || seen.has(text)) continue;
    seen.add(text);
    steps.push({ id: e.id, at: e.ts, text });
  }
  return steps.slice(-keep);
}
