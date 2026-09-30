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
import { matchCredits, matchPriceCents, saveMatchPricing } from "@/lib/match-billing";
import { industryPriceCents, saveIndustryPrice } from "@/lib/industry-billing";
import { bestCredits, bestPriceCents, saveBestPricing } from "@/lib/best-billing";
import { PACK_NAMES } from "@/lib/pack-names";
import { readPricingForm, type PricingCurrent } from "@/lib/pricing-form";
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

export interface PricingState {
  ok: boolean | null;
  message: string;
  /** Per box, why it couldn't be read; nothing is saved while there are any. */
  errors: Record<string, string>;
  /** What was typed, so a form with an error comes back as the admin left it rather than reset. */
  fields: Record<string, string>;
  /** Bumped on every answer, so the boxes are drawn again from what is now saved. */
  attempt: number;
}

/**
 * Saves the pricing form, all of it or nothing. Prices are read the way people type them (lib/pricing-form.ts); a box
 * that can't be read comes back as an error naming it, never as the old price saved quietly in its place.
 */
export async function saveSettingsAction(prev: PricingState, form: FormData): Promise<PricingState> {
  await requireAdmin();
  const [cfg, industryCents, bestCents, bestN, matchCents, matchN] = await Promise.all([getSettings(), industryPriceCents(), bestPriceCents(), bestCredits(), matchPriceCents(), matchCredits()]);
  const current: PricingCurrent = {
    enabled: cfg.enabled, firstFree: cfg.freeFirstReport, currency: cfg.currency, packs: cfg.packs, freePreviews: cfg.freePreviewsPer30Days, trialCredits: cfg.workspaceTrialCredits,
    industryCents, bestCents, bestCredits: bestN, matchCents, matchCredits: matchN,
  };
  const read = readPricingForm(form, current, PACK_NAMES);
  const attempt = prev.attempt + 1;
  if (!read.ok) {
    const fields: Record<string, string> = {};
    for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) fields[k] = v;
    const n = Object.keys(read.errors).length;
    return { ok: false, message: `Nothing was saved: ${n === 1 ? "one box needs" : `${n} boxes need`} fixing.`, errors: read.errors, fields, attempt };
  }
  const v = read.values;
  await saveSettings({ enabled: v.enabled, freeFirstReport: v.firstFree, currency: v.currency, packs: v.packs, freePreviewsPer30Days: v.freePreviews, workspaceTrialCredits: v.trialCredits });
  await saveIndustryPrice(v.industryCents);
  await saveMatchPricing({ priceCents: v.matchCents, credits: v.matchCredits });
  await saveBestPricing({ priceCents: v.bestCents, credits: v.bestCredits });
  revalidatePath("/admin", "layout");
  const single = v.packs.find((p) => p.audience === "user" && p.credits === 1);
  const money = (cents: number) => `${(cents / 100).toFixed(2)} ${v.currency.toUpperCase()}`;
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return {
    ok: true,
    message: `Saved at ${time} UTC and live now. Personality Analysis ${single ? money(single.amountCents) : "—"} · Career Fit ${money(v.industryCents)} · Best-Fit Industry ${money(v.bestCents)} or ${v.bestCredits} credit${v.bestCredits === 1 ? "" : "s"} · Relationship ${money(v.matchCents)} or ${v.matchCredits} credit${v.matchCredits === 1 ? "" : "s"} · charging ${v.enabled ? "on" : "off"}.`,
    errors: {}, fields: {}, attempt,
  };
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
