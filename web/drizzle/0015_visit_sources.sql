CREATE TABLE "visit_exclusions" (
	"visitor" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "medium" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "referrer" text;