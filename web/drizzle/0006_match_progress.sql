ALTER TABLE "matches" ADD COLUMN "partner_opened_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "partner_started_at" timestamp (3) with time zone;