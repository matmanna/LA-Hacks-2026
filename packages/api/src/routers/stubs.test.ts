import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "../context";
import { appRouter } from "./index";

const context: Context = { db: {} as never, session: null, adapter: false };
const client = createRouterClient(appRouter, { context });
const caseId = "case-test";

describe("procedure stubs", () => {
  it("exposes the binding procedures", () => {
    const names = Object.entries(appRouter).flatMap(([router, value]) =>
      typeof value === "object" && value !== null && !("~orpc" in value)
        ? Object.keys(value).map((p) => `${router}.${p}`)
        : [],
    );
    expect(names.sort()).toEqual(
      [
        "case.create",
        "case.get",
        "case.claim",
        "case.list",
        "case.share",
        "case.revokeShare",
        "case.packet",
        "contact.get",
        "contact.set",
        "bill.parseText",
        "bill.parsePhoto",
        "bill.confirmLines",
        "audit.run",
        "audit.get",
        "assistance.check",
        "hospital.lookup",
        "hospital.lookupStatus",
        "action.draftLetter",
        "action.approve",
        "action.send",
        "call.start",
        "call.status",
        "event.list",
        "eval.results",
        "payment.quote",
        "payment.checkout",
        "payment.bulkCheckout",
        "price.services",
        "price.nearby",
      ].sort(),
    );
  });

  // case, bill, audit, event, eval, action and call routes are real and
  // covered by the *.int.test.ts and reader tests.
  it("rejects invalid input", async () => {
    await expect(
      client.action.draftLetter({ caseId, kind: "fax" as never }),
    ).rejects.toThrow();
  });
});
