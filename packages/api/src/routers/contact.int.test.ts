// Integration: where a call goes (patient phone, billing override, hospital
// website) against a migrated Postgres. No network and no real calls.
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

const TEST_BILLING = "+13105550100";
const TEST_PATIENT = "+13105550101";

describe.skipIf(!url)("contact routes (integration)", () => {
  const db = createDb({ DATABASE_URL: url ?? "" });
  const client = createRouterClient(appRouter, {
    context: { db, session: null, adapter: false },
  });

  beforeEach(() => {
    vi.stubEnv("CALL_MODE", "conference");
    vi.stubEnv("CALL_ALLOWLIST", `${TEST_BILLING},${TEST_PATIENT}`);
    vi.stubEnv("CALL_PATIENT_NUMBER", TEST_PATIENT);
    vi.stubEnv("CALL_ALLOW_USER_NUMBERS", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  afterAll(async () => {
    await db.$client.end();
  });

  async function auditedCase() {
    const c = await client.case.create({ sample: "SB-01" });
    const detail = await client.case.get({ caseId: c.id });
    await client.bill.confirmLines({
      caseId: c.id,
      lines: detail.bill?.lines ?? [],
    });
    await client.audit.run({ caseId: c.id });
    return c.id;
  }

  it("saves numbers as E.164 and an https website, and clears blanks", async () => {
    const { id } = await client.case.create({});
    expect(await client.contact.get({ caseId: id })).toMatchObject({
      patientPhone: null,
      billingPhone: null,
      hospitalUrl: null,
    });
    const saved = await client.contact.set({
      caseId: id,
      patientPhone: "(310) 555-0101",
      billingPhone: "310.555.0100",
      hospitalUrl: "www.cedars-sinai.org/billing",
    });
    expect(saved).toMatchObject({
      patientPhone: "+13105550101",
      billingPhone: "+13105550100",
      hospitalUrl: "https://www.cedars-sinai.org/billing",
    });
    const cleared = await client.contact.set({ caseId: id, billingPhone: " " });
    expect(cleared.billingPhone).toBeNull();
    expect(cleared.patientPhone).toBe("+13105550101");
  });

  it("rejects values that aren't a phone number or website", async () => {
    const { id } = await client.case.create({});
    await expect(
      client.contact.set({ caseId: id, patientPhone: "call me" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      client.contact.set({ caseId: id, hospitalUrl: "javascript:alert(1)" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("drafts the call with the patient's own number and billing override", async () => {
    const caseId = await auditedCase();
    await client.contact.set({
      caseId,
      patientPhone: TEST_PATIENT,
      billingPhone: TEST_BILLING,
    });
    const { action } = await client.action.draftLetter({
      caseId,
      kind: "call",
      patientConnection: "phone",
    });
    expect(action.recipient).toBe(TEST_BILLING);
    expect(action.draft).toContain(
      `patient test participant at ${TEST_PATIENT}`,
    );
  });

  it("won't draft with a number that isn't on the test list", async () => {
    const caseId = await auditedCase();
    await client.contact.set({ caseId, patientPhone: "(415) 555-0123" });
    await expect(
      client.action.draftLetter({
        caseId,
        kind: "call",
        patientConnection: "phone",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("dials any well-formed number when the operator allows it", async () => {
    vi.stubEnv("CALL_ALLOW_USER_NUMBERS", "1");
    const caseId = await auditedCase();
    await client.contact.set({
      caseId,
      patientPhone: "(415) 555-0123",
      billingPhone: "(415) 555-0199",
    });
    const { action } = await client.action.draftLetter({
      caseId,
      kind: "call",
      patientConnection: "phone",
    });
    expect(action.recipient).toBe("+14155550199");
    expect(action.draft).toContain("patient test participant at +14155550123");
  });

  it("falls back to the test phones when nothing was entered", async () => {
    const caseId = await auditedCase();
    const { action } = await client.action.draftLetter({
      caseId,
      kind: "call",
      patientConnection: "phone",
    });
    expect(action.recipient).toBe(TEST_BILLING);
    expect(action.draft).toContain(
      `patient test participant at ${TEST_PATIENT}`,
    );
  });
});
