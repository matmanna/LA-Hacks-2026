import { createRouterClient, type ORPCError } from "@orpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const clientUpdate = vi.fn();
const addEvent = vi.fn();
let confirmedCents = 8400;

vi.mock("@betterbill/auth/lib/payments", () => ({
  createPolarClient: vi.fn(() => ({
    checkouts: { create, clientUpdate },
  })),
}));
vi.mock("../repo/cases", () => ({
  latestAudit: vi.fn(async () => ({ runId: "r", flags: [] })),
  loadBill: vi.fn(async () => ({ bill: {}, confirmedAt: new Date() })),
  listEvents: vi.fn(async () => []),
  addEvent: (...a: unknown[]) => addEvent(...a),
}));
vi.mock("./audit", () => ({
  auditRouter: {},
  auditResult: () => ({
    savings: {
      confirmedCents,
      potentialLowCents: 1000,
      potentialHighCents: 2000,
    },
  }),
}));

import type { Context } from "../context";
import { appRouter } from "./index";

const client = () =>
  createRouterClient(appRouter, {
    context: { db: {} as never, adapter: false, session: null } as Context,
  });

const SECRET = "polar_oat_super_secret";

beforeEach(() => {
  confirmedCents = 8400;
  create.mockReset();
  clientUpdate.mockReset();
  addEvent.mockReset();
  vi.stubEnv("POLAR_ACCESS_TOKEN", SECRET);
  vi.stubEnv("POLAR_SAVINGS_PRODUCT_ID", "prod-savings");
  vi.stubEnv("POLAR_BULK_PRODUCT_ID", "prod-bulk");
  vi.stubEnv("POLAR_DEV_PROMO_CODE", "BBDEV50");
  vi.stubEnv("POLAR_SERVER", "sandbox");
  vi.stubEnv("POLAR_SUCCESS_URL", "https://x.test/success");
});
afterEach(() => vi.unstubAllEnvs());

async function rejection(p: Promise<unknown>) {
  try {
    await p;
    return null;
  } catch (e) {
    return e;
  }
}

describe("payment.quote", () => {
  it("computes the fee from confirmed savings only", async () => {
    const q = await client().payment.quote({ caseId: "c1" });
    expect(q.feeCents).toBe(840);
    expect(q.owed).toBe(true);
    expect(q.paymentsEnabled).toBe(true);
    expect(addEvent).toHaveBeenCalledWith(
      expect.anything(),
      "c1",
      "payment.quoted",
      expect.any(String),
    );
  });
  it("owes nothing without confirmed savings", async () => {
    confirmedCents = 0;
    const q = await client().payment.quote({ caseId: "c1" });
    expect(q.owed).toBe(false);
    expect(q.feeCents).toBe(0);
  });
  it("reports payments disabled without a token", async () => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "");
    const q = await client().payment.quote({ caseId: "c1" });
    expect(q.paymentsEnabled).toBe(false);
  });
});

describe("payment.checkout", () => {
  it("creates a Polar checkout with amount, success url, and case metadata", async () => {
    create.mockResolvedValue({
      id: "co1",
      url: "https://sandbox.polar.sh/co1",
    });
    const r = await client().payment.checkout({ caseId: "c1" });
    expect(r).toEqual({
      url: "https://sandbox.polar.sh/co1",
      checkoutId: "co1",
    });
    expect(create).toHaveBeenCalledWith({
      products: ["prod-savings"],
      amount: 840,
      successUrl: "https://x.test/success",
      metadata: { caseId: "c1" },
    });
    expect(addEvent).toHaveBeenCalledWith(
      expect.anything(),
      "c1",
      "payment.checkout_created",
      expect.any(String),
      expect.objectContaining({ artifactRef: "co1" }),
    );
  });
  it("charges 50 cents with the dev promo code in the sandbox", async () => {
    create.mockResolvedValue({ id: "co1", url: "u" });
    await client().payment.checkout({ caseId: "c1", promoCode: "BBDEV50" });
    expect(create.mock.calls[0]?.[0].amount).toBe(50);
  });
  it("ignores the dev promo code in production mode", async () => {
    vi.stubEnv("POLAR_SERVER", "production");
    create.mockResolvedValue({ id: "co1", url: "u" });
    await client().payment.checkout({ caseId: "c1", promoCode: "BBDEV50" });
    expect(create.mock.calls[0]?.[0].amount).toBe(840);
  });
  it("refuses when nothing is owed", async () => {
    confirmedCents = 0;
    const e = await rejection(client().payment.checkout({ caseId: "c1" }));
    expect((e as ORPCError<string, unknown>).code).toBe("PRECONDITION_FAILED");
    expect(create).not.toHaveBeenCalled();
  });
  it("says payments are not configured without a token", async () => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "");
    const e = await rejection(client().payment.checkout({ caseId: "c1" }));
    expect((e as ORPCError<string, unknown>).code).toBe("PRECONDITION_FAILED");
    expect((e as Error).message).toBe("Payments are not configured");
  });
  it("does not leak the token when Polar fails", async () => {
    create.mockRejectedValue(new Error(`bad token ${SECRET}`));
    const e = (await rejection(
      client().payment.checkout({ caseId: "c1" }),
    )) as Error;
    expect(e.message).not.toContain(SECRET);
  });
});

describe("payment.bulkCheckout", () => {
  it("creates a bulk checkout without a discount by default", async () => {
    create.mockResolvedValue({ id: "b1", url: "u", clientSecret: "cs" });
    const r = await client().payment.bulkCheckout({});
    expect(r.checkoutId).toBe("b1");
    expect(create.mock.calls[0]?.[0].products).toEqual(["prod-bulk"]);
    expect(clientUpdate).not.toHaveBeenCalled();
  });
  it("applies a discount code when given", async () => {
    create.mockResolvedValue({ id: "b1", url: "u", clientSecret: "cs" });
    await client().payment.bulkCheckout({ promoCode: " BBDEV50 " });
    expect(clientUpdate).toHaveBeenCalledWith({
      clientSecret: "cs",
      checkoutUpdatePublic: { discountCode: "BBDEV50" },
    });
  });
  it("says payments are not configured without a token", async () => {
    vi.stubEnv("POLAR_ACCESS_TOKEN", "");
    const e = await rejection(client().payment.bulkCheckout({}));
    expect((e as Error).message).toBe("Payments are not configured");
  });
});
