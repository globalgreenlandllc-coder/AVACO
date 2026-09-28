/**
 * POST { analysisId, ownerName, partnerName, withFamily, mode } — orders a relationship match from one of the person's
 * reports. Answers { id } when it is paid (free, or by credits), or { id, url } with a Stripe Checkout to pay by card;
 * 503 when neither credits nor card payments are available.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, attachStripeSession, getSettings } from "@/lib/billing";
import { createMatch } from "@/lib/matches";
import { baseUrl } from "@/lib/page";
import { checkoutContact } from "@/lib/receipts";
import { createCheckout, stripeReady } from "@/lib/stripe";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    const mode = body?.mode === "upload" ? "upload" : "invite";
    const { match, purchase } = await createMatch(user.userId, { analysisId: body?.analysisId, ownerName: body?.ownerName, partnerName: body?.partnerName, withFamily: body?.withFamily === true, kind: body?.kind });
    if (!purchase) return json({ id: match.id, token: match.partnerToken }, 201);
    if (!(await stripeReady())) return json({ error: "not_available", message: "Card payments are not set up yet" }, 503);
    const origin = await baseUrl();
    const session = await createCheckout({
      purchaseId: purchase.id,
      name: `AVOCO ${match.kind === "couple" ? "couple's" : "pair"} report · ${match.ownerName} & ${match.partnerName}`,
      amountCents: purchase.amountCents,
      currency: (await getSettings()).currency,
      successUrl: `${origin}/match/${match.id}?mode=${mode}&paid=1&session={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/reports/${match.analysisId}`,
      ...(await checkoutContact(user.userId)),
    });
    await attachStripeSession(purchase.id, session.id);
    void asUser;
    return json({ id: match.id, url: session.url }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
