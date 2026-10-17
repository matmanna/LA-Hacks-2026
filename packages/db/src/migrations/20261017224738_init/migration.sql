CREATE TABLE "action" (
	"id" text PRIMARY KEY,
	"case_id" text NOT NULL,
	"kind" text NOT NULL,
	"draft" text NOT NULL,
	"recipient" text NOT NULL,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "bill" (
	"id" text PRIMARY KEY,
	"case_id" text NOT NULL,
	"hospital_name" text NOT NULL,
	"hospital_city" text,
	"hospital_state" text,
	"statement_date" date,
	"account_ref_masked" text,
	"kind" text NOT NULL,
	"source_kind" text NOT NULL,
	"charges_cents" integer NOT NULL,
	"adjustments_cents" integer NOT NULL,
	"paid_cents" integer NOT NULL,
	"due_cents" integer NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "case_event" (
	"id" text PRIMARY KEY,
	"case_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"type" text NOT NULL,
	"summary" text NOT NULL,
	"artifact_ref" text
);
--> statement-breakpoint
CREATE TABLE "case" (
	"id" text PRIMARY KEY,
	"user_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"hospital_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eob" (
	"id" text PRIMARY KEY,
	"case_id" text NOT NULL,
	"payer" text NOT NULL,
	"claim_ref_masked" text,
	"patient_responsibility_cents" integer NOT NULL,
	"lines" jsonb
);
--> statement-breakpoint
CREATE TABLE "eval_result" (
	"id" text PRIMARY KEY,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metric" text NOT NULL,
	"value" real NOT NULL,
	"n" integer NOT NULL,
	"details" jsonb
);
--> statement-breakpoint
CREATE TABLE "flag" (
	"id" text PRIMARY KEY,
	"case_id" text NOT NULL,
	"audit_run_id" text NOT NULL,
	"line_ids" jsonb NOT NULL,
	"lever" text NOT NULL,
	"tier" text NOT NULL,
	"title" text NOT NULL,
	"explanation" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"confidence" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospital_policy" (
	"id" text PRIMARY KEY,
	"hospital_name" text NOT NULL,
	"url" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"quote" text NOT NULL,
	"threshold_text" text,
	"fpl_percent" integer
);
--> statement-breakpoint
CREATE TABLE "hospital_price" (
	"id" text PRIMARY KEY,
	"hospital_name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"cash_cents" integer,
	"min_negotiated_cents" integer,
	"max_negotiated_cents" integer,
	"source_url" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"file_name" text
);
--> statement-breakpoint
CREATE TABLE "line" (
	"id" text PRIMARY KEY,
	"bill_id" text NOT NULL,
	"position" integer NOT NULL,
	"service_date" date,
	"description" text NOT NULL,
	"code" text,
	"code_type" text,
	"units" real DEFAULT 1 NOT NULL,
	"charge_cents" integer NOT NULL,
	"source_page" integer DEFAULT 1 NOT NULL,
	"bbox" jsonb,
	"confidence" real NOT NULL,
	"user_edited" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "action_case_id_idx" ON "action" ("case_id");--> statement-breakpoint
CREATE INDEX "bill_case_id_idx" ON "bill" ("case_id");--> statement-breakpoint
CREATE INDEX "case_event_case_id_at_idx" ON "case_event" ("case_id","at");--> statement-breakpoint
CREATE INDEX "eob_case_id_idx" ON "eob" ("case_id");--> statement-breakpoint
CREATE INDEX "flag_case_id_idx" ON "flag" ("case_id");--> statement-breakpoint
CREATE INDEX "hospital_price_hospital_code_idx" ON "hospital_price" ("hospital_name","code");--> statement-breakpoint
CREATE INDEX "line_bill_id_position_idx" ON "line" ("bill_id","position");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "action" ADD CONSTRAINT "action_case_id_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "case"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "bill" ADD CONSTRAINT "bill_case_id_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "case"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_event" ADD CONSTRAINT "case_event_case_id_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "case"("id");--> statement-breakpoint
ALTER TABLE "case" ADD CONSTRAINT "case_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "eob" ADD CONSTRAINT "eob_case_id_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "case"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "flag" ADD CONSTRAINT "flag_case_id_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "case"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "line" ADD CONSTRAINT "line_bill_id_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bill"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;