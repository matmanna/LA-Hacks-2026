// App tables (plan B ticket B-06). Ids are text, money is integer cents,
// times are timestamptz. Shapes mirror @betterbill/core contracts.
import { defineRelationsPart } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const caseTable = pgTable("case", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  status: text("status").notNull().default("new"),
  hospitalName: text("hospital_name"),
  // B2: random token for the read-only evidence packet link; null = not shared.
  shareToken: text("share_token").unique(),
  // Where calls go. patientPhone is the patient's own number; billingPhone
  // and hospitalUrl are the patient's overrides of what the hospital lookup
  // finds. E.164 and https URL, validated by core before they are saved.
  patientPhone: text("patient_phone"),
  billingPhone: text("billing_phone"),
  hospitalUrl: text("hospital_url"),
  createdAt: ts("created_at").defaultNow().notNull(),
  updatedAt: ts("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const bill = pgTable(
  "bill",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => caseTable.id, { onDelete: "cascade" }),
    hospitalName: text("hospital_name").notNull(),
    hospitalCity: text("hospital_city"),
    hospitalState: text("hospital_state"),
    statementDate: date("statement_date"),
    accountRefMasked: text("account_ref_masked"),
    kind: text("kind").notNull(),
    sourceKind: text("source_kind").notNull(),
    chargesCents: integer("charges_cents").notNull(),
    adjustmentsCents: integer("adjustments_cents").notNull(),
    paidCents: integer("paid_cents").notNull(),
    dueCents: integer("due_cents").notNull(),
    confirmedAt: ts("confirmed_at"),
  },
  (t) => [index("bill_case_id_idx").on(t.caseId)],
);

export const line = pgTable(
  "line",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id")
      .notNull()
      .references(() => bill.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    serviceDate: date("service_date"),
    description: text("description").notNull(),
    code: text("code"),
    codeType: text("code_type"),
    units: real("units").notNull().default(1),
    chargeCents: integer("charge_cents").notNull(),
    sourcePage: integer("source_page").notNull().default(1),
    bbox: jsonb("bbox").$type<[number, number, number, number] | null>(),
    confidence: real("confidence").notNull(),
    userEdited: boolean("user_edited").notNull().default(false),
    // Patient says they did not receive this service.
    notReceived: boolean("not_received").notNull().default(false),
  },
  (t) => [index("line_bill_id_position_idx").on(t.billId, t.position)],
);

export const eob = pgTable(
  "eob",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => caseTable.id, { onDelete: "cascade" }),
    payer: text("payer").notNull(),
    claimRefMasked: text("claim_ref_masked"),
    patientResponsibilityCents: integer(
      "patient_responsibility_cents",
    ).notNull(),
    lines: jsonb("lines").$type<
      | {
          code: string | null;
          allowedCents: number | null;
          patientCents: number | null;
        }[]
      | null
    >(),
  },
  (t) => [index("eob_case_id_idx").on(t.caseId)],
);

export const flag = pgTable(
  "flag",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => caseTable.id, { onDelete: "cascade" }),
    auditRunId: text("audit_run_id").notNull(),
    lineIds: jsonb("line_ids").$type<string[]>().notNull(),
    lever: text("lever").notNull(),
    tier: text("tier").notNull(),
    title: text("title").notNull(),
    explanation: text("explanation").notNull(),
    amountCents: integer("amount_cents").notNull(),
    evidence: jsonb("evidence")
      .$type<{
        kind: "arithmetic" | "rule" | "quote" | "price_file" | "patient";
        detail: string;
        quote?: string;
        sourceUrl?: string;
        capturedAt?: string;
      }>()
      .notNull(),
    confidence: real("confidence").notNull(),
  },
  (t) => [index("flag_case_id_idx").on(t.caseId)],
);

export const action = pgTable(
  "action",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => caseTable.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    draft: text("draft").notNull(),
    recipient: text("recipient").notNull(),
    approvedAt: ts("approved_at"),
    sentAt: ts("sent_at"),
    outcome: text("outcome"),
  },
  (t) => [index("action_case_id_idx").on(t.caseId)],
);

// Append-only: a trigger (custom migration) raises on UPDATE and DELETE.
// No cascade from case, so a case with events cannot be deleted.
export const caseEvent = pgTable(
  "case_event",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => caseTable.id),
    at: ts("at").defaultNow().notNull(),
    actor: text("actor").notNull(),
    type: text("type").notNull(),
    summary: text("summary").notNull(),
    artifactRef: text("artifact_ref"),
  },
  (t) => [index("case_event_case_id_at_idx").on(t.caseId, t.at)],
);

export const hospitalPrice = pgTable(
  "hospital_price",
  {
    id: text("id").primaryKey(),
    hospitalName: text("hospital_name").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    cashCents: integer("cash_cents"),
    minNegotiatedCents: integer("min_negotiated_cents"),
    maxNegotiatedCents: integer("max_negotiated_cents"),
    sourceUrl: text("source_url").notNull(),
    capturedAt: ts("captured_at").notNull(),
    fileName: text("file_name"),
  },
  (t) => [index("hospital_price_hospital_code_idx").on(t.hospitalName, t.code)],
);

export const hospitalPolicy = pgTable("hospital_policy", {
  id: text("id").primaryKey(),
  hospitalName: text("hospital_name").notNull(),
  url: text("url").notNull(),
  capturedAt: ts("captured_at").notNull(),
  quote: text("quote").notNull(),
  thresholdText: text("threshold_text"),
  fplPercent: integer("fpl_percent"),
});

export const evalResult = pgTable("eval_result", {
  id: text("id").primaryKey(),
  runAt: ts("run_at").defaultNow().notNull(),
  metric: text("metric").notNull(),
  value: real("value").notNull(),
  n: integer("n").notNull(),
  details: jsonb("details"),
});

export const appRelations = defineRelationsPart(
  { caseTable, bill, line, eob, flag, action, caseEvent },
  (r) => ({
    caseTable: {
      bills: r.many.bill({ from: r.caseTable.id, to: r.bill.caseId }),
      eobs: r.many.eob({ from: r.caseTable.id, to: r.eob.caseId }),
      flags: r.many.flag({ from: r.caseTable.id, to: r.flag.caseId }),
      actions: r.many.action({ from: r.caseTable.id, to: r.action.caseId }),
      events: r.many.caseEvent({
        from: r.caseTable.id,
        to: r.caseEvent.caseId,
      }),
    },
    bill: {
      case: r.one.caseTable({ from: r.bill.caseId, to: r.caseTable.id }),
      lines: r.many.line({ from: r.bill.id, to: r.line.billId }),
    },
    line: {
      bill: r.one.bill({ from: r.line.billId, to: r.bill.id }),
    },
  }),
);
