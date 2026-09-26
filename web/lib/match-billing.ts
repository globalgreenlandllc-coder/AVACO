/**
 * The relationship match's own price, in money and in credits, both editable in the admin portal. Like the industry
 * chapter, a match can be bought straight from the card: the purchase carries the match's credits at the match price,
 * and completePurchase (lib/billing.ts) spends them on the match the moment the payment lands.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { getSettings, type Owner } from "./billing";
import { db, purchases, settings } from "./db";

export const MATCH_PACK = "match";
export const DEFAULT_MATCH_PRICE_CENTS = 1490;
export const DEFAULT_MATCH_CREDITS = 2;
const KEY = "match";

async function row(): Promise<{ priceCents?: unknown; credits?: unknown }> {
  const [r] = await db().select().from(settings).where(eq(settings.key, KEY));
  return (r?.value as { priceCents?: unknown; credits?: unknown } | undefined) ?? {};
}

/** The card price of one couple's report, in cents. */
export async function matchPriceCents(): Promise<number> {
  const { priceCents } = await row();
  return typeof priceCents === "number" && Number.isInteger(priceCents) && priceCents >= 50 ? priceCents : DEFAULT_MATCH_PRICE_CENTS;
}

/** What a couple's report costs in report credits, for people who have them. */
export async function matchCredits(): Promise<number> {
  const { credits } = await row();
  return typeof credits === "number" && Number.isInteger(credits) && credits >= 1 ? credits : DEFAULT_MATCH_CREDITS;
}

export async function saveMatchPricing(input: { priceCents?: number; credits?: number }): Promise<void> {
  const current = await row();
  const value = {
    priceCents: input.priceCents !== undefined ? Math.max(50, Math.min(100_000, Math.round(input.priceCents))) : current.priceCents ?? DEFAULT_MATCH_PRICE_CENTS,
    credits: input.credits !== undefined ? Math.max(1, Math.min(100, Math.trunc(input.credits))) : current.credits ?? DEFAULT_MATCH_CREDITS,
  };
  await db().insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** A purchase of exactly one couple's report. Returns the purchase row for the Stripe Checkout. */
export async function startMatchPurchase(owner: Owner, analysisId: string, matchId: string) {
  const [cfg, amountCents, credits] = await Promise.all([getSettings(), matchPriceCents(), matchCredits()]);
  const [r] = await db().insert(purchases).values({
    id: crypto.randomUUID(), ownerKind: owner.kind, ownerId: owner.id, pack: MATCH_PACK, credits,
    amountCents, currency: cfg.currency, unlockAnalysisId: analysisId, matchId,
  }).returning();
  return r;
}
