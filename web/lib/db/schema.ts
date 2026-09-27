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
export type LedgerReason = "purchase" | "grant" | "promo" | "trial" | "report" | "industry" | "best" | "match" | "gift" | "refund";

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
  /** And, when the purchase started from a closed industry chapter, that industry: it is opened with the new credit. */
  unlockIndustry: text("unlock_industry"),
  /** A gift being paid for (lib/gifts.ts): its credits wait in the gift, the buyer's balance is untouched. */
  giftId: uuid("gift_id"),
  /** A relationship match bought straight from the card: paid for the moment the payment lands (lib/match-billing.ts). */
  matchId: uuid("match_id"),
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

/**
 * Whose voice a report is (lib/people.ts): the name the account holder gave it. No row: their own voice. One person's
 * reports are read together, as their type across recordings, and never mixed with anyone else's.
 */
export const reportPeople = pgTable(
  "report_people",
  { analysisId: uuid("analysis_id").primaryKey(), ownerId: text("owner_id").notNull(), name: text("name").notNull(), updatedAt: ts("updated_at").notNull().defaultNow() },
  (t) => [index("report_people_owner_idx").on(t.ownerId)],
);

/** Reports whose full version is open. */
export const reportAccess = pgTable("report_access", {
  analysisId: uuid("analysis_id").primaryKey(),
  ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
  ownerId: text("owner_id").notNull(),
  source: text("source").$type<"credit" | "free" | "admin">().notNull(),
  unlockedAt: ts("unlocked_at").notNull().defaultNow(),
});

/** Industry chapters opened on a report (lib/industries.ts). One row per report and industry. */
export const industryAccess = pgTable(
  "industry_access",
  {
    analysisId: uuid("analysis_id").notNull(),
    industry: text("industry").notNull(),
    ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
    ownerId: text("owner_id").notNull(),
    source: text("source").$type<"credit" | "free" | "admin">().notNull(),
    unlockedAt: ts("unlocked_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.analysisId, t.industry] })],
);

/** A relationship match (lib/match.ts): the orderer's report, the partner's private link, and the payment. The partner's
 *  recordings live in the gateway under "m:<id>"; the match is ready once one of them has completed. */
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey(),
    ownerKind: text("owner_kind").$type<OwnerKind>().notNull(),
    ownerId: text("owner_id").notNull(),
    analysisId: uuid("analysis_id").notNull(),
    ownerName: text("owner_name").notNull(),
    partnerName: text("partner_name").notNull(),
    partnerToken: text("partner_token").notNull().unique(),
    withFamily: boolean("with_family").notNull().default(false),
    source: text("source").$type<"credit" | "free" | "admin">().notNull(),
    partnerConsentAt: ts("partner_consent_at"),
    /** Null while a card payment is still pending; the partner's link stays closed until then. */
    paidAt: ts("paid_at"),
    /** When the partner first opened their link, and when they first pressed record or chose a file: the orderer watches this. */
    partnerOpenedAt: ts("partner_opened_at"),
    partnerStartedAt: ts("partner_started_at"),
    /** When the couple's report first existed, and when the orderer first opened it: the "report ready" notice lives between the two. */
    readyAt: ts("ready_at"),
    ownerSeenAt: ts("owner_seen_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("matches_owner_idx").on(t.ownerKind, t.ownerId, t.createdAt.desc())],
);

/**
 * A gift (lib/gifts.ts): paid by one person, claimed by another into their own account. Its credits wait in the gift
 * until it is claimed; the recipient's first `reports` recordings are then opened with them, no paywall.
 */
export const gifts = pgTable(
  "gifts",
  {
    id: uuid("id").primaryKey(),
    token: text("token").notNull().unique(),
    giverId: text("giver_id").notNull(),
    giverName: text("giver_name").notNull(),
    recipientName: text("recipient_name"),
    message: text("message"),
    reports: integer("reports").notNull(),
    industries: integer("industries").notNull().default(0),
    /** Relationship matches (lib/matches.ts, MATCH_CREDITS each): the recipient invites their partner with the gifted credits. */
    matches: integer("matches").notNull().default(0),
    /** Best-match industry finders (lib/best-billing.ts, its credits each): the recipient finds their best industry with the gifted credits. */
    best: integer("best").notNull().default(0),
    reportsUsed: integer("reports_used").notNull().default(0),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").$type<"pending" | "paid" | "claimed">().notNull().default("pending"),
    claimedBy: text("claimed_by"),
    paidAt: ts("paid_at"),
    openedAt: ts("opened_at"),
    claimedAt: ts("claimed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("gifts_giver_idx").on(t.giverId, t.createdAt.desc()), index("gifts_claimed_idx").on(t.claimedBy)],
);

/** What a finished report said, for statistics: filled in the first time a completed report is read. */
export const reportStats = pgTable("report_stats", {
  analysisId: uuid("analysis_id").primaryKey(),
  scope: text("scope").$type<"self" | "workspace">().notNull(),
  leadingType: text("leading_type").notNull(),
  topField: text("top_field"),
  completedAt: ts("completed_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", { key: text("key").primaryKey(), value: jsonb("value").notNull(), updatedAt: ts("updated_at").notNull().defaultNow() });

/**
 * Machine translations of the English dictionary for languages added in the admin portal: one row per string,
 * keyed by its path in the dictionary, with a hash of the English it was made from, so a changed source is
 * translated again and the rest is kept.
 */
export const translations = pgTable(
  "translations",
  {
    lang: text("lang").notNull(),
    path: text("path").notNull(),
    sourceHash: text("source_hash").notNull(),
    text: text("text").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.lang, t.path] })],
);

/** Platform admins, by email. ADMIN_EMAILS in the environment always counts too, so nobody can lock themselves out. */
export const admins = pgTable("admins", { email: text("email").primaryKey(), addedBy: text("added_by"), createdAt: ts("created_at").notNull().defaultNow() });

/**
 * One page view (components/VisitBeacon.tsx → /api/visit): the numbers behind Admin → Statistics. Nothing that
 * identifies a person is kept: no address, no browser description. The visitor is a random id in a first-party
 * cookie, the session the tab's visit, the account only when someone is signed in. Admins' own views are left out.
 */
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey(),
    at: ts("at").notNull().defaultNow(),
    /** Which site: the main domain, the partner page hosts, or the open host (lib/visitor.ts). */
    site: text("site").$type<"main" | "partner" | "open">().notNull(),
    /** The page with its ids taken out: /reports/[id]. */
    path: text("path").notNull(),
    visitor: text("visitor").notNull(),
    session: text("session").notNull(),
    userId: text("user_id"),
    /** The first page of the session. */
    landing: boolean("landing").notNull().default(false),
    /** Where the session came from: a campaign's utm_source, or the referring site in a word (google, instagram, direct…). */
    source: text("source"),
    campaign: text("campaign"),
    /** Two-letter country from the edge, when known. */
    country: text("country"),
    device: text("device").$type<"phone" | "tablet" | "desktop">().notNull().default("desktop"),
    locale: text("locale"),
  },
  (t) => [index("visits_at_idx").on(t.at.desc()), index("visits_visitor_idx").on(t.visitor, t.at.desc())],
);
