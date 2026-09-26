/**
 * Stripe, through its REST API (no SDK): one call to open a Checkout page, and the webhook check.
 * The keys come from the admin portal (stored sealed in the settings table) or, failing that, from
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the environment. Without either the app still runs;
 * buying is simply not offered.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, settings } from "./db";
import { open, seal, secretsReady } from "./secrets";

export interface StripeKeys { secretKey: string; webhookSecret: string }

/** What the settings row holds. The two secrets are sealed; the rest is for the admin page. */
interface StoredStripe { secretKey: string; webhookSecret: string; account: string; mode: "live" | "test"; keyHint: string; savedBy: string; savedAt: string; /** The endpoint the app registered itself, if it did. */ webhookId?: string; webhookUrl?: string }

async function storedStripe(): Promise<StoredStripe | null> {
  const [row] = await db().select().from(settings).where(eq(settings.key, "stripe"));
  const value = row?.value as Partial<StoredStripe> | undefined;
  return value?.secretKey && value.webhookSecret ? (value as StoredStripe) : null;
}

/** The keys in use: the ones saved in the admin portal, or else the environment's. */
export async function stripeKeys(): Promise<StripeKeys | null> {
  const stored = await storedStripe();
  if (stored && secretsReady()) {
    try {
      return { secretKey: open(stored.secretKey), webhookSecret: open(stored.webhookSecret) };
    } catch (err) {
      console.error("The stored Stripe keys can't be read (was SETTINGS_SECRET changed?)", err);
    }
  }
  const secretKey = process.env.STRIPE_SECRET_KEY, webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  return secretKey && webhookSecret ? { secretKey, webhookSecret } : null;
}

export const stripeReady = async () => (await stripeKeys()) !== null;

export interface StripeStatus {
  connected: boolean;
  /** Where the keys come from. */
  source: "portal" | "environment" | null;
  mode: "live" | "test" | null;
  /** The last characters of the secret key, to recognise it without revealing it. */
  keyHint: string | null;
  account: string | null;
  savedBy: string | null;
  savedAt: string | null;
  /** The webhook the app registered in Stripe by itself, when it did. */
  webhookUrl: string | null;
  /** False when the server has no SETTINGS_SECRET, so pasted keys couldn't be stored safely. */
  canStore: boolean;
}

const modeOf = (secretKey: string): "live" | "test" => (/^(sk|rk)_live_/.test(secretKey) ? "live" : "test");
const hintOf = (secretKey: string) => `…${secretKey.slice(-4)}`;

/** For the admin page: is Stripe connected, from where, and which account. Never returns a key. */
export async function stripeStatus(): Promise<StripeStatus> {
  const none: StripeStatus = { connected: false, source: null, mode: null, keyHint: null, account: null, savedBy: null, savedAt: null, webhookUrl: null, canStore: secretsReady() };
  const stored = await storedStripe();
  if (stored && secretsReady()) {
    try {
      open(stored.secretKey); // proves the stored keys still open under this SETTINGS_SECRET
      return { ...none, connected: true, source: "portal", mode: stored.mode, keyHint: stored.keyHint, account: stored.account, savedBy: stored.savedBy, savedAt: stored.savedAt, webhookUrl: stored.webhookUrl ?? null };
    } catch { /* fall through to the environment */ }
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey && process.env.STRIPE_WEBHOOK_SECRET) return { ...none, connected: true, source: "environment", mode: modeOf(secretKey), keyHint: hintOf(secretKey) };
  return none;
}

/** Asks Stripe whose key this is. A wrong or revoked key is refused here, before anything is stored. */
export async function checkStripeKey(secretKey: string): Promise<{ ok: true; account: string } | { ok: false; reason: string }> {
  const res = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res) return { ok: false, reason: "Stripe could not be reached. Try again in a moment." };
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, reason: `Stripe refused the key: ${body?.error?.message ?? `status ${res.status}`}` };
  const name = body?.settings?.dashboard?.display_name || body?.business_profile?.name || body?.email || body?.id;
  return { ok: true, account: String(name ?? "your Stripe account") };
}

const STRIPE = "https://api.stripe.com/v1";
const WEBHOOK_EVENTS = ["checkout.session.completed"];

/**
 * Registers our webhook in Stripe with the secret key, so nobody has to do it by hand. Stripe reveals an
 * endpoint's signing secret only when it is created, so an earlier endpoint for the same URL is replaced.
 */
