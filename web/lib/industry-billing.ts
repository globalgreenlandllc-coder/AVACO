/**
 * The industry add-on's own price and purchase. A chapter is bought straight from the card on the report, at its
 * own price (not a report pack): the purchase carries one credit at that price, and completePurchase (lib/billing.ts)
 * spends it on the chapter the moment the payment lands, so it never becomes a cheap report credit.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { getSettings, type Owner } from "./billing";
import { db, purchases, settings } from "./db";

export const INDUSTRY_PACK = "industry";
export const DEFAULT_INDUSTRY_PRICE_CENTS = 490;
const KEY = "industry";

/** The price of one industry chapter, in cents; editable in the admin portal, kept in its own settings row. */
export async function industryPriceCents(): Promise<number> {
  const [row] = await db().select().from(settings).where(eq(settings.key, KEY));
  const cents = (row?.value as { priceCents?: unknown } | undefined)?.priceCents;
  return typeof cents === "number" && Number.isInteger(cents) && cents >= 50 ? cents : DEFAULT_INDUSTRY_PRICE_CENTS;
}

export async function saveIndustryPrice(cents: number): Promise<void> {
  const value = { priceCents: Math.max(50, Math.min(100_000, Math.round(cents))) };
  await db().insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** A purchase of exactly one industry chapter on one report. Returns the purchase row for the Stripe Checkout. */
export async function startIndustryPurchase(owner: Owner, analysisId: string, industry: string) {
  const [cfg, amountCents] = await Promise.all([getSettings(), industryPriceCents()]);
  const [row] = await db().insert(purchases).values({
    id: crypto.randomUUID(), ownerKind: owner.kind, ownerId: owner.id, pack: INDUSTRY_PACK, credits: 1,
    amountCents, currency: cfg.currency, unlockAnalysisId: analysisId, unlockIndustry: industry,
  }).returning();
  return row;
}
