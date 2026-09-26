/** POST — a fresh Stripe Checkout for a gift that was created but not paid (the buyer left the payment page). */
import { errorResponse, json, requireUser } from "@/lib/api";
import { attachStripeSession } from "@/lib/billing";
import { giftFor, startGiftPurchase } from "@/lib/gifts";
import { getDict } from "@/lib/i18n";
import { baseUrl } from "@/lib/page";
import { createCheckout, stripeReady } from "@/lib/stripe";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const gift = await giftFor(user.userId, (await ctx.params).id);
    if (!gift) return json({ error: "not_found", message: "Gift not found" }, 404);
    if (gift.status !== "pending") return json({ url: `/gift/${gift.id}` });
    if (!(await stripeReady())) return json({ error: "not_available", message: "Card payments are not set up yet" }, 503);
    const [purchase, origin, { t }] = await Promise.all([startGiftPurchase(gift), baseUrl(), getDict()]);
    const session = await createCheckout({
      purchaseId: purchase.id, name: `AVOCO · ${t.gift.nav}`, amountCents: purchase.amountCents, currency: purchase.currency,
      successUrl: `${origin}/gift/${gift.id}?paid=1&session={CHECKOUT_SESSION_ID}`, cancelUrl: `${origin}/gift/${gift.id}`,
    });
    await attachStripeSession(purchase.id, session.id);
    return json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
