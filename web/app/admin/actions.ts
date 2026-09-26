"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { asUser, asWorkspace, getSettings, grant, saveSettings, type Pack } from "@/lib/billing";
import { admins, db, promoCodes } from "@/lib/db";
import { baseUrl } from "@/lib/page";
import { clearStripeKeys, saveStripeKeys } from "@/lib/stripe";
import { clearEmailSettings, saveEmailSettings } from "@/lib/email";
import { getLocale } from "@/lib/i18n";
import { sendSampleReceipt } from "@/lib/receipts";
import { saveMatchPricing } from "@/lib/match-billing";
import { saveIndustryPrice } from "@/lib/industry-billing";
import { buildLanguage, clearDeeplKey, removeLanguage, saveDeeplKey, type LanguageProgress } from "@/lib/translate";
import { TRANSLATABLE } from "@/lib/i18n/languages";

export async function grantAction(form: FormData) {
  const admin = await requireAdmin();
  const kind = form.get("kind") === "workspace" ? "workspace" : "user";
  const id = String(form.get("id") ?? "").trim();
  const credits = Number(form.get("credits"));
  if (!id) return;
  await grant(kind === "workspace" ? asWorkspace(id) : asUser(id), credits, admin.email, String(form.get("note") ?? "") || undefined);
  revalidatePath("/admin", "layout");
}

export async function saveSettingsAction(form: FormData) {
  await requireAdmin();
  const current = await getSettings();
  let packs: Pack[] = current.packs.map((p) => ({ ...p, credits: Number(form.get(`credits:${p.id}`)) || p.credits, amountCents: Math.round(Number(form.get(`price:${p.id}`)) * 100) || p.amountCents }));
  // "Personality type report, per report" is the one-credit pack for people: a changed value there wins over the table.
  const single = current.packs.find((p) => p.audience === "user" && p.credits === 1);
  const typeCents = Math.round(Number(form.get("typePrice")) * 100);
  if (single && typeCents >= 50 && typeCents !== single.amountCents) packs = packs.map((p) => (p.id === single.id ? { ...p, amountCents: typeCents } : p));
  await saveSettings({
    enabled: form.get("enabled") === "on",
    currency: String(form.get("currency") ?? current.currency).toLowerCase(),
    packs,
    freePreviewsPer30Days: Number(form.get("freePreviews")),
    workspaceTrialCredits: Number(form.get("trialCredits")),
  });
  const addon = Number(form.get("industryPrice"));
  if (addon > 0) await saveIndustryPrice(Math.round(addon * 100));
  const matchPrice = Number(form.get("matchPrice")), matchN = Number(form.get("matchCredits"));
  await saveMatchPricing({ priceCents: matchPrice > 0 ? Math.round(matchPrice * 100) : undefined, credits: matchN >= 1 ? matchN : undefined });
  revalidatePath("/admin", "layout");
}

export async function createPromoAction(form: FormData) {
  await requireAdmin();
  const code = String(form.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const credits = Math.trunc(Number(form.get("credits")));
  if (!code || !(credits > 0)) return;
  const maxUses = Math.trunc(Number(form.get("maxUses"))) || null;
  const days = Math.trunc(Number(form.get("days")));
  await db().insert(promoCodes).values({ code, credits, maxUses, expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null, note: String(form.get("note") ?? "").slice(0, 200) || null }).onConflictDoNothing();
  revalidatePath("/admin/settings");
}

export async function togglePromoAction(form: FormData) {
  await requireAdmin();
  await db().update(promoCodes).set({ active: form.get("active") === "1" }).where(eq(promoCodes.code, String(form.get("code"))));
  revalidatePath("/admin/settings");
}

export async function addAdminAction(form: FormData) {
  const admin = await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) await db().insert(admins).values({ email, addedBy: admin.email }).onConflictDoNothing();
  revalidatePath("/admin/settings");
}

