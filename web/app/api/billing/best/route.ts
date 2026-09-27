/** POST { analysisId } — starts a Stripe Checkout for the best-industry finder on the signed-in person's own report. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, attachStripeSession, getSettings, hasFullAccess } from "@/lib/billing";
import { startBestPurchase } from "@/lib/best-billing";
import { gateway } from "@/lib/gateway";
import { getDict } from "@/lib/i18n";
import { baseUrl } from "@/lib/page";
import { checkoutContact } from "@/lib/receipts";
import { createCheckout, stripeReady } from "@/lib/stripe";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    if (!(await stripeReady())) return json({ error: "not_available", message: "Card payments are not set up yet" }, 503);
    const body = await req.json().catch(() => null);
    const analysis = typeof body?.analysisId === "string" ? await gateway.getAnalysisFor(user.userId, body.analysisId) : null;
    if (!analysis) return json({ error: "not_found", message: "Report not found" }, 404);
    if (!(await hasFullAccess(user.userId, analysis.id))) return json({ error: "payment_required", message: "Open the full report first" }, 402);

    const [purchase, origin, { t }, cfg] = await Promise.all([startBestPurchase(asUser(user.userId), analysis.id), baseUrl(), getDict(), getSettings()]);
    const back = `${origin}/reports/${analysis.id}`;
    const session = await createCheckout({
      purchaseId: purchase.id,
      name: `AVOCO · ${t.finder.offer.title}`,
      amountCents: purchase.amountCents,
      currency: cfg.currency,
      // Back on the report with the session id: the page confirms the payment itself and opens the finder at once.
      successUrl: `${back}?paid=1&session={CHECKOUT_SESSION_ID}&best=1`,
      cancelUrl: back,
      ...(await checkoutContact(user.userId)),
    });
    await attachStripeSession(purchase.id, session.id);
    return json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
