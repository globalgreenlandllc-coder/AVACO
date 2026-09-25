/**
 * The partner page: a no-account, no-charge way to record and read a report, served only on its own
 * free Vercel host so it never appears on the main domain. Analyses are filed in the gateway under one
 * shared owner, and a daily cap keeps an open page from running up AVOCO usage.
 */
import "server-only";
import { headers } from "next/headers";
import { gateway, type Analysis } from "./gateway";
import { LimitReached } from "./workspaces";

export const PARTNER_OWNER = "partners";
export const partnerHost = () => process.env.PARTNER_HOST || "avoco-partners.vercel.app";
export const dailyLimit = () => Number(process.env.PARTNER_DAILY_LIMIT) || 100;

/** True on the partner host (and in local development, where there is only one host). */
export async function isPartnerHost(): Promise<boolean> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  return host === partnerHost() || host.startsWith("localhost");
}

/** Recordings made on the partner page since midnight UTC. */
export async function usageToday(): Promise<number> {
  const dayStart = new Date().toISOString().slice(0, 10);
  const all = await gateway.listAllFor(PARTNER_OWNER);
  return all.filter((a) => a.created_at.slice(0, 10) === dayStart).length;
}

export async function startPartnerAnalysis(input: { audioUrl: unknown; consent: unknown }): Promise<string> {
  if (input.consent !== true) throw new PartnerInvalid("Consent is required");
  if (typeof input.audioUrl !== "string" || !/^https:\/\//.test(input.audioUrl)) throw new PartnerInvalid("A recording is required");
  if ((await usageToday()) >= dailyLimit()) throw new LimitReached("The partner page has reached today's limit");
  const { id } = await gateway.createAnalysis({ audioUrl: input.audioUrl, owner: PARTNER_OWNER });
  return id;
}

/** A partner-page analysis by id, or null: an id from anywhere else is never shown here. */
export async function partnerAnalysis(id: string): Promise<Analysis | null> {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return null;
  const analysis = await gateway.getAnalysis(id);
  return analysis?.external_user_id === PARTNER_OWNER ? analysis : null;
}

export class PartnerInvalid extends Error {}
