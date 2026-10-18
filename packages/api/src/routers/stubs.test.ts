import { Action, Assistance } from "@betterbill/core";
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "../context";
import { CallStarted, CallStatus } from "../outputs";
import { appRouter } from "./index";

const context: Context = { db: {} as never, session: null, adapter: false };
const client = createRouterClient(appRouter, { context });
const caseId = "case-test";

describe("procedure stubs", () => {
  it("exposes the 16 binding procedures", () => {
    const names = Object.entries(appRouter).flatMap(([router, value]) =>
      typeof value === "object" && value !== null && !("~orpc" in value)
        ? Object.keys(value).map((p) => `${router}.${p}`)
        : [],
    );
    expect(names.sort()).toEqual(
      [
        "case.create",
        "case.get",
        "case.list",
        "bill.parseText",
        "bill.parsePhoto",
        "bill.confirmLines",
        "audit.run",
        "audit.get",
        "assistance.check",
        "action.draftLetter",
        "action.approve",
        "action.send",
        "call.start",
        "call.status",
        "event.list",
        "eval.results",
      ].sort(),
    );
  });

  // case, bill, audit, action.approve, event and eval are real and covered by the
  // *.int.test.ts and reader tests.
  it("assistance, action, call stubs return their declared shapes", async () => {
    Assistance.parse(
      await client.assistance.check({
        caseId,
        householdSize: 2,
        annualIncomeCents: 3_000_000,
      }),
    );
    const actionId = "action-test";
    Action.parse(await client.action.send({ actionId }));
    const call = CallStarted.parse(await client.call.start({ actionId }));
    CallStatus.parse(await client.call.status({ callId: call.callId }));
  });

  it("rejects invalid input", async () => {
    await expect(
      client.action.draftLetter({ caseId, kind: "fax" as never }),
    ).rejects.toThrow();
  });
});
