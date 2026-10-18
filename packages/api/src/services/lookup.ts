// The background lookup of a hospital's assistance policy (Browser Use).
// Started once per case, read by polling: each read checks the run, turns its
// events into plain steps, and on completion keeps a policy only when quotes
// back its income limits. Only started/completed/failed are stored as case
// events; the live view URL is never stored.
import {
  type Bill,
  findPolicy,
  type HospitalPolicy,
  type LookupEvent,
  type LookupStep,
  lookupSteps,
  normalizePhone,
  policyFromLookup,
  shortHospitalName,
} from "@betterbill/core";
import type { Database } from "@betterbill/db";
import { caseEvent } from "@betterbill/db/schema/index";
import { and, asc, eq, like } from "drizzle-orm";

import { POLICIES } from "../data";
import type { LookupStatus } from "../outputs";
import { addEvent, getCaseRow } from "../repo/cases";
import {
  type Fetch,
  getLiveUrl,
  getRun,
  getRunEvents,
  isDone,
  lookupOutput,
  startPolicyLookup,
} from "./browser-use";

type Db = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export const LOOKUP_STARTED = "lookup.started";
export const LOOKUP_COMPLETED = "lookup.completed";
export const LOOKUP_FAILED = "lookup.failed";
// A run still going after this long is reported as failed.
const GIVE_UP_MS = 15 * 60_000;

export type LookupDeps = { key: string | null; fetch: Fetch };

type Started = { runId: string; startedAt: string };
type Finished = {
  runId: string;
  steps: LookupStep[];
  policy?: HospitalPolicy;
  billingPhone?: string | null;
  reason?: string;
};

const parse = <T>(ref: string | null): T | null => {
  if (!ref) return null;
  try {
    return JSON.parse(ref) as T;
  } catch {
    return null;
  }
};

async function lookupRecords(db: Db, caseId: string) {
  const rows = await db
    .select()
    .from(caseEvent)
    .where(and(eq(caseEvent.caseId, caseId), like(caseEvent.type, "lookup.%")))
    .orderBy(asc(caseEvent.at));
  const started = rows.filter((r) => r.type === LOOKUP_STARTED).at(-1);
  const end = rows
    .filter(
      (r) =>
        (r.type === LOOKUP_COMPLETED || r.type === LOOKUP_FAILED) &&
        started &&
        r.at >= started.at,
    )
    .at(-1);
  return { started, end };
}

// The policy a finished lookup found for this case, if any.
export async function caseLookupPolicy(
  db: Db,
  caseId: string,
): Promise<HospitalPolicy | null> {
  const { end } = await lookupRecords(db, caseId);
  if (end?.type !== LOOKUP_COMPLETED) return null;
  return parse<Finished>(end.artifactRef)?.policy ?? null;
}

// The billing phone a finished lookup found on the hospital's site, as E.164.
export async function caseLookupBillingPhone(
  db: Db,
  caseId: string,
): Promise<string | null> {
  const { end } = await lookupRecords(db, caseId);
  if (end?.type !== LOOKUP_COMPLETED) return null;
  const phone = parse<Finished>(end.artifactRef)?.billingPhone;
  return phone ? normalizePhone(phone) : null;
}

const base = (bill: Bill): LookupStatus => ({
  state: "none",
  hospitalName: shortHospitalName(bill.hospital.name),
  startedAt: null,
  steps: [],
  liveViewUrl: null,
  policy: null,
});

const toSteps = (steps: LookupStep[]) =>
  steps.map((s) => ({ at: s.at, text: s.text }));

function finishedStatus(
  bill: Bill,
  started: Started,
  type: string,
  f: Finished | null,
): LookupStatus {
  return {
    ...base(bill),
    state: type === LOOKUP_COMPLETED ? "done" : "failed",
    startedAt: started.startedAt,
    steps: toSteps(f?.steps ?? []),
    policy: f?.policy
      ? {
          policyTitle: f.policy.policyTitle,
          policyUrl: f.policy.policyUrl,
          freeCareMaxFplPct: f.policy.freeCareMaxFplPct,
          discountMaxFplPct: f.policy.discountMaxFplPct,
          billingPhone: f.billingPhone ?? null,
        }
      : null,
  };
}

