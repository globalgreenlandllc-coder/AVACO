/**
 * Money. Credits are the unit: one credit opens one full report. People buy credits for themselves,
 * companies for their workspace. Balances come from the ledger and nothing else.
 *
 * Billing can be switched off in the admin portal; then every report is free and none of this gates anything.
 */
import "server-only";
import { and, count, eq, gte, inArray, isNull, sql, sum } from "drizzle-orm";
import { isAdminUser } from "./admin";
import { isOpenVisitor } from "./visitor";
import { retrieveCheckout } from "./stripe";
import { sendReceiptLater } from "./receipts";
import { creditLedger, db, gifts, industryAccess, matches, promoCodes, purchases, reportAccess, reportStats, selfRecordings, settings, type LedgerReason, type OwnerKind } from "./db";

export class NoCredits extends Error {}
export class BadCode extends Error {}

export interface Owner { kind: OwnerKind; id: string }
export const asUser = (id: string): Owner => ({ kind: "user", id });
export const asWorkspace = (id: string): Owner => ({ kind: "workspace", id });

// ---------- settings (editable in the admin portal, no deploy needed) ----------

export interface Pack { id: string; credits: number; amountCents: number; audience: OwnerKind }
export interface BillingSettings {
  /** Off: everything is free. On: full reports need a credit. */
  enabled: boolean;
  currency: string;
  packs: Pack[];
  /** Free previews (unpaid recordings) one person may make in 30 days. Each one costs an AVOCO analysis. */
  freePreviewsPer30Days: number;
  /** Credits a new workspace starts with, so a company can try before buying. */
  workspaceTrialCredits: number;
}

export const DEFAULT_SETTINGS: BillingSettings = {
  enabled: false,
  currency: "usd",
  packs: [
    { id: "one", credits: 1, amountCents: 900, audience: "user" },
    { id: "three", credits: 3, amountCents: 1900, audience: "user" },
    { id: "ten", credits: 10, amountCents: 4900, audience: "user" },
    { id: "team25", credits: 25, amountCents: 14900, audience: "workspace" },
    { id: "team100", credits: 100, amountCents: 44900, audience: "workspace" },
    { id: "team500", credits: 500, amountCents: 179000, audience: "workspace" },
  ],
  freePreviewsPer30Days: 3,
  workspaceTrialCredits: 5,
};

export async function getSettings(): Promise<BillingSettings> {
  const [row] = await db().select().from(settings).where(eq(settings.key, "billing"));
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<BillingSettings> | undefined) ?? {}) };
}

export async function saveSettings(next: BillingSettings): Promise<void> {
  const clean: BillingSettings = {
    enabled: Boolean(next.enabled),
    currency: /^[a-z]{3}$/.test(next.currency) ? next.currency : "usd",
    packs: next.packs.filter((p) => /^[a-z0-9_-]{1,24}$/.test(p.id) && Number.isInteger(p.credits) && p.credits > 0 && Number.isInteger(p.amountCents) && p.amountCents >= 50),
    freePreviewsPer30Days: Math.max(0, Math.min(100, Math.trunc(next.freePreviewsPer30Days))),
    workspaceTrialCredits: Math.max(0, Math.min(1000, Math.trunc(next.workspaceTrialCredits))),
  };
  await db().insert(settings).values({ key: "billing", value: clean }).onConflictDoUpdate({ target: settings.key, set: { value: clean, updatedAt: new Date() } });
}

// ---------- ledger ----------

export async function balance(owner: Owner): Promise<number> {
  const [row] = await db().select({ total: sum(creditLedger.delta) }).from(creditLedger)
    .where(and(eq(creditLedger.ownerKind, owner.kind), eq(creditLedger.ownerId, owner.id)));
  return Number(row?.total ?? 0);
}

interface Entry { delta: number; reason: LedgerReason; ref?: string | null; amountCents?: number; currency?: string; note?: string | null; createdBy?: string | null }

/** Writes one ledger row. Returns false if this exact (owner, reason, ref) was already written: the caller did this before. */
async function post(owner: Owner, entry: Entry): Promise<boolean> {
  const rows = await db().insert(creditLedger).values({
    id: crypto.randomUUID(), ownerKind: owner.kind, ownerId: owner.id, delta: entry.delta, reason: entry.reason,
    ref: entry.ref ?? null, amountCents: entry.amountCents ?? 0, currency: entry.currency ?? "usd", note: entry.note ?? null, createdBy: entry.createdBy ?? null,
  }).onConflictDoNothing().returning({ id: creditLedger.id });
  return rows.length > 0;
}

