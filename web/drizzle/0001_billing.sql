CREATE TABLE "admins" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"credits" integer NOT NULL,
	"max_uses" integer,
	"used" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp (3) with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"pack" text NOT NULL,
	"credits" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"stripe_session_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"unlock_analysis_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp (3) with time zone,
	CONSTRAINT "purchases_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "report_access" (
	"analysis_id" uuid PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"unlocked_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_stats" (
	"analysis_id" uuid PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"leading_type" text NOT NULL,
	"top_field" text,
	"completed_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "self_recordings" (
	"analysis_id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_once_idx" ON "credit_ledger" USING btree ("owner_kind","owner_id","reason","ref");--> statement-breakpoint
CREATE INDEX "ledger_owner_idx" ON "credit_ledger" USING btree ("owner_kind","owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ledger_created_idx" ON "credit_ledger" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "self_recordings_user_idx" ON "self_recordings" USING btree ("user_id","created_at" DESC NULLS LAST);