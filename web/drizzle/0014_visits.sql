CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"site" text NOT NULL,
	"path" text NOT NULL,
	"visitor" text NOT NULL,
	"session" text NOT NULL,
	"user_id" text,
	"landing" boolean DEFAULT false NOT NULL,
	"source" text,
	"campaign" text,
	"country" text,
	"device" text DEFAULT 'desktop' NOT NULL,
	"locale" text
);
--> statement-breakpoint
CREATE INDEX "visits_at_idx" ON "visits" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "visits_visitor_idx" ON "visits" USING btree ("visitor","at" DESC NULLS LAST);