/** A claimed gift's credits, into the recipient's balance: once per gift, however many times it is asked. */
export async function creditGift(owner: Owner, credits: number, giftId: string, from: string): Promise<boolean> {
  return post(owner, { delta: credits, reason: "gift", ref: giftId, note: from.slice(0, 200) });
}

/** An admin gives (or takes back, with a negative number) credits. Never idempotent: each grant is its own act. */
export async function grant(owner: Owner, credits: number, by: string, note?: string): Promise<void> {
  if (!Number.isInteger(credits) || credits === 0 || Math.abs(credits) > 100_000) throw new Error("Credits must be a non-zero whole number");
  await post(owner, { delta: credits, reason: "grant", ref: crypto.randomUUID(), note: note?.slice(0, 200) ?? null, createdBy: by });
}

/**
 * Takes one credit for a report. Idempotent per report: a repeat is free and returns true.
 * (Two different reports charged in the same instant could both pass the balance check; the ledger then shows -1,
 * which the next purchase absorbs. Accepted: the HTTP database driver has no transactions, and the loss is one credit.)
 */
export async function charge(owner: Owner, analysisId: string): Promise<boolean> {
  const [already] = await db().select({ id: creditLedger.id }).from(creditLedger)
    .where(and(eq(creditLedger.ownerKind, owner.kind), eq(creditLedger.ownerId, owner.id), eq(creditLedger.reason, "report"), eq(creditLedger.ref, analysisId)));
  if (already) return true;
  if ((await balance(owner)) < 1) return false;
  await post(owner, { delta: -1, reason: "report", ref: analysisId });
  return true;
}

export async function workspaceTrial(workspaceId: string): Promise<void> {
  const { workspaceTrialCredits } = await getSettings();
  if (workspaceTrialCredits > 0) await post(asWorkspace(workspaceId), { delta: workspaceTrialCredits, reason: "trial", ref: "welcome" });
}

// ---------- purchases ----------

/** `unlockAnalysisId` is the report the buyer was looking at; `unlockIndustry`, the industry chapter they were about to open on it. */
export async function startPurchase(owner: Owner, packId: string, unlockAnalysisId?: string | null, unlockIndustry?: string | null) {
  const cfg = await getSettings();
  const pack = cfg.packs.find((p) => p.id === packId && p.audience === owner.kind);
  if (!pack) throw new BadCode("Unknown pack");
  const [row] = await db().insert(purchases).values({
    id: crypto.randomUUID(), ownerKind: owner.kind, ownerId: owner.id, pack: pack.id, credits: pack.credits,
    amountCents: pack.amountCents, currency: cfg.currency, unlockAnalysisId: unlockAnalysisId ?? null, unlockIndustry: unlockAnalysisId ? unlockIndustry ?? null : null,
  }).returning();
  return row;
}

export async function attachStripeSession(purchaseId: string, sessionId: string): Promise<void> {
  await db().update(purchases).set({ stripeSessionId: sessionId }).where(eq(purchases.id, purchaseId));
}

