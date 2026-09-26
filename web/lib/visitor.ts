/**
 * Who is looking at the site. Normally the signed-in Clerk user. On the "open" hosts (a free Vercel URL kept
 * for comparing the original site without accounts or payments) there is no sign-in at all: the visitor is an
 * anonymous id in a cookie that proxy.ts sets, and their reports are filed under "open:<id>". Everything that
 * costs money is free there. Server only.
 */
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

export const DEFAULT_OPEN_HOSTS = ["avaco-web.vercel.app"];
export const OPEN_COOKIE = "avoco_visitor";
export const openHosts = () => (process.env.OPEN_HOSTS ?? DEFAULT_OPEN_HOSTS.join(",")).split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

/** An owner id made on an open host, as opposed to a Clerk user id. */
export const isOpenVisitor = (id: string) => id.startsWith("open:");

export async function isOpenHost(): Promise<boolean> {
  const h = await headers();
  return openHosts().includes((h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase());
}

/** The current person's id: the Clerk user, or on an open host the cookie visitor. Null when there is neither. */
export async function visitorId(): Promise<string | null> {
  if (await isOpenHost()) {
    const v = (await cookies()).get(OPEN_COOKIE)?.value;
    return v && /^[a-f0-9-]{36}$/.test(v) ? `open:${v}` : null;
  }
  return (await auth()).userId;
}
