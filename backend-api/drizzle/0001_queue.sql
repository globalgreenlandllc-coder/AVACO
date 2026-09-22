ALTER TABLE "analyses" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "last_attempt_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "avoco_jobs" ADD COLUMN "submitted_at" timestamp (3) with time zone;