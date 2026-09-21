/**
 * The platform's own data: companies (workspaces), their people and what they recorded.
 * The analyses themselves stay in the gateway; a recording here points at one by id.
 */
import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type Role = "admin" | "manager" | "viewer";
export type Source = "invite" | "open_link" | "station" | "upload" | "api";

const ts = (name: string) => timestamp(name, { withTimezone: true, precision: 3 });

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  /** Industry preset key: wording, report focus and consent extras. See lib/presets.ts. */
  industry: text("industry").notNull().default("general"),
  /** Hides the emotional-state part everywhere in this workspace (EU workplace and school use). */
  hideEmotions: boolean("hide_emotions").notNull().default(false),
  /** Anyone signed in who opens /join/<code> becomes a viewer. Admins can rotate it. */
  joinCode: text("join_code").notNull().unique(),
  /** sha256 of the company API key; the key itself is shown once and never stored. */
  apiKeyHash: text("api_key_hash").unique(),
  apiKeyPrefix: text("api_key_prefix"),
  createdBy: text("created_by").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const members = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").$type<Role>().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("members_user_idx").on(t.userId)],
);

/** A vacancy, a class, a team, a client list. */
export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The reusable link (and station mode): /s/<openToken>. */
    openToken: text("open_token").notNull().unique(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("groups_workspace_idx").on(t.workspaceId)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    /** The person's private link, /r/<token>: where they record, and where they always see their own report. */
    token: text("token").notNull().unique(),
    source: text("source").$type<Source>().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("participants_group_idx").on(t.groupId)],
);

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").primaryKey(),
    participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    /** The gateway analysis. */
    analysisId: uuid("analysis_id").notNull().unique(),
    /** When consent to analyse and to share with the company was given (or attested by the uploader). */
    consentAt: ts("consent_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("recordings_participant_idx").on(t.participantId, t.createdAt.desc())],
);

export type Workspace = typeof workspaces.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
