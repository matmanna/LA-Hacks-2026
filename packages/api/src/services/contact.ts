// Who a call connects. The patient's number and the billing office's number
// come from the case: what the patient typed, then (billing only) a number
// the hospital lookup found, then the demo's test phones. Only dialable
// numbers are ever used; see isDialableNumber.
import {
  isAllowedNumber,
  isDialableNumber,
  normalizeHospitalUrl,
  normalizePhone,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { caseTable } from "@betterbill/db/schema/index";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";

import { getCaseRow } from "../repo/cases";
import { caseLookupBillingPhone } from "./lookup";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// When on, any well-formed number the patient types can be dialed. Off by
// default: only CALL_ALLOWLIST numbers are dialed.
export const allowUserNumbers = () =>
  process.env.CALL_ALLOW_USER_NUMBERS === "1";

const allowlist = () => process.env.CALL_ALLOWLIST ?? "";

// The first number on CALL_ALLOWLIST is the "billing office" test phone.
export function testBillingPhone(): string | null {
  return (
    allowlist()
      .split(",")
      .map((n) => n.trim())
      .find(Boolean) ?? null
  );
}

export type ContactInput = {
  patientPhone?: string | null;
  billingPhone?: string | null;
  hospitalUrl?: string | null;
};

// Blank clears a field. Anything else must parse, or it is rejected so a
// typo is never saved silently.
export async function saveContact(
  db: Db,
  caseId: string,
  input: ContactInput,
): Promise<void> {
  const patch: Partial<typeof caseTable.$inferInsert> = {};
  const fields = [
    ["patientPhone", "Your phone number", normalizePhone],
    ["billingPhone", "The billing phone number", normalizePhone],
    ["hospitalUrl", "The hospital website", normalizeHospitalUrl],
  ] as const;
  for (const [key, label, parse] of fields) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (raw === null || raw.trim() === "") {
      patch[key] = null;
      continue;
    }
    const value = parse(raw);
    if (!value) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          key === "hospitalUrl"
            ? `${label} doesn't look right. Use an address like www.hospital.org.`
            : `${label} doesn't look right. Use a full number, like (415) 555-0123.`,
      });
    }
    patch[key] = value;
  }
  if (Object.keys(patch).length === 0) return;
  await db.update(caseTable).set(patch).where(eq(caseTable.id, caseId));
}

// The number a signed-in patient used on an earlier case, to fill the field.
export async function savedPatientPhone(
  db: Db,
  userId: string | undefined,
  excludeCaseId: string,
): Promise<string | null> {
  if (!userId) return null;
  const [row] = await db
    .select({ phone: caseTable.patientPhone })
    .from(caseTable)
    .where(
      and(
        eq(caseTable.userId, userId),
        ne(caseTable.id, excludeCaseId),
        isNotNull(caseTable.patientPhone),
      ),
    )
    .orderBy(desc(caseTable.updatedAt))
    .limit(1);
  return row?.phone ?? null;
}

export type CallNumbers = {
  billing: string | null;
  patient: string | null;
  billingFrom: "you" | "hospital_site" | "demo";
};

// The numbers a new call script uses. A number the patient typed that can't
// be dialed stops the draft with a reason. A number the hospital lookup found
// is used only when it is on the allowlist (never because the patient-numbers
// switch is on), so the demo never rings a real billing office by itself.
export async function resolveCallNumbers(
  db: Db,
  caseId: string,
): Promise<CallNumbers> {
  const row = await getCaseRow(db, caseId);
  const list = allowlist();
  const typedPatient = row?.patientPhone ?? null;
  if (
    typedPatient &&
    !isDialableNumber(typedPatient, list, allowUserNumbers())
  ) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "This demo can't call that phone number. Use a test number.",
    });
  }
  const typedBilling = row?.billingPhone ?? null;
  if (typedBilling) {
    if (!isDialableNumber(typedBilling, list, allowUserNumbers())) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message:
          "This demo can't call that billing number. Clear it to use the test line.",
      });
    }
    return { billing: typedBilling, patient: typedPatient, billingFrom: "you" };
  }
  const found = await caseLookupBillingPhone(db, caseId);
  if (found && isAllowedNumber(found, list)) {
    return {
      billing: found,
      patient: typedPatient,
      billingFrom: "hospital_site",
    };
  }
  return {
    billing: testBillingPhone(),
    patient: typedPatient,
    billingFrom: "demo",
  };
}
