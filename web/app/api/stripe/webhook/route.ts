/**
 * POST — Stripe tells us a payment happened. The signature is the only credential, so it is checked against the raw
 * body before anything is parsed. Crediting is idempotent: Stripe retries, and a retry changes nothing.
 */
import { completePurchase } from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/stripe";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) {
    return Response.json({ error: "unauthorized", message: "Bad signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const session = event?.data?.object;
  if (event?.type === "checkout.session.completed" && session?.payment_status === "paid") {
    const purchaseId = session.metadata?.purchase_id ?? session.client_reference_id;
    if (typeof purchaseId === "string") {
      const outcome = await completePurchase(purchaseId, { amountCents: Number(session.amount_total) || 0, currency: String(session.currency ?? "usd") });
      if (outcome === "unknown") console.error("Stripe paid an unknown purchase", purchaseId);
    }
  }
  return Response.json({ received: true });
}