/** Called by the Stripe webhook. Safe to call any number of times for the same purchase. */
export async function completePurchase(purchaseId: string, paid: { amountCents: number; currency: string }): Promise<"credited" | "already" | "unknown"> {
  const [p] = await db().select().from(purchases).where(eq(purchases.id, purchaseId));
  if (!p) return "unknown";
  const owner: Owner = { kind: p.ownerKind, id: p.ownerId };
  if (p.giftId) {
    // A gift: the money is recorded on the buyer, the credits wait in the gift until the recipient claims it (lib/gifts.ts).
    const fresh = await post(owner, { delta: 0, reason: "purchase", ref: p.id, amountCents: paid.amountCents, currency: paid.currency, note: `gift ${p.giftId}` });
    await db().update(purchases).set({ status: "paid", paidAt: new Date() }).where(and(eq(purchases.id, p.id), eq(purchases.status, "pending")));
    await db().update(gifts).set({ status: "paid", paidAt: new Date() }).where(and(eq(gifts.id, p.giftId), eq(gifts.status, "pending")));
    if (fresh) sendReceiptLater(p.id);
    return fresh ? "credited" : "already";
  }
  const fresh = await post(owner, { delta: p.credits, reason: "purchase", ref: p.id, amountCents: paid.amountCents, currency: paid.currency, note: p.pack });
  await db().update(purchases).set({ status: "paid", paidAt: new Date() }).where(and(eq(purchases.id, p.id), eq(purchases.status, "pending")));
  if (p.matchId) await payMatch(owner, p);
  if (p.unlockAnalysisId && owner.kind === "user") {
    // What the buyer came for: the report, then the industry chapter they were looking at. Both cost nothing when already open.
    await unlock(owner.id, p.unlockAnalysisId).catch(() => {});
    // The best-industry finder spends the purchase's own credits (its price in credits); a chapter spends one.
    if (p.unlockIndustry === BEST_KEY) await unlockBest(owner.id, p.unlockAnalysisId, p.credits).catch(() => {});
    else if (p.unlockIndustry) await unlockIndustry(owner.id, p.unlockAnalysisId, p.unlockIndustry).catch(() => {});
  }
  // Only the call that recorded the payment sends the receipt, so the webhook and the return page never send two.
  if (fresh) sendReceiptLater(p.id);
  return fresh ? "credited" : "already";
}

/**
 * The buyer is back from Stripe with the session id in the URL. Asks Stripe whether that session was paid and, if so,
 * completes the purchase right away: usually the webhook has done it already and this changes nothing, but when the
 * webhook is slow the buyer must not come back to a closed report. Only the purchase's own owner can confirm it.
 */
export async function confirmCheckout(owner: Owner, sessionId: string): Promise<{ purchase: typeof purchases.$inferSelect; paid: boolean } | null> {
  const [p] = await db().select().from(purchases).where(and(eq(purchases.stripeSessionId, sessionId), eq(purchases.ownerKind, owner.kind), eq(purchases.ownerId, owner.id)));
  if (!p) return null;
  if (p.status === "paid") return { purchase: p, paid: true };
  const session = await retrieveCheckout(sessionId).catch(() => null);
  if (!session?.paid) return { purchase: p, paid: false };
  await completePurchase(p.id, { amountCents: session.amountCents, currency: session.currency });
  return { purchase: p, paid: true };
}

// ---------- promo codes ----------

export async function redeem(owner: Owner, rawCode: unknown): Promise<number> {
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  if (!code) throw new BadCode("Enter a code");
  const [promo] = await db().select().from(promoCodes).where(eq(promoCodes.code, code));
  const usable = promo && promo.active && (!promo.expiresAt || promo.expiresAt > new Date()) && (promo.maxUses === null || promo.used < promo.maxUses);
  if (!usable) throw new BadCode("This code isn't valid");
  // One use per owner: the ledger's unique index is the guard.
  if (!(await post(owner, { delta: promo.credits, reason: "promo", ref: code }))) throw new BadCode("You have already used this code");
  await db().update(promoCodes).set({ used: sql`${promoCodes.used} + 1` }).where(eq(promoCodes.code, code));
  return promo.credits;
}

// ---------- a person's own reports: recorded, locked, unlocked ----------

export async function noteSelfRecording(userId: string, analysisId: string): Promise<void> {
  await db().insert(selfRecordings).values({ analysisId, userId }).onConflictDoNothing();
}

export async function forgetReport(analysisId: string): Promise<void> {
  await db().delete(selfRecordings).where(eq(selfRecordings.analysisId, analysisId));
  await db().delete(reportAccess).where(eq(reportAccess.analysisId, analysisId));
  await db().delete(industryAccess).where(eq(industryAccess.analysisId, analysisId));
}

/** Full, or preview only? Admins always get the full report; reports made before billing was switched on (no recording row) stay open. */
export async function hasFullAccess(userId: string, analysisId: string): Promise<boolean> {
  if (isOpenVisitor(userId) || !(await getSettings()).enabled || (await isAdminUser(userId))) return true;
  const [recorded] = await db().select().from(selfRecordings).where(eq(selfRecordings.analysisId, analysisId));
  if (!recorded) return true;
  const [open] = await db().select().from(reportAccess).where(and(eq(reportAccess.analysisId, analysisId), eq(reportAccess.ownerId, userId)));
  return Boolean(open);
}

