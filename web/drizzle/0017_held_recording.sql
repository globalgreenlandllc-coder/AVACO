ALTER TABLE "purchases" ADD COLUMN "recording_url" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "recording_person" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "recording_started_at" timestamp (3) with time zone;