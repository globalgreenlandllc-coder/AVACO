CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"giver_id" text NOT NULL,
	"giver_name" text NOT NULL,
	"recipient_name" text,
	"message" text,
	"reports" integer NOT NULL,
	"industries" integer DEFAULT 0 NOT NULL,
	"reports_used" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_by" text,
	"paid_at" timestamp (3) with time zone,
	"opened_at" timestamp (3) with time zone,
	"claimed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gifts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "gift_id" uuid;--> statement-breakpoint
CREATE INDEX "gifts_giver_idx" ON "gifts" USING btree ("giver_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "gifts_claimed_idx" ON "gifts" USING btree ("claimed_by");