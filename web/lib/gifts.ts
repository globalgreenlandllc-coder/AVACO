/**
 * Gifts: someone pays for a report (and industry chapters, a best-match industry, relationship matches) for a person they care about, gets a private link to
 * send, and the recipient claims it into their own account and records without paying. The credits wait in the
 * gift until it is claimed; the giver's balance is never touched. Server only.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { asUser, creditGift, getSettings, unlock, type BillingSettings } from "./billing";
import { DEFAULT_MATCH_CREDITS, matchCredits, matchPriceCents } from "./match-billing";
import { bestCredits, bestPriceCents, DEFAULT_BEST_CREDITS } from "./best-billing";
import { db, gifts, purchases } from "./db";
import { industryPriceCents } from "./industry-billing";
import { Invalid } from "./workspaces";

export type Gift = typeof gifts.$inferSelect;
export const GIFT_PACK = "gift";
export const MAX_REPORTS = 5;
export const MAX_INDUSTRIES = 5;
export const MAX_MATCHES = 2;
export const MAX_BEST = 3;

const clean = (v: unknown, max: number, what: string, required: boolean) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw new Invalid(`${what} is required`);
  if (s.length > max) throw new Invalid(`${what}: up to ${max} characters`);
  return s;
};
const count = (v: unknown, min: number, max: number, what: string) => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new Invalid(`${what}: ${min} to ${max}`);
  return n;
};

/**
 * The credits a gift carries: one per report, one per industry chapter, the match's credits (lib/match-billing.ts) per
 * relationship match and the finder's credits (lib/best-billing.ts) per best-match industry.
 */
export const giftCredits = (g: { reports: number; industries: number; matches: number; best?: number }, matchN = DEFAULT_MATCH_CREDITS, bestN = DEFAULT_BEST_CREDITS) =>
  g.reports + g.industries + g.matches * matchN + (g.best ?? 0) * bestN;

/** Both add-on credit counts at once, as the admin portal has set them. */
const addonCredits = () => Promise.all([matchCredits(), bestCredits()]);

/** What a gift costs: each report at the single-report price, each chapter, match and best-match finder at the add-on's own price. */
export async function giftPrice(reports: number, industries: number, matches = 0, cfg?: BillingSettings, best = 0): Promise<{ amountCents: number; currency: string; reportCents: number; industryCents: number; matchCents: number; bestCents: number }> {
  const settings = cfg ?? (await getSettings());
  const people = settings.packs.filter((p) => p.audience === "user");
  const reportCents = people.find((p) => p.credits === 1)?.amountCents ?? (people.length ? Math.min(...people.map((p) => Math.round(p.amountCents / p.credits))) : 900);
  const industryCents = await industryPriceCents();
  const [matchCents, bestCents] = await Promise.all([matchPriceCents(), bestPriceCents()]);
  return { amountCents: reports * reportCents + industries * industryCents + matches * matchCents + best * bestCents, currency: settings.currency, reportCents, industryCents, matchCents, bestCents };
}

export interface GiftInput { giverName: unknown; recipientName?: unknown; message?: unknown; reports: unknown; industries?: unknown; matches?: unknown; best?: unknown }

/** A new gift, unpaid unless `free` (billing off, or an admin): then it is ready to send at once. */
export async function createGift(userId: string, input: GiftInput, free = false): Promise<Gift> {
  const giverName = clean(input.giverName, 60, "Your name", true);
  const recipientName = clean(input.recipientName, 60, "Their name", false);
  const message = clean(input.message, 300, "Message", false);
  const reports = count(input.reports, 1, MAX_REPORTS, "Reports");
  const industries = count(input.industries ?? 0, 0, MAX_INDUSTRIES, "Industry chapters");
  const matches = count(input.matches ?? 0, 0, MAX_MATCHES, "Relationship matches");
  const best = count(input.best ?? 0, 0, MAX_BEST, "Best-match industry");
  const price = await giftPrice(reports, industries, matches, undefined, best);
  const [gift] = await db().insert(gifts).values({
    id: crypto.randomUUID(), token: randomBytes(24).toString("base64url"), giverId: userId, giverName,
    recipientName: recipientName || null, message: message || null, reports, industries, matches, best,
    amountCents: free ? 0 : price.amountCents, currency: price.currency, status: free ? "paid" : "pending", paidAt: free ? new Date() : null,
  }).returning();
  return gift;
}

/** The purchase behind a gift, for Stripe Checkout. Its credits go to the gift, not to the buyer (see completePurchase). */
export async function startGiftPurchase(gift: Gift) {
  const [row] = await db().insert(purchases).values({
    id: crypto.randomUUID(), ownerKind: "user", ownerId: gift.giverId, pack: GIFT_PACK, credits: giftCredits(gift, ...(await addonCredits())),
    amountCents: gift.amountCents, currency: gift.currency, giftId: gift.id,
  }).returning();
  return row;
}

export async function giftFor(userId: string, id: string): Promise<Gift | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [g] = await db().select().from(gifts).where(and(eq(gifts.id, id), eq(gifts.giverId, userId)));
  return g ?? null;
}

/** The gifts this person has given, newest first. */
export async function giftsFor(userId: string): Promise<Gift[]> {
  return db().select().from(gifts).where(eq(gifts.giverId, userId)).orderBy(desc(gifts.createdAt));
}

export async function giftByToken(token: string): Promise<Gift | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [g] = await db().select().from(gifts).where(eq(gifts.token, token));
  return g ?? null;
}

/** The recipient opened the link (first time only): the giver watches this. */
export async function noteGiftOpened(gift: Gift): Promise<void> {
  if (!gift.openedAt) await db().update(gifts).set({ openedAt: new Date() }).where(and(eq(gifts.id, gift.id), eq(gifts.status, gift.status)));
}

/**
 * The recipient takes the gift into their own account: its credits become theirs, exactly once, and their next
 * recordings open with them (coverWithGift). A gift already claimed by someone else is refused.
 */
export async function claimGift(gift: Gift, userId: string): Promise<Gift> {
  if (gift.status === "pending") throw new Invalid("This gift has not been paid for yet");
  if (gift.claimedBy && gift.claimedBy !== userId) throw new Invalid("This gift has already been claimed");
  await creditGift(asUser(userId), giftCredits(gift, ...(await addonCredits())), gift.id, gift.giverName);
  const [row] = await db().update(gifts).set({ status: "claimed", claimedBy: userId, claimedAt: gift.claimedAt ?? new Date(), openedAt: gift.openedAt ?? new Date() }).where(eq(gifts.id, gift.id)).returning();
  return row;
}

/** A claimed gift of this person's that still has reports to give. */
export async function activeGift(userId: string): Promise<Gift | null> {
  const rows = await db().select().from(gifts).where(and(eq(gifts.claimedBy, userId), eq(gifts.status, "claimed"))).orderBy(desc(gifts.claimedAt));
  return rows.find((g) => g.reportsUsed < g.reports) ?? null;
}

/** A recording by someone holding a gift: the report is opened with the gift's credit at once, so they never meet a paywall. */
export async function coverWithGift(userId: string, analysisId: string): Promise<Gift | null> {
  const gift = await activeGift(userId);
  if (!gift) return null;
  await unlock(userId, analysisId);
  const [row] = await db().update(gifts).set({ reportsUsed: gift.reportsUsed + 1 }).where(eq(gifts.id, gift.id)).returning();
  return row;
}
