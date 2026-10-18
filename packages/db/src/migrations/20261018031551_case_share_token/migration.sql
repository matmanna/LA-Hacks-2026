ALTER TABLE "case" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "case" ADD CONSTRAINT "case_share_token_key" UNIQUE("share_token");