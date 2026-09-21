/**
 * The platform's own data: companies (workspaces), their people and what they recorded.
 * The analyses themselves stay in the gateway; a recording here points at one by id.
 */
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

// ---------- money: credits, purchases, promo codes, unlocked reports ----------

/** Who holds credits: a person (their Clerk user id) or a company (workspace id). */
export type OwnerKind = "user" | "workspace";
export type LedgerReason = "purchase" | "grant" | "promo" | "trial" | "report" | "refund";

/**
 * Every movement of credits, and the only source of truth for a balance (the sum of delta).
 * Nothing is ever updated or deleted here. The unique index makes charging and crediting idempotent:
 * one purchase credits once, one report charges once, however often the request is repeated.
 */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey(),
    ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
    ownerId: text("owner_id").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").$type<LedgerReason>().notNull(),
    /** What this row is about: a purchase id, an analysis id, a promo code. */
    ref: text("ref"),
    /** Money received for this row, in the smallest currency unit. Only purchases (and refunds, negative) carry it. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ledger_once_idx").on(t.ownerKind, t.ownerId, t.reason, t.ref),
    index("ledger_owner_idx").on(t.ownerKind, t.ownerId, t.createdAt.desc()),
    index("ledger_created_idx").on(t.createdAt.desc()),
  ],
);

export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey(),
  ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
  ownerId: text("owner_id").notNull(),
  pack: text("pack").notNull(),
  credits: integer("credits").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  status: text("status").$type<"pending" | "paid">().notNull().default("pending"),
  /** A report to unlock as soon as the payment lands, so the buyer comes back to an open report. */
  unlockAnalysisId: uuid("unlock_analysis_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
  paidAt: ts("paid_at"),
});

export const promoCodes = pgTable("promo_codes", {
  code: text("code").primaryKey(),
  credits: integer("credits").notNull(),
  maxUses: integer("max_uses"),
  used: integer("used").notNull().default(0),
  expiresAt: ts("expires_at"),
  active: boolean("active").notNull().default(true),
  note: text("note"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** A person's own recordings. The analyses live in the gateway; this is what statistics and the free-preview cap count. */
export const selfRecordings = pgTable(
  "self_recordings",
  { analysisId: uuid("analysis_id").primaryKey(), userId: text("user_id").notNull(), createdAt: ts("created_at").notNull().defaultNow() },
  (t) => [index("self_recordings_user_idx").on(t.userId, t.createdAt.desc())],
);

/** Reports whose full version is open. */
export const reportAccess = pgTable("report_access", {
  analysisId: uuid("analysis_id").primaryKey(),
  ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
  ownerId: text("owner_id").notNull(),
  source: text("source").$type<"credit" | "free" | "admin">().notNull(),
  unlockedAt: ts("unlocked_at").notNull().defaultNow(),
});

/** What a finished report said, for statistics: filled in the first time a completed report is read. */
export const reportStats = pgTable("report_stats", {
  analysisId: uuid("analysis_id").primaryKey(),
  scope: text("scope").$type<"self" | "workspace">().notNull(),
  leadingType: text("leading_type").notNull(),
  topField: text("top_field"),
  completedAt: ts("completed_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", { key: text("key").primaryKey(), value: jsonb("value").notNull(), updatedAt: ts("updated_at").notNull().defaultNow() });

/** Platform admins, by email. ADMIN_EMAILS in the environment always counts too, so nobody can lock themselves out. */
export const admins = pgTable("admins", { email: text("email").primaryKey(), addedBy: text("added_by"), createdAt: ts("created_at").notNull().defaultNow() });
