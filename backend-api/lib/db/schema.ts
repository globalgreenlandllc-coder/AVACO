import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { EmostateResult, PsytypeResult } from "../format";

export type AnalysisType = "both" | "psytype" | "emostate";
export type AnalysisStatus = "processing" | "completed" | "failed";
export type JobKind = "psytype" | "emostate";
export type JobStatus = "pending" | "completed" | "failed";

// Millisecond precision, so a timestamp survives the round trip through a pagination cursor.
const ts = (name: string) => timestamp(name, { withTimezone: true, precision: 3 });

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey(),
    externalUserId: text("external_user_id"),
    type: text("type").$type<AnalysisType>().notNull(),
    channel: integer("channel"),
    audioUrl: text("audio_url").notNull(),
    consentAt: ts("consent_at").notNull(),
    status: text("status").$type<AnalysisStatus>().notNull().default("processing"),
    psytype: jsonb("psytype").$type<PsytypeResult[]>(),
    emostate: jsonb("emostate").$type<EmostateResult[]>(),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("analyses_user_created_idx").on(t.externalUserId, t.createdAt.desc())],
);

export const avocoJobs = pgTable(
  "avoco_jobs",
  {
    /** The id sent to AVOCO; its callback carries the same id back. */
    id: uuid("id").primaryKey(),
    analysisId: uuid("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }),
    kind: text("kind").$type<JobKind>().notNull(),
    status: text("status").$type<JobStatus>().notNull().default("pending"),
    rawResult: jsonb("raw_result").$type<unknown>(),
    createdAt: ts("created_at").notNull().defaultNow(),
    completedAt: ts("completed_at"),
  },
  (t) => [index("avoco_jobs_analysis_idx").on(t.analysisId)],
);

export type Analysis = typeof analyses.$inferSelect;
export type AvocoJob = typeof avocoJobs.$inferSelect;
