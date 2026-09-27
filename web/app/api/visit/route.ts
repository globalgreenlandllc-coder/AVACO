/**
 * One page view from the visit beacon (components/VisitBeacon.tsx): the numbers behind Admin → Statistics. It keeps
 * what the statistics need and nothing more (no address, no browser description), and leaves admins' own views out
 * so the numbers stay honest. It never fails a page: whatever happens, the answer is an empty 204.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { db, visits } from "@/lib/db";
import { partnerHosts } from "@/lib/partners";
import { excludeVisitor, isExcludedVisitor } from "@/lib/visit-exclusions";
import { openHosts, visitorId } from "@/lib/visitor";
import { deviceOf, normalizePath, referrerPage, sourceOf, type Site } from "@/lib/visits-math";

const VID = "avoco_vid";
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const done = (setVid: string | null) => {
  const res = new NextResponse(null, { status: 204 });
  if (setVid) res.cookies.set(VID, setVid, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 400 });
  return res;
};

export async function POST(req: NextRequest) {
  let fresh: string | null = null;
  try {
    const text = await req.text();
    if (text.length > 2000) return done(null);
    const body = JSON.parse(text) as Record<string, unknown>;
    const path = typeof body.path === "string" ? normalizePath(body.path) : null;
    if (!path || path.startsWith("/admin") || path.startsWith("/api")) return done(null);
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
    const site: Site = partnerHosts().includes(host) ? "partner" : openHosts().includes(host) ? "open" : "main";
    const who = await visitorId().catch(() => null);
    const account = who?.startsWith("user_") ? who : null;
    let visitor = req.cookies.get(VID)?.value ?? "";
    if (!/^[a-f0-9-]{36}$/.test(visitor)) { visitor = crypto.randomUUID(); fresh = visitor; }
    // An admin's browser: noted once, its past views removed, and nothing more counted from it, signed in or not.
    if (account && (await isAdminUser(account))) { await excludeVisitor(visitor, account); return done(fresh); }
    if (await isExcludedVisitor(visitor)) return done(fresh);
    const ownHosts = [host, ...partnerHosts(), ...openHosts()];
    const session = typeof body.session === "string" && /^[A-Za-z0-9-]{4,64}$/.test(body.session) ? body.session : visitor;
    await db().insert(visits).values({
      id: crypto.randomUUID(),
      site, path, visitor, session, userId: account,
      landing: body.landing === true,
      source: sourceOf(str(body.utmSource), str(body.referrer), ownHosts),
      campaign: str(body.utmCampaign)?.slice(0, 60) ?? null,
      medium: str(body.utmMedium)?.slice(0, 40) ?? null,
      content: str(body.utmContent)?.slice(0, 60) ?? null,
      referrer: referrerPage(str(body.referrer), ownHosts),
      country: req.headers.get("x-vercel-ip-country")?.slice(0, 2).toUpperCase() ?? null,
      device: deviceOf(req.headers.get("user-agent"), typeof body.width === "number" ? body.width : null),
      locale: str(body.locale)?.slice(0, 8) ?? null,
    });
  } catch (err) {
    console.error("Visit not recorded", err);
  }
  return done(fresh);
}
