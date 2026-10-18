import { createRouterClient, ORPCError } from "@orpc/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Context } from "../context";
import { ACCOUNT_MESSAGE } from "../index";
import { appRouter } from "./index";

const ctx = (user: { isAnonymous?: boolean } | null): Context =>
  ({
    db: {} as never,
    adapter: false,
    session: user ? ({ user: { id: "u1", ...user } } as never) : null,
  }) as Context;

const approve = (c: Context) =>
  createRouterClient(appRouter, { context: c }).action.approve({
    actionId: "a1",
  } as never);
const send = (c: Context) =>
  createRouterClient(appRouter, { context: c }).action.send({ actionId: "a1" });
const call = (c: Context) =>
  createRouterClient(appRouter, { context: c }).call.start({ actionId: "a1" });

const isAccountError = (e: unknown) =>
  e instanceof ORPCError &&
  e.code === "UNAUTHORIZED" &&
  e.message === ACCOUNT_MESSAGE;

async function rejection(p: Promise<unknown>) {
  try {
    await p;
    return null;
  } catch (e) {
    return e;
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("account gate (B-11)", () => {
  it("asks for an account when required and there is no session or an anonymous one", async () => {
    vi.stubEnv("BB_REQUIRE_ACCOUNT", "true");
    for (const run of [approve, send, call]) {
      expect(isAccountError(await rejection(run(ctx(null))))).toBe(true);
      expect(
        isAccountError(await rejection(run(ctx({ isAnonymous: true })))),
      ).toBe(true);
    }
  });

  it("lets a real account through to the handler", async () => {
    vi.stubEnv("BB_REQUIRE_ACCOUNT", "true");
    // The fake db makes the handler fail, which proves the gate passed.
    const e = await rejection(send(ctx({ isAnonymous: false })));
    expect(isAccountError(e)).toBe(false);
  });

  it("is off unless BB_REQUIRE_ACCOUNT=true", async () => {
    vi.stubEnv("BB_REQUIRE_ACCOUNT", "");
    expect(isAccountError(await rejection(send(ctx(null))))).toBe(false);
  });
});
