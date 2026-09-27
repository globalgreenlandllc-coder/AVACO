/**
 * The receipt email sent after every card payment, to the email the buyer signed in with. It goes out once per
 * purchase: completePurchase (lib/billing.ts) asks for it only when its ledger row was new, so the webhook and the
 * buyer's return page, which both complete the same payment, never send two. Nothing is sent while no mailbox is
 * connected (lib/email.ts), and a failed send never undoes or delays the purchase itself.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, gifts, matches, purchases } from "./db";
import { emailConfig, isEmailAddress, sendEmail } from "./email";
import { dictFor, getLocale } from "./i18n";
import { industryNames } from "./industry-chapter";
import { INDUSTRY_PACK } from "./industry-billing";
import { LEGAL } from "./legal";
import { receiptNumber, renderReceipt, type ReceiptData, type ReceiptItem } from "./receipt-mail";
import { paymentDetails } from "./stripe";

const SITE_URL = `https://www.${LEGAL.site}`;

/**
 * The primary email of a Clerk user, when it is verified: the address they sign in with. Asked of Clerk's REST API
 * with the secret key, because the receipt is written after the response, where Clerk's own client (which reads the
 * request) is not allowed.
 */
export async function signInEmail(userId: string): Promise<string | null> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!userId.startsWith("user_") || !key) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const user = await res.json() as { primary_email_address_id: string | null; email_addresses: Array<{ id: string; email_address: string; verification: { status: string } | null }> };
    const primary = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
    return primary?.verification?.status === "verified" ? primary.email_address : null;
  } catch (err) {
    console.error("Could not look up the buyer's email", err);
    return null;
  }
}

/**
 * What a Checkout page is opened with, so the receipt later knows where and how to write: the signed-in person's
 * email (Checkout shows it filled in, so Stripe and AVOCO use the same address) and the language they are reading.
 */
export async function checkoutContact(userId: string): Promise<{ email: string | null; lang: string }> {
  const [email, lang] = await Promise.all([signInEmail(userId), getLocale().catch(() => "en")]);
  return { email, lang };
}

type Purchase = typeof purchases.$inferSelect;

/** What was bought, and the page that shows it. */
async function itemOf(p: Purchase, locale: string, origin: string): Promise<{ item: ReceiptItem; next: ReceiptData["next"] }> {
  if (p.giftId) {
    const [g] = await db().select().from(gifts).where(eq(gifts.id, p.giftId));
    return {
      item: { kind: "gift", name: g?.recipientName ?? null, reports: g?.reports ?? 0, industries: g?.industries ?? 0, matches: g?.matches ?? 0 },
      next: { kind: "gift", url: `${origin}/gift/${p.giftId}` },
    };
  }
  if (p.matchId) {
    const [m] = await db().select().from(matches).where(eq(matches.id, p.matchId));
    return { item: { kind: "match", a: m?.ownerName ?? "", b: m?.partnerName ?? "" }, next: { kind: "match", url: `${origin}/match/${p.matchId}` } };
  }
  if (p.pack === INDUSTRY_PACK && p.unlockIndustry && p.unlockAnalysisId) {
    const name = industryNames(await dictFor(locale)).find((i) => i.key === p.unlockIndustry)?.name ?? p.unlockIndustry;
    return { item: { kind: "industry", industry: name }, next: { kind: "industry", url: `${origin}/reports/${p.unlockAnalysisId}?industry=${p.unlockIndustry}` } };
  }
  if (p.ownerKind === "workspace") return { item: { kind: "company", n: p.credits }, next: { kind: "company", url: `${origin}/w/${p.ownerId}` } };
  if (p.unlockAnalysisId) {
    return { item: p.credits === 1 ? { kind: "report" } : { kind: "credits", n: p.credits }, next: { kind: "report", url: `${origin}/reports/${p.unlockAnalysisId}` } };
  }
  return { item: { kind: "credits", n: p.credits }, next: { kind: "credits", url: `${origin}/credits` } };
}

const originOf = (url: string | null) => {
  try { return url ? new URL(url).origin : SITE_URL; } catch { return SITE_URL; }
};

/** Builds and sends the receipt for one paid purchase. Returns where it went, or why it didn't. */
export async function sendReceipt(purchaseId: string): Promise<{ sent: true; to: string } | { sent: false; reason: string }> {
  if (!(await emailConfig())) return { sent: false, reason: "no mailbox connected" };
  const [p] = await db().select().from(purchases).where(eq(purchases.id, purchaseId));
  if (!p || p.status !== "paid") return { sent: false, reason: "purchase not paid" };

  const stripe = p.stripeSessionId ? await paymentDetails(p.stripeSessionId).catch(() => null) : null;
  // The sign-in email first, as asked; the email Checkout collected when the buyer has none (a company purchase).
  const personal = p.ownerKind === "user" ? await signInEmail(p.ownerId) : null;
  const to = [personal, stripe?.email].find(isEmailAddress);
  if (!to) return { sent: false, reason: "no email for the buyer" };

  const locale = stripe?.lang || "en";
  const t = (await dictFor(locale)).receipt;
  const origin = originOf(stripe?.successUrl ?? null);
  const { item, next } = await itemOf(p, locale, origin);
  const mail = renderReceipt({
    // What the card was actually charged, as Stripe reports it; the price we asked for when Stripe can't be reached.
    number: receiptNumber(p.id), paidAt: p.paidAt ?? new Date(), to, amountCents: stripe?.amountCents ?? p.amountCents, currency: stripe?.currency ?? p.currency, item, next,
    card: stripe?.card ?? null, stripeUrl: stripe?.receiptUrl ?? null,
    site: new URL(origin).host.replace(/^www\./, ""), supportEmail: LEGAL.support, operator: LEGAL.operator, address: LEGAL.address,
  }, t, locale);
  await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: LEGAL.support });
  return { sent: true, to };
}

/**
 * Sends the receipt once the response is on its way (the webhook answers Stripe at once, the buyer's page isn't
 * held up), or straight away where there is no response to wait for (a script). Never throws.
 */
export function sendReceiptLater(purchaseId: string): void {
  const work = async () => {
    try {
      const result = await sendReceipt(purchaseId);
      if (result.sent) console.info(`Receipt for purchase ${purchaseId} sent to ${result.to}`);
      else if (result.reason !== "no mailbox connected") console.warn(`No receipt for purchase ${purchaseId}: ${result.reason}`);
    } catch (err) {
      console.error(`The receipt for purchase ${purchaseId} could not be sent`, err);
    }
  };
  try {
    after(work);
  } catch {
    void work();
  }
}

/** For the admin portal: a sample receipt to the admin's own address, exactly as a buyer of one report gets it. */
export async function sendSampleReceipt(to: string, locale: string, price: { amountCents: number; currency: string }): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!(await emailConfig())) return { ok: false, reason: "Connect a mailbox first." };
  const t = (await dictFor(locale)).receipt;
  const mail = renderReceipt({
    number: receiptNumber(crypto.randomUUID()), paidAt: new Date(), to, amountCents: price.amountCents, currency: price.currency, item: { kind: "report" },
    next: { kind: "report", url: `${SITE_URL}/sample` }, card: { brand: "visa", last4: "4242", wallet: null }, stripeUrl: null,
    site: LEGAL.site, supportEmail: LEGAL.support, operator: LEGAL.operator, address: LEGAL.address,
  }, t, locale);
  try {
    await sendEmail({ to, subject: `[Sample] ${mail.subject}`, html: mail.html, text: mail.text, replyTo: LEGAL.support });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `The mail server refused it: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}