export async function removeAdminAction(form: FormData) {
  const admin = await requireAdmin();
  const email = String(form.get("email") ?? "");
  if (email !== admin.email) await db().delete(admins).where(eq(admins.email, email)); // you can't remove yourself by accident
  revalidatePath("/admin/settings");
}

export interface StripeActionState { ok: boolean | null; message: string }

/** Connects Stripe from the portal: checks the key with Stripe, stores both secrets sealed. */
export async function connectStripeAction(_prev: StripeActionState, form: FormData): Promise<StripeActionState> {
  const admin = await requireAdmin();
  const result = await saveStripeKeys({ secretKey: String(form.get("secretKey") ?? ""), webhookSecret: String(form.get("webhookSecret") ?? ""), webhookUrl: `${await baseUrl()}/api/stripe/webhook` }, admin.email);
  revalidatePath("/admin", "layout");
  return result.ok ? { ok: true, message: `Connected to ${result.account}.${result.registered ? " The webhook was registered in Stripe for you." : ""}` } : { ok: false, message: result.reason };
}

export async function disconnectStripeAction() {
  await requireAdmin();
  await clearStripeKeys();
  revalidatePath("/admin", "layout");
}

/** Connects the mailbox receipts are sent from: logs in to Google's mail server with it, then stores the password sealed. */
export async function connectEmailAction(_prev: StripeActionState, form: FormData): Promise<StripeActionState> {
  const admin = await requireAdmin();
  const result = await saveEmailSettings({ user: String(form.get("user") ?? ""), pass: String(form.get("pass") ?? ""), fromName: String(form.get("fromName") ?? "") }, admin.email);
  revalidatePath("/admin", "layout");
  return result.ok ? { ok: true, message: `Connected. Receipts are sent from ${result.from}.` } : { ok: false, message: result.reason };
}

export async function disconnectEmailAction() {
  await requireAdmin();
  await clearEmailSettings();
  revalidatePath("/admin", "layout");
}

/** Sends the admin a sample receipt for one personality type report, at today's price, in the language they are reading. */
export async function sampleReceiptAction(_prev: StripeActionState): Promise<StripeActionState> {
  const admin = await requireAdmin();
  const cfg = await getSettings();
  const single = cfg.packs.find((p) => p.audience === "user" && p.credits === 1);
  const result = await sendSampleReceipt(admin.email, await getLocale(), { amountCents: single?.amountCents ?? 900, currency: cfg.currency });
  return result.ok ? { ok: true, message: `Sent to ${admin.email}. Check the inbox (and the spam folder the first time).` } : { ok: false, message: result.reason };
}

export async function connectDeeplAction(_prev: StripeActionState, form: FormData): Promise<StripeActionState> {
  const admin = await requireAdmin();
  const result = await saveDeeplKey(String(form.get("key") ?? ""), admin.email);
  revalidatePath("/admin", "layout");
  return result.ok ? { ok: true, message: `Connected. ${result.usage.used.toLocaleString("en-US")} of ${result.usage.limit.toLocaleString("en-US")} characters used this period.` } : { ok: false, message: result.reason };
}

export async function disconnectDeeplAction() {
  await requireAdmin();
  await clearDeeplKey();
  revalidatePath("/admin", "layout");
}

/** One step of building a language: translates the next batch of strings. The portal calls it until done. */
export async function buildLanguageAction(lang: string): Promise<LanguageProgress & { error?: string }> {
  const admin = await requireAdmin();
  if (!TRANSLATABLE.some((l) => l.code === lang)) return { total: 0, done: 0, error: "Unknown language" };
  try {
    return await buildLanguage(lang, admin.email);
  } catch (err) {
    return { total: 0, done: 0, error: err instanceof Error ? err.message : "Translation failed" };
  }
}

export async function removeLanguageAction(form: FormData) {
  await requireAdmin();
  const lang = String(form.get("lang") ?? "");
  if (TRANSLATABLE.some((l) => l.code === lang)) await removeLanguage(lang);
  revalidatePath("/admin", "layout");
}
