// Browser Use Cloud v4 client (server only). The key comes from
// BROWSER_USE_API_KEY and never reaches the app. Docs:
// https://docs.browser-use.com/cloud/api-v4/runs/create-run.md
import {
  POLICY_LOOKUP_SCHEMA,
  type PolicyLookupOutput,
  policyLookupTask,
} from "@betterbill/core";

const BASE = "https://api.browser-use.com/api/v4";
// Hard cap per lookup. A policy run cost about $0.015 when measured.
export const MAX_COST_USD = 1;

export type RunStatus =
  | "queued"
  | "dispatching"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RunSummary = {
  id: string;
  status: RunStatus;
  output: unknown;
  result: string | null;
  error: string | null;
  totalCostUsd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RunEvent = {
  id: number;
  ts: string;
  type: string;
  data: Record<string, unknown>;
};

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export function browserUseKey(): string | null {
  return process.env.BROWSER_USE_API_KEY || null;
}

async function call<T>(
  f: Fetch,
  key: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await f(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-Browser-Use-API-Key": key,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Browser Use ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function startPolicyLookup(
  key: string,
  hospital: { name: string; city: string | null; state: string | null },
  f: Fetch = fetch,
): Promise<{ id: string; sessionId: string; status: RunStatus }> {
  return call(f, key, "/runs", {
    method: "POST",
    body: JSON.stringify({
      task: policyLookupTask(hospital),
      outputSchema: POLICY_LOOKUP_SCHEMA,
      maxCostUsd: MAX_COST_USD,
    }),
  });
}

export function getRun(
  key: string,
  runId: string,
  f: Fetch = fetch,
): Promise<RunSummary> {
  return call(f, key, `/runs/${encodeURIComponent(runId)}`);
}

export function getRunEvents(
  key: string,
  runId: string,
  after = 0,
  f: Fetch = fetch,
): Promise<{ events: RunEvent[]; nextAfter: number | null; hasMore: boolean }> {
  return call(
    f,
    key,
    `/runs/${encodeURIComponent(runId)}/events?after=${after}&limit=200&include_output=false`,
  );
}

// The live view of a running browser session (null once it stops). Anyone
// with this URL can control that browser, so it is never stored or shared.
export async function getLiveUrl(
  key: string,
  browserSessionId: string,
  f: Fetch = fetch,
): Promise<string | null> {
  const b = await call<{ liveUrl: string | null }>(
    f,
    key,
    `/browsers/${encodeURIComponent(browserSessionId)}`,
  );
  return b.liveUrl ?? null;
}

export const isDone = (s: RunStatus) =>
  s === "completed" || s === "failed" || s === "cancelled";

// The run's structured output, if it matches the lookup schema.
export function lookupOutput(run: RunSummary): PolicyLookupOutput | null {
  let o = run.output;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o);
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== "object") return null;
  const v = o as Partial<PolicyLookupOutput>;
  if (typeof v.policy_url !== "string" || !Array.isArray(v.quotes)) {
    return null;
  }
  return {
    policy_url: v.policy_url,
    policy_title: typeof v.policy_title === "string" ? v.policy_title : "",
    pdf_urls: Array.isArray(v.pdf_urls)
      ? v.pdf_urls.filter((u): u is string => typeof u === "string")
      : [],
    quotes: v.quotes.filter((q): q is string => typeof q === "string"),
    free_care_max_fpl_pct:
      typeof v.free_care_max_fpl_pct === "number"
        ? v.free_care_max_fpl_pct
        : null,
    discount_max_fpl_pct:
      typeof v.discount_max_fpl_pct === "number"
        ? v.discount_max_fpl_pct
        : null,
    references_501r_quote:
      typeof v.references_501r_quote === "string"
        ? v.references_501r_quote
        : null,
    billing_phone: typeof v.billing_phone === "string" ? v.billing_phone : null,
  };
}
