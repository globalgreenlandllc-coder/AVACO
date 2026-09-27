/**
 * The best-industry finder's own price, in money and in credits, both editable in the admin portal. Dearer than one
 * chapter: it compares every industry and opens the winner. Bought straight from the card, the purchase carries the
 * finder's credits at its price, and completePurchase (lib/billing.ts) spends them on the finder the moment it lands.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { BEST_KEY, getSettings, type Owner } from "./billing";
import { db, purchases, settings } from "./db";

export const BEST_PACK = "best";
export const DEFAULT_BEST_PRICE_CENTS = 1290;
export const DEFAULT_BEST_CREDITS = 2;
const KEY = "best";

async function row(): Promise<{ priceCents?: unknown; credits?: unknown }> {
  const [r] = await db().select().from(settings).where(eq(settings.key, KEY));
  return (r?.value as { priceCents?: unknown; credits?: unknown } | undefined) ?? {};
}

/** The card price of the finder, in cents. */
export async function bestPriceCents(): Promise<number> {
  const { priceCents } = await row();
  return typeof priceCents === "number" && Number.isInteger(priceCents) && priceCents >= 50 ? priceCents : DEFAULT_BEST_PRICE_CENTS;
}

/** What the finder costs in report credits, for people who have them. */
export async function bestCredits(): Promise<number> {
  const { credits } = await row();
  return typeof credits === "number" && Number.isInteger(credits) && credits >= 1 ? credits : DEFAULT_BEST_CREDITS;
}

export async function saveBestPricing(input: { priceCents?: number; credits?: number }): Promise<void> {
  const current = await row();
  const value = {
    priceCents: input.priceCents !== undefined ? Math.max(50, Math.min(100_000, Math.round(input.priceCents))) : current.priceCents ?? DEFAULT_BEST_PRICE_CENTS,
    credits: input.credits !== undefined ? Math.max(1, Math.min(100, Math.trunc(input.credits))) : current.credits ?? DEFAULT_BEST_CREDITS,
  };
  await db().insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** A purchase of the finder on one report. Returns the purchase row for the Stripe Checkout. */
export async function startBestPurchase(owner: Owner, analysisId: string) {
  const [cfg, amountCents, credits] = await Promise.all([getSettings(), bestPriceCents(), bestCredits()]);
  const [r] = await db().insert(purchases).values({
    id: crypto.randomUUID(), ownerKind: owner.kind, ownerId: owner.id, pack: BEST_PACK, credits,
    amountCents, currency: cfg.currency, unlockAnalysisId: analysisId, unlockIndustry: BEST_KEY,
  }).returning();
  return r;
}