/** hasFullAccess for a whole list at once (the reports page): the ids of the reports that open in full. */
export async function fullAccessIds(userId: string, analysisIds: string[]): Promise<Set<string>> {
  if (analysisIds.length === 0) return new Set();
  if (isOpenVisitor(userId) || !(await getSettings()).enabled || (await isAdminUser(userId))) return new Set(analysisIds);
  const [recorded, open] = await Promise.all([
    db().select({ id: selfRecordings.analysisId }).from(selfRecordings).where(inArray(selfRecordings.analysisId, analysisIds)),
    db().select({ id: reportAccess.analysisId }).from(reportAccess).where(and(eq(reportAccess.ownerId, userId), inArray(reportAccess.analysisId, analysisIds))),
  ]);
  const gated = new Set(recorded.map((r) => r.id));
  const opened = new Set(open.map((r) => r.id));
  return new Set(analysisIds.filter((id) => !gated.has(id) || opened.has(id)));
}

/**
 * Spends one credit to open a report. Nothing is spent when it is open already: billing off, a report from before
 * charging was switched on, an admin, or a report opened earlier. Throws NoCredits when there is nothing to spend.
 */
export async function unlock(userId: string, analysisId: string): Promise<void> {
  if (await hasFullAccess(userId, analysisId)) return;
  if (!(await charge(asUser(userId), analysisId))) throw new NoCredits("No credits");
  await db().insert(reportAccess).values({ analysisId, ownerKind: "user", ownerId: userId, source: "credit" }).onConflictDoNothing();
}

/** May this person make another free preview? Counts recordings of the last 30 days that were never unlocked; admins are never capped. */
export async function previewsLeft(userId: string): Promise<number> {
  if (isOpenVisitor(userId)) return Infinity;
  const cfg = await getSettings();
  if (!cfg.enabled || (await isAdminUser(userId))) return Infinity;
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [row] = await db().select({ n: count() }).from(selfRecordings)
    .leftJoin(reportAccess, eq(reportAccess.analysisId, selfRecordings.analysisId))
    .where(and(eq(selfRecordings.userId, userId), gte(selfRecordings.createdAt, since), sql`${reportAccess.analysisId} is null`));
  return Math.max(0, cfg.freePreviewsPer30Days - (row?.n ?? 0));
}

// ---------- industry chapters (lib/industries.ts): one credit each, per report ----------

const industryRef = (analysisId: string, industry: string) => `${analysisId}:${industry}`;

/** Takes one credit for an industry chapter. Idempotent per report and industry, like charge(). */
export async function chargeIndustry(owner: Owner, analysisId: string, industry: string): Promise<boolean> {
  const ref = industryRef(analysisId, industry);
  const [already] = await db().select({ id: creditLedger.id }).from(creditLedger)
    .where(and(eq(creditLedger.ownerKind, owner.kind), eq(creditLedger.ownerId, owner.id), eq(creditLedger.reason, "industry"), eq(creditLedger.ref, ref)));
  if (already) return true;
  if ((await balance(owner)) < 1) return false;
  await post(owner, { delta: -1, reason: "industry", ref });
  return true;
}

/**
 * The best-industry finder on one report: every industry compared, the winner opened (lib/industries.ts industryMatches).
 * Kept in industry_access under this key, beside the chapters; charged once per report, in its own number of credits.
 */
export const BEST_KEY = "best";

export async function chargeBest(owner: Owner, analysisId: string, credits: number): Promise<boolean> {
  const ref = industryRef(analysisId, BEST_KEY);
  const [already] = await db().select({ id: creditLedger.id }).from(creditLedger)
    .where(and(eq(creditLedger.ownerKind, owner.kind), eq(creditLedger.ownerId, owner.id), eq(creditLedger.reason, "best"), eq(creditLedger.ref, ref)));
  if (already) return true;
  if ((await balance(owner)) < credits) return false;
  await post(owner, { delta: -credits, reason: "best", ref });
  return true;
}