async function allEvents(deps: LookupDeps, key: string, runId: string) {
  const out: LookupEvent[] = [];
  let after = 0;
  for (let page = 0; page < 5; page++) {
    const r = await getRunEvents(key, runId, after, deps.fetch);
    out.push(...r.events);
    if (!r.hasMore || r.nextAfter === null) break;
    after = r.nextAfter;
  }
  return out;
}

export async function lookupStatus(
  db: Db,
  caseId: string,
  bill: Bill,
  deps: LookupDeps,
): Promise<LookupStatus> {
  if (findPolicy(POLICIES, bill.hospital.name)) {
    return { ...base(bill), state: "on_file" };
  }
  const { started: row, end } = await lookupRecords(db, caseId);
  const started = row ? parse<Started>(row.artifactRef) : null;
  if (!row || !started) {
    return { ...base(bill), state: deps.key ? "none" : "unavailable" };
  }
  if (end) {
    return finishedStatus(
      bill,
      started,
      end.type,
      parse<Finished>(end.artifactRef),
    );
  }
  const running: LookupStatus = {
    ...base(bill),
    state: "running",
    startedAt: started.startedAt,
  };
  if (!deps.key) return running;

  const [run, events] = await Promise.all([
    getRun(deps.key, started.runId, deps.fetch),
    allEvents(deps, deps.key, started.runId),
  ]);
  const steps = lookupSteps(events);
  const name = shortHospitalName(bill.hospital.name);

  const tooLong =
    Date.now() - Date.parse(started.startedAt) > GIVE_UP_MS &&
    !isDone(run.status);
  if (isDone(run.status) || tooLong) {
    const out = run.status === "completed" ? lookupOutput(run) : null;
    const built = out
      ? policyFromLookup(out, {
          hospitalName: bill.hospital.name,
          capturedAt: new Date().toISOString(),
        })
      : null;
    // Another poll may have finished it meanwhile.
    const again = await lookupRecords(db, caseId);
    if (again.end) {
      return finishedStatus(
        bill,
        started,
        again.end.type,
        parse<Finished>(again.end.artifactRef),
      );
    }
    const finished: Finished = built
      ? {
          runId: started.runId,
          steps,
          policy: built.policy,
          billingPhone: out?.billing_phone ?? null,
        }
      : {
          runId: started.runId,
          steps,
          reason: tooLong
            ? "took too long"
            : run.status === "completed"
              ? "no income limits backed by quotes"
              : run.status,
        };
    const type = built ? LOOKUP_COMPLETED : LOOKUP_FAILED;
    await addEvent(
      db,
      caseId,
      type,
      built
        ? `Found ${name}'s assistance policy`
        : `Couldn't find ${name}'s income limits online`,
      { actor: "agent", artifactRef: JSON.stringify(finished) },
    );
    return finishedStatus(bill, started, type, finished);
  }

  const ready = events.find((e) => e.type === "browser.ready");
  const sessionId =
    typeof ready?.data.browser_session_id === "string"
      ? ready.data.browser_session_id
      : null;
  let liveViewUrl: string | null = null;
  if (sessionId) {
    try {
      const url = await getLiveUrl(deps.key, sessionId, deps.fetch);
      // View only: hide the controls and block input.
      liveViewUrl = url
        ? `${url}${url.includes("?") ? "&" : "?"}readOnly=true&ui=false`
        : null;
    } catch {
      liveViewUrl = null;
    }
  }
  return { ...running, steps: toSteps(steps), liveViewUrl };
}

// Starts the lookup once per case. Returns the current status otherwise.
export async function startLookup(
  db: Db,
  caseId: string,
  bill: Bill,
  deps: LookupDeps,
): Promise<LookupStatus> {
  const now = await lookupStatus(db, caseId, bill, deps);
  if (now.state !== "none" || !deps.key) return now;
  const run = await startPolicyLookup(
    deps.key,
    {
      name: bill.hospital.name,
      city: bill.hospital.city,
      state: bill.hospital.state,
    },
    deps.fetch,
    (await getCaseRow(db, caseId))?.hospitalUrl ?? null,
  );
  const started: Started = {
    runId: run.id,
    startedAt: new Date().toISOString(),
  };
  await addEvent(
    db,
    caseId,
    LOOKUP_STARTED,
    `Started looking up ${shortHospitalName(bill.hospital.name)}'s assistance policy`,
    { actor: "agent", artifactRef: JSON.stringify(started) },
  );
  return { ...base(bill), state: "running", startedAt: started.startedAt };
}
