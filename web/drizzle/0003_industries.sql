CREATE TABLE "industry_access" (
	"analysis_id" uuid NOT NULL,
	"industry" text NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text NOT NULL,
	"source" text NOT NULL,
	"unlocked_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industry_access_analysis_id_industry_pk" PRIMARY KEY("analysis_id","industry")
);
