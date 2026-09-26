/**
 * POST { giverName, recipientName?, message?, reports, industries? } — creates a gift and, with charging on, a Stripe
 * Checkout for it. Returns { id, url }: the payment page, or the gift page itself when nothing is to be paid.
 */
import { isAdminUser } from "@/lib/admin";
import { errorResponse, json, requireUser } from "@/lib/api";
import { attachStripeSession, getSettings } from "@/lib/billing";
import { createGift, startGiftPurchase } from "@/lib/gifts";
import { getDict } from "@/lib/i18n";
import { baseUrl } from "@/lib/page";
import { createCheckout, stripeReady } from "@/lib/stripe";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    const [cfg, admin] = await Promise.all([getSettings(), isAdminUser(user.userId)]);
    const free = !cfg.enabled || admin;
    if (!free && !(await stripeReady())) return json({ error: "not_available", message: "Card payments are not set up yet" }, 503);

    const gift = await createGift(user.userId, body ?? {}, free);
    if (free) return json({ id: gift.id, url: `/gift/${gift.id}` }, 201);

    const [purchase, origin, { t }] = await Promise.all([startGiftPurchase(gift), baseUrl(), getDict()]);
    const session = await createCheckout({
      purchaseId: purchase.id,
      name: `AVOCO · ${t.gift.nav} · ${gift.reports} × ${t.gift.form.reports}${gift.industries ? ` + ${gift.industries} × ${t.gift.form.industries}` : ""}`,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      successUrl: `${origin}/gift/${gift.id}?paid=1&session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/gift/${gift.id}`,
    });
    await attachStripeSession(purchase.id, session.id);
    return json({ id: gift.id, url: session.url }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
