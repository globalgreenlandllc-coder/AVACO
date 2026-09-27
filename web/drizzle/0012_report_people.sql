CREATE TABLE "report_people" (
	"analysis_id" uuid PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "report_people_owner_idx" ON "report_people" USING btree ("owner_id");