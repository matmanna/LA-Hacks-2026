import {
  Action,
  Assistance,
  AuditResult,
  CaseEvent,
  CaseSummary,
  ParseResult,
} from "@betterbill/core";
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { Context } from "../context";
import {
  CallStarted,
  CallStatus,
  CaseDetail,
  ConfirmLinesOutput,
  EvalResults,
} from "../outputs";
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

  it("case procedures return their declared shapes", async () => {
    CaseSummary.parse(await client.case.create({ sample: "bill-01" }));
    const detail = CaseDetail.parse(await client.case.get({ caseId }));
    expect(detail.case.id).toBe(caseId);
    z.array(CaseSummary).parse(await client.case.list({}));
  });

  it("bill procedures return their declared shapes", async () => {
    // bill.parseText is real since B-09 (see parseText.int.test.ts).
    const parsed = ParseResult.parse(
      await client.bill.parsePhoto({
        caseId,
        pages: [{ imageDataUrl: "data:image/jpeg;base64,AA==", page: 1 }],
      }),
    );
    ConfirmLinesOutput.parse(
      await client.bill.confirmLines({ caseId, lines: parsed.bill.lines }),
    );
  });

  it("audit returns flags, savings and balance", async () => {
    const audit = AuditResult.parse(await client.audit.run({ caseId }));
    expect(audit.balance.billedCents).toBe(16800);
    expect(audit.balance.lessThanBilledCents).toBe(
      audit.savings.confirmedCents,
    );
    AuditResult.nullable().parse(await client.audit.get({ caseId }));
  });

  it("assistance, action, call, event, eval return their declared shapes", async () => {
    Assistance.parse(
      await client.assistance.check({
        caseId,
        householdSize: 2,
        annualIncomeCents: 3_000_000,
      }),
    );
    const draft = Action.parse(
      await client.action.draftLetter({ caseId, kind: "letter" }),
    );
    expect(draft.approvedAt).toBeNull();
    Action.parse(await client.action.approve({ actionId: draft.id }));
    Action.parse(await client.action.send({ actionId: draft.id }));
    const call = CallStarted.parse(
      await client.call.start({ actionId: draft.id }),
    );
    CallStatus.parse(await client.call.status({ callId: call.callId }));
    z.array(CaseEvent).parse(await client.event.list({ caseId }));
    EvalResults.parse(await client.eval.results({}));
  });

  it("rejects invalid input", async () => {
    await expect(
      client.bill.parsePhoto({ caseId, pages: [] }),
    ).rejects.toThrow();
  });
});
