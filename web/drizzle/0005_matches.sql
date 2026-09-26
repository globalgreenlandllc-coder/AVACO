CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"analysis_id" uuid NOT NULL,
	"owner_name" text NOT NULL,
	"partner_name" text NOT NULL,
	"partner_token" text NOT NULL,
	"with_family" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"partner_consent_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_partner_token_unique" UNIQUE("partner_token")
);
--> statement-breakpoint
CREATE INDEX "matches_owner_idx" ON "matches" USING btree ("owner_kind","owner_id","created_at" DESC NULLS LAST);