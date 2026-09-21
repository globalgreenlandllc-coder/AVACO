CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"external_user_id" text,
	"type" text NOT NULL,
	"channel" integer,
	"audio_url" text NOT NULL,
	"consent_at" timestamp (3) with time zone NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"psytype" jsonb,
	"emostate" jsonb,
	"error" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "avoco_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"analysis_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"raw_result" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp (3) with time zone
);
--> statement-breakpoint
ALTER TABLE "avoco_jobs" ADD CONSTRAINT "avoco_jobs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analyses_user_created_idx" ON "analyses" USING btree ("external_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "avoco_jobs_analysis_idx" ON "avoco_jobs" USING btree ("analysis_id");