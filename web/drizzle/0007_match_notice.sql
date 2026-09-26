ALTER TABLE "matches" ADD COLUMN "ready_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "owner_seen_at" timestamp (3) with time zone;