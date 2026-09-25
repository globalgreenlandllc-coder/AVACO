CREATE TABLE "translations" (
	"lang" text NOT NULL,
	"path" text NOT NULL,
	"source_hash" text NOT NULL,
	"text" text NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_lang_path_pk" PRIMARY KEY("lang","path")
);