export async function registerWebhook(secretKey: string, url: string): Promise<{ ok: true; id: string; secret: string } | { ok: false; reason: string }> {
  const auth = { Authorization: `Bearer ${secretKey}` };
  const manual = "Or create it yourself in Stripe → Developers → Webhooks (event checkout.session.completed) and paste its signing secret here.";
  try {
    const existing = await fetch(`${STRIPE}/webhook_endpoints?limit=100`, { headers: auth, signal: AbortSignal.timeout(20_000) }).then((r) => r.json()).catch(() => null);
    for (const ep of (existing?.data ?? []) as Array<{ id: string; url: string }>) {
      if (ep.url === url) await fetch(`${STRIPE}/webhook_endpoints/${ep.id}`, { method: "DELETE", headers: auth, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    }
    const form = new URLSearchParams({ url, description: "AVOCO: credits bought through Checkout" });
    WEBHOOK_EVENTS.forEach((e, i) => form.set(`enabled_events[${i}]`, e));
    const res = await fetch(`${STRIPE}/webhook_endpoints`, { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: form, signal: AbortSignal.timeout(20_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || typeof body.secret !== "string" || typeof body.id !== "string") return { ok: false, reason: `Stripe would not register the webhook (${body?.error?.message ?? `status ${res.status}`}). ${manual}` };
    return { ok: true, id: body.id, secret: body.secret };
  } catch {
    return { ok: false, reason: `Stripe could not be reached to register the webhook. ${manual}` };
  }
}

/**
 * Stores the keys an admin pasted, after checking the secret key with Stripe. Without a webhook secret,
 * the webhook is registered in Stripe at `webhookUrl` and the secret Stripe returns is stored.
 */
export async function saveStripeKeys(input: { secretKey: string; webhookSecret?: string; webhookUrl?: string }, by: string): Promise<{ ok: true; account: string; registered: boolean } | { ok: false; reason: string }> {
  const secretKey = input.secretKey.trim();
  let webhookSecret = (input.webhookSecret ?? "").trim();
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{8,}$/.test(secretKey)) return { ok: false, reason: "The secret key should start with sk_live_ or sk_test_ (Stripe → Developers → API keys)." };
  if (webhookSecret && !/^whsec_[A-Za-z0-9]{8,}$/.test(webhookSecret)) return { ok: false, reason: "The webhook signing secret should start with whsec_ (Stripe → Developers → Webhooks → your endpoint). Leave it empty and the webhook is registered for you." };
  if (!secretsReady()) return { ok: false, reason: "The server has no SETTINGS_SECRET, so keys can't be stored safely. Ask your developer to set it." };
  const check = await checkStripeKey(secretKey);
  if (!check.ok) return check;

  let webhookId: string | undefined, webhookUrl: string | undefined;
  if (!webhookSecret) {
    if (!input.webhookUrl) return { ok: false, reason: "No webhook secret was given and the webhook URL is unknown." };
    const hook = await registerWebhook(secretKey, input.webhookUrl);
    if (!hook.ok) return hook;
    webhookSecret = hook.secret;
    webhookId = hook.id;
    webhookUrl = input.webhookUrl;
  }
  const value: StoredStripe = { secretKey: seal(secretKey), webhookSecret: seal(webhookSecret), account: check.account, mode: modeOf(secretKey), keyHint: hintOf(secretKey), savedBy: by, savedAt: new Date().toISOString(), webhookId, webhookUrl };
  await db().insert(settings).values({ key: "stripe", value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  return { ok: true, account: check.account, registered: Boolean(webhookId) };
}

/** Forgets the keys; a webhook the app registered itself is removed from Stripe too, best effort. */
export async function clearStripeKeys(): Promise<void> {
  const stored = await storedStripe();
  if (stored?.webhookId && secretsReady()) {
    try {
      await fetch(`${STRIPE}/webhook_endpoints/${stored.webhookId}`, { method: "DELETE", headers: { Authorization: `Bearer ${open(stored.secretKey)}` }, signal: AbortSignal.timeout(20_000) });
    } catch (err) {
      console.error("Could not remove the Stripe webhook", err);
    }
  }
  await db().delete(settings).where(eq(settings.key, "stripe"));
}

export interface CheckoutInput { purchaseId: string; name: string; amountCents: number; currency: string; successUrl: string; cancelUrl: string; email?: string }

/** Opens a Stripe Checkout session for one purchase and returns where to send the buyer. */
export async function createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const key = (await stripeKeys())?.secretKey;
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

/** One Checkout session as Stripe sees it now: whether it was paid, for how much, and which purchase it carries. */
export async function retrieveCheckout(sessionId: string): Promise<{ paid: boolean; amountCents: number; currency: string; purchaseId: string | null } | null> {
  const key = (await stripeKeys())?.secretKey;
  if (!key || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return null;
  const res = await fetch(`${STRIPE}/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return { paid: body.payment_status === "paid", amountCents: Number(body.amount_total) || 0, currency: String(body.currency ?? "usd"), purchaseId: body.metadata?.purchase_id ?? body.client_reference_id ?? null };
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
