import "server-only";
import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { visitorId } from "./visitor";
import { notFound } from "next/navigation";
import { isPreset, type PresetKey } from "./presets";
import { Forbidden, NotFound } from "./workspaces";

export async function currentUserId(): Promise<string> {
  const userId = await visitorId();
  if (!userId) notFound();
  return userId;
}

/** Runs a membership-checked read; "no access" and "doesn't exist" both become a 404 page. */
export async function orNotFound<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (err) {
    if (err instanceof Forbidden || err instanceof NotFound) notFound();
    throw err;
  }
}

/** Absolute links (invitations, QR codes) follow the host the visitor is actually on. */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

export const presetOf = (industry: string): PresetKey => (isPreset(industry) ? industry : "general");

/** Names (or emails) for Clerk user ids, for the members list. Falls back to nothing if Clerk can't be reached. */
export async function userLabels(ids: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (ids.length === 0) return labels;
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const { data } = await (await clerkClient()).users.getUserList({ userId: ids, limit: 100 });
    for (const u of data) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
      const email = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses[0]?.emailAddress;
      labels.set(u.id, name && email ? `${name} · ${email}` : name || email || u.id);
    }
  } catch (err) {
    console.error("Could not load member names", err);
  }
  return labels;
}
