// Runs the assistance screener for a bill with the bundled rules and
// policies, and stores its result. Income is never stored: only the status,
// the sources, and the checks that don't reveal income.
import {
  Assistance,
  type AssistanceAnswers,
  type Bill,
  findPolicy,
  screenAssistance,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { caseEvent } from "@betterbill/db/schema/index";
import { and, desc, eq } from "drizzle-orm";

import { FPL, POLICIES, RULES } from "../data";
import { addEvent } from "../repo/cases";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export const ASSISTANCE_EVENT = "assistance.checked";

export function screenBill(bill: Bill, answers?: AssistanceAnswers) {
  return screenAssistance({
    state: bill.hospital.state,
    hospitalName: bill.hospital.name,
    policy: findPolicy(POLICIES, bill.hospital.name),
    rules: RULES,
    fpl: FPL,
    totals: bill.totals,
    ...(answers ? { answers } : {}),
  });
}

// What we keep: no income check and no income ranges.
export function toStored(a: Assistance): Assistance {
  const { incomeBands: _bands, ...rest } = a;
  return {
    ...rest,
    ...(a.checks
      ? { checks: a.checks.filter((c) => c.kind !== "income") }
      : {}),
  };
}

export function checkSummary(a: Assistance): string {
  const checks = (a.checks ?? []).filter((c) => c.kind !== "income");
  const helping = checks.filter((c) => c.outcome === "may_help").length;
  return `Checked ${checks.length} rules: ${helping} may help`;
}

export async function saveAssistance(db: Db, caseId: string, a: Assistance) {
  await addEvent(db, caseId, ASSISTANCE_EVENT, checkSummary(a), {
    actor: "agent",
    artifactRef: JSON.stringify(toStored(a)),
  });
}

// The patient's latest answered check, else the checks that need no answers.
export async function loadAssistance(
  db: Db,
  caseId: string,
  bill: Bill,
): Promise<Assistance> {
  const [ev] = await db
    .select()
    .from(caseEvent)
    .where(
      and(eq(caseEvent.caseId, caseId), eq(caseEvent.type, ASSISTANCE_EVENT)),
    )
    .orderBy(desc(caseEvent.at))
    .limit(1);
  if (ev?.artifactRef) {
    try {
      const parsed = Assistance.safeParse(JSON.parse(ev.artifactRef));
      if (parsed.success) return parsed.data;
    } catch {
      // A bad record falls back to the unanswered screen.
    }
  }
  return screenBill(bill);
}
