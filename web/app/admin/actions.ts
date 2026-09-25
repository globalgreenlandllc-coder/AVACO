"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { asUser, asWorkspace, getSettings, grant, saveSettings, type Pack } from "@/lib/billing";
import { admins, db, promoCodes } from "@/lib/db";
import { clearStripeKeys, saveStripeKeys } from "@/lib/stripe";

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
  const packs: Pack[] = current.packs.map((p) => ({ ...p, credits: Number(form.get(`credits:${p.id}`)) || p.credits, amountCents: Math.round(Number(form.get(`price:${p.id}`)) * 100) || p.amountCents }));
  await saveSettings({
    enabled: form.get("enabled") === "on",
    currency: String(form.get("currency") ?? current.currency).toLowerCase(),
    packs,
    freePreviewsPer30Days: Number(form.get("freePreviews")),
    workspaceTrialCredits: Number(form.get("trialCredits")),
  });
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
  const result = await saveStripeKeys({ secretKey: String(form.get("secretKey") ?? ""), webhookSecret: String(form.get("webhookSecret") ?? "") }, admin.email);
  revalidatePath("/admin", "layout");
  return result.ok ? { ok: true, message: `Connected to ${result.account}.` } : { ok: false, message: result.reason };
}

export async function disconnectStripeAction() {
  await requireAdmin();
  await clearStripeKeys();
  revalidatePath("/admin", "layout");
}