/** Opens the finder on a person's own report: free while charging is off, on the open host and for admins; otherwise `credits`. */
export async function unlockBest(userId: string, analysisId: string, credits: number): Promise<void> {
  const free = isOpenVisitor(userId) || !(await getSettings()).enabled;
  const admin = !free && (await isAdminUser(userId));
  if (!free && !admin && !(await chargeBest(asUser(userId), analysisId, credits))) throw new NoCredits("No credits");
  await db().insert(industryAccess).values({ analysisId, industry: BEST_KEY, ownerKind: "user", ownerId: userId, source: free ? "free" : admin ? "admin" : "credit" }).onConflictDoNothing();
}

/** Whether the finder is open on this report: always asked for once, even where it costs nothing, so it never appears unasked. */
export async function hasBestAccess(userId: string, analysisId: string): Promise<boolean> {
  const [row] = await db().select({ industry: industryAccess.industry }).from(industryAccess)
    .where(and(eq(industryAccess.analysisId, analysisId), eq(industryAccess.industry, BEST_KEY), eq(industryAccess.ownerId, userId)));
  return Boolean(row);
}

/** Opens an industry chapter on a person's own report; admins pay nothing. Throws NoCredits when there is nothing to spend. */
export async function unlockIndustry(userId: string, analysisId: string, industry: string): Promise<void> {
  const admin = await isAdminUser(userId);
  if (!admin && !(await chargeIndustry(asUser(userId), analysisId, industry))) throw new NoCredits("No credits");
  await db().insert(industryAccess).values({ analysisId, industry, ownerKind: "user", ownerId: userId, source: admin ? "admin" : "credit" }).onConflictDoNothing();
}

/** Industries already open on a report. */
export async function openIndustries(analysisId: string): Promise<string[]> {
  const rows = await db().select({ industry: industryAccess.industry }).from(industryAccess).where(eq(industryAccess.analysisId, analysisId));
  return rows.map((r) => r.industry);
}

/**
 * May this person read this industry chapter? Free when billing is off; otherwise it must have been opened.
 * Admins are not waved through here on purpose: they see the same closed chapter a client sees and open it
 * with the same button, which unlockIndustry() makes free for them. That is how the paid flow gets tested.
 */
export async function hasIndustryAccess(userId: string, analysisId: string, industry: string): Promise<boolean> {
  if (isOpenVisitor(userId) || !(await getSettings()).enabled) return true;
  const [row] = await db().select({ industry: industryAccess.industry }).from(industryAccess)
    .where(and(eq(industryAccess.analysisId, analysisId), eq(industryAccess.industry, industry), eq(industryAccess.ownerId, userId)));
  return Boolean(row);
}

// ---------- relationship match (lib/matches.ts): its credits (lib/match-billing.ts), once per match ----------

/** Takes the match's credits. Idempotent per match, like charge(). */
export async function chargeMatch(owner: Owner, matchId: string, credits: number): Promise<boolean> {
  const [already] = await db().select({ id: creditLedger.id }).from(creditLedger)
    .where(and(eq(creditLedger.ownerKind, owner.kind), eq(creditLedger.ownerId, owner.id), eq(creditLedger.reason, "match"), eq(creditLedger.ref, matchId)));
  if (already) return true;
  if ((await balance(owner)) < credits) return false;
  await post(owner, { delta: -credits, reason: "match", ref: matchId });
  return true;
}

/** A card payment for a match landed: its credits go in and straight out again, and the match opens. */
async function payMatch(owner: Owner, p: { id: string; matchId: string | null; credits: number }): Promise<void> {
  if (!p.matchId) return;
  await chargeMatch(owner, p.matchId, p.credits).catch(() => {});
  await db().update(matches).set({ paidAt: new Date(), source: "credit" }).where(and(eq(matches.id, p.matchId), isNull(matches.paidAt)));
}

/** Is a match free for this person? Billing off, an admin, or an open-host visitor. */
export async function matchIsFree(userId: string): Promise<"free" | "admin" | null> {
  if (isOpenVisitor(userId) || !(await getSettings()).enabled) return "free";
  return (await isAdminUser(userId)) ? "admin" : null;
}

// ---------- statistics feed ----------

export async function noteResult(analysisId: string, scope: "self" | "workspace", leadingType: string | undefined, topField: string | undefined): Promise<void> {
  if (!leadingType) return;
  await db().insert(reportStats).values({ analysisId, scope, leadingType, topField: topField ?? null }).onConflictDoNothing();
}
