// Integration: the background policy lookup against Postgres, with a fake
// Browser Use (no network, no cost). The hospital is synthetic and not on file.
import { createDb } from "@betterbill/db";
import { createRouterClient } from "@orpc/server";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { appRouter } from "./index";

const url = process.env.DATABASE_URL;

const text = (hospital: string) => `HOSPITAL: ${hospital} | Los Angeles | CA
TYPE: itemized
2026-09-12  99284  CPT  ED VISIT LEVEL 4  1  2950.00
TOTAL CHARGES: 2950.00`;

const OUTPUT = {
  policy_url: "https://valley.example.test/fap",
  policy_title: "Financial Assistance Policy",
  pdf_urls: [],
  quotes: [
    "Patients with family income at or below 300% of the FPL receive free care.",
  ],
  free_care_max_fpl_pct: 300,
  discount_max_fpl_pct: null,
  references_501r_quote: null,
  billing_phone: "(555) 010-0000",
};

// A scripted Browser Use: one run whose status the test moves along.
function fakeBrowserUse() {
  const state = {
    status: "running",
    output: null as unknown,
    starts: 0,
  };
  const json = (b: unknown) =>
    new Response(JSON.stringify(b), {
      headers: { "content-type": "application/json" },
    });
  const f = vi.fn(async (input: string, init?: RequestInit) => {
    const u = String(input);
    if (u.endsWith("/runs") && init?.method === "POST") {
      state.starts += 1;
      return json({ id: "run-x", sessionId: "s-1", status: "queued" });
    }
    if (u.includes("/runs/run-x/events")) {
      return json({
        events: [
          {
            id: 1,
            ts: "2026-10-18T10:00:01Z",
            type: "browser.ready",
            data: { browser_session_id: "b-1" },
          },
          {
            id: 2,
            ts: "2026-10-18T10:00:02Z",
            type: "core.event",
            data: {
              type: "text",
              part: "{'text': 'I will find the policy on the hospital site.'}",
            },
          },
          {
            id: 3,
            ts: "2026-10-18T10:00:03Z",
            type: "search.performed",
            data: {},
          },
        ],
        nextAfter: 3,
        hasMore: false,
      });
    }
    if (u.endsWith("/runs/run-x")) {
      return json({
        id: "run-x",
        status: state.status,
        output: state.output,
        result: null,
        error: null,
        totalCostUsd: "0.02",
        createdAt: "2026-10-18T10:00:00Z",
        updatedAt: "2026-10-18T10:02:00Z",
      });
    }
    if (u.endsWith("/browsers/b-1")) {
      return json({ liveUrl: "https://live.example.test/view" });
    }
    return new Response("not found", { status: 404 });
  });
  return { f, state };
}

describe.skipIf(!url)("hospital.lookup (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });
  let bu: ReturnType<typeof fakeBrowserUse>;

  beforeEach(() => {
    bu = fakeBrowserUse();
    vi.stubGlobal("fetch", bu.f);
    vi.stubEnv("BROWSER_USE_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  afterAll(async () => {
    await db.$client.end();
  });

  const caseFor = async (hospital: string) => {
    const c = await client.case.create({});
    await client.bill.parseText({ caseId: c.id, text: text(hospital) });
    return c.id;
  };

  it("says the policy is on file for a captured hospital", async () => {
    const c = await client.case.create({ sample: "SB-01" });
    expect((await client.hospital.lookup({ caseId: c.id })).state).toBe(
      "on_file",
    );
    expect(bu.state.starts).toBe(0);
  });

  it("is unavailable without a key", async () => {
    vi.stubEnv("BROWSER_USE_API_KEY", "");
    const id = await caseFor("Valley General Hospital (synthetic)");
    expect((await client.hospital.lookup({ caseId: id })).state).toBe(
      "unavailable",
    );
  });

  it("runs in the background, shows steps, then keeps a policy backed by quotes", async () => {
    const id = await caseFor("Valley General Hospital (synthetic)");
    const start = await client.hospital.lookup({ caseId: id });
    expect(start).toMatchObject({
      state: "running",
      hospitalName: "Valley General",
    });
    // Asking again doesn't start a second (paid) run.
    await client.hospital.lookup({ caseId: id });
    expect(bu.state.starts).toBe(1);

    const running = await client.hospital.lookupStatus({ caseId: id });
    expect(running.steps.map((s) => s.text)).toEqual([
      "I will find the policy on the hospital site.",
      "Searched the web for the policy",
    ]);
    expect(running.liveViewUrl).toBe(
      "https://live.example.test/view?readOnly=true&ui=false",
    );

    bu.state.status = "completed";
    bu.state.output = OUTPUT;
    const done = await client.hospital.lookupStatus({ caseId: id });
    expect(done.state).toBe("done");
    expect(done.liveViewUrl).toBeNull();
    expect(done.policy).toMatchObject({
      freeCareMaxFplPct: 300,
      billingPhone: "(555) 010-0000",
    });

    const events = await client.event.list({ caseId: id });
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["lookup.started", "lookup.completed"]),
    );
    expect(JSON.stringify(events)).not.toContain("live.example.test");

    // The checks now use the policy the lookup found.
    const bands = await client.assistance.check({
      caseId: id,
      householdSize: 3,
    });
    const a = await client.assistance.check({
      caseId: id,
      householdSize: 3,
      annualIncomeCents: bands.incomeBands?.[0]?.incomeCents ?? 0,
      insurance: "none",
    });
    expect(a.checks?.find((c) => c.id === "policy")).toMatchObject({
      outcome: "may_help",
      title: "Valley General's assistance policy",
    });
    expect(a.status).toBe("likely");
  });

  it("fails honestly when no income limit is backed", async () => {
    const id = await caseFor("Hillside Community Hospital (synthetic)");
    await client.hospital.lookup({ caseId: id });
    bu.state.status = "completed";
    bu.state.output = { ...OUTPUT, quotes: ["We help patients in need."] };
    const r = await client.hospital.lookupStatus({ caseId: id });
    expect(r.state).toBe("failed");
    expect(r.policy).toBeNull();
    const events = await client.event.list({ caseId: id });
    expect(events.at(-1)?.summary).toBe(
      "Couldn't find Hillside Community's income limits online",
    );
  });
});
