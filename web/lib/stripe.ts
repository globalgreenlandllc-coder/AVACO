/**
 * Stripe, through its REST API (no SDK): one call to open a Checkout page, and the webhook check.
 * Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Without them the app still runs; buying is simply not offered.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const stripeReady = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

export interface CheckoutInput { purchaseId: string; name: string; amountCents: number; currency: string; successUrl: string; cancelUrl: string; email?: string }

/** Opens a Stripe Checkout session for one purchase and returns where to send the buyer. */
export async function createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency,
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.name,
    // The purchase id travels with the payment; the webhook credits exactly that purchase.
    client_reference_id: input.purchaseId,
    "metadata[purchase_id]": input.purchaseId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  if (input.email) form.set("customer_email", input.email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `checkout-${input.purchaseId}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.url !== "string") {
    console.error("Stripe checkout failed", res.status, body?.error?.type, body?.error?.code);
    throw new Error("Could not start the payment");
  }
  return { id: body.id, url: body.url };
}

const TOLERANCE_SECONDS = 300;

/**
 * Checks a webhook's Stripe-Signature header ("t=<unix>,v1=<hex>[,v1=<hex>]") against the raw body:
 * HMAC-SHA256 of "<t>.<body>" with the endpoint secret, compared in constant time, and no older than five minutes.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const candidates = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || !/^\d+$/.test(timestamp) || candidates.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"));
  return candidates.some((c) => { const given = Buffer.from(c ?? ""); return given.length === expected.length && timingSafeEqual(given, expected); });
}
