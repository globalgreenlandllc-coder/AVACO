ALTER TABLE "matches" ADD COLUMN "paid_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "match_id" uuid;