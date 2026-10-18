import { describe, expect, it } from "vitest";

import {
  type Fetch,
  getRun,
  getRunEvents,
  isDone,
  lookupOutput,
  MAX_COST_USD,
  type RunSummary,
  startPolicyLookup,
} from "./browser-use";

// A fake fetch that records requests and answers from a script.
function fake(answers: unknown[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f: Fetch = async (url, init) => {
    calls.push({ url, init });
    const body = answers.shift();
    return new Response(JSON.stringify(body ?? {}), {
      status: body === undefined ? 500 : 200,
    });
  };
  return { f, calls };
}

const run = (p: Partial<RunSummary> = {}): RunSummary => ({
  id: "run-1",
  status: "completed",
  output: null,
  result: null,
  error: null,
  totalCostUsd: "0.01",
  createdAt: "2026-10-18T10:00:00Z",
  updatedAt: "2026-10-18T10:02:00Z",
  ...p,
});

describe("Browser Use client", () => {
  it("starts a capped policy run with the key header and the schema", async () => {
    const { f, calls } = fake([
      { id: "run-1", sessionId: "s-1", status: "queued" },
    ]);
    const r = await startPolicyLookup(
      "test-key",
      { name: "Valley General", city: "Los Angeles", state: "CA" },
      f,
    );
    expect(r.id).toBe("run-1");
    const { url, init } = calls[0] ?? { url: "" };
    expect(url).toBe("https://api.browser-use.com/api/v4/runs");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.["X-Browser-Use-API-Key"]).toBe("test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.maxCostUsd).toBe(MAX_COST_USD);
    expect(body.outputSchema.required).toContain("quotes");
    expect(body.task).toMatch(/Valley General in Los Angeles, CA/);
  });

  it("reads a run and its events after a cursor", async () => {
    const { f, calls } = fake([
      run({ status: "running" }),
      {
        events: [{ id: 3, ts: "t", type: "browser.ready", data: {} }],
        nextAfter: 3,
        hasMore: false,
      },
    ]);
    expect((await getRun("k", "run-1", f)).status).toBe("running");
    const e = await getRunEvents("k", "run-1", 2, f);
    expect(e.events[0]?.type).toBe("browser.ready");
    expect(calls[1]?.url).toContain("/runs/run-1/events?after=2");
  });

  it("throws on an error status", async () => {
    const { f } = fake([]);
    await expect(getRun("k", "run-1", f)).rejects.toThrow(/500/);
  });

  it("knows when a run is done", () => {
    expect(isDone("completed")).toBe(true);
    expect(isDone("failed")).toBe(true);
    expect(isDone("running")).toBe(false);
  });

  it("parses the structured output, as an object or a JSON string", () => {
    const o = {
      policy_url: "https://example.test/fap",
      policy_title: "FAP",
      pdf_urls: ["https://example.test/fap.pdf", 3],
      quotes: ["Free care at or below 300% of FPL."],
      free_care_max_fpl_pct: 300,
      discount_max_fpl_pct: null,
      references_501r_quote: null,
      billing_phone: "(555) 010-0000",
    };
    expect(lookupOutput(run({ output: o }))?.pdf_urls).toEqual([
      "https://example.test/fap.pdf",
    ]);
    expect(
      lookupOutput(run({ output: JSON.stringify(o) }))?.free_care_max_fpl_pct,
    ).toBe(300);
    expect(lookupOutput(run({ output: "not json" }))).toBeNull();
    expect(lookupOutput(run({ output: { quotes: [] } }))).toBeNull();
  });
});
