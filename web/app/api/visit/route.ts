/**
 * One page view from the visit beacon (components/VisitBeacon.tsx): the numbers behind Admin → Statistics. It keeps
 * what the statistics need and nothing more (no address, no browser description), and leaves admins' own views out
 * so the numbers stay honest. It never fails a page: whatever happens, the answer is an empty 204.
 */
import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser } from "@/lib/admin";
import { CONSENT_COOKIE, OPT_IN_COUNTRIES, parseConsent } from "@/lib/consent";
import { db, visits } from "@/lib/db";
import { partnerHosts } from "@/lib/partners";
import { excludeVisitor, isExcludedVisitor } from "@/lib/visit-exclusions";
import { openHosts, visitorId } from "@/lib/visitor";
import { CLICK_IDS, deviceOf, normalizePath, referrerPage, sourceOf, type Site } from "@/lib/visits-math";

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
    // Served by Vercel or not at all: a development server (every page view of a local test run) never counts.
    if (!req.headers.get("x-vercel-id") && !process.env.RECORD_LOCAL_VISITS) return done(null);
    // No counting without analytics consent: refused, or not yet given where the law asks first.
    const saved = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value);
    if (saved ? !saved.analytics : OPT_IN_COUNTRIES.has(req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "")) return done(null);
    // Visit statistics are kept for 26 months (privacy policy): now and then, the older ones go.
    if (Math.random() < 0.01) void db().delete(visits).where(sql`${visits.at} < now() - interval '26 months'`).catch(() => undefined);
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
    const click = typeof body.click === "string" && Object.hasOwn(CLICK_IDS, body.click) ? body.click : null;
    const session = typeof body.session === "string" && /^[A-Za-z0-9-]{4,64}$/.test(body.session) ? body.session : visitor;
    await db().insert(visits).values({
      id: crypto.randomUUID(),
      site, path, visitor, session, userId: account,
      landing: body.landing === true,
      source: sourceOf(str(body.utmSource), str(body.referrer), ownHosts, { click, userAgent: req.headers.get("user-agent") }),
      campaign: str(body.utmCampaign)?.slice(0, 60) ?? null,
      // An ad's click id without a utm_medium still marks the visit as paid (fbclid excepted: every Meta link carries it).
      medium: str(body.utmMedium)?.slice(0, 40) ?? (click && CLICK_IDS[click]?.paid ? "paid" : null),
      click,
      content: str(body.utmContent)?.slice(0, 60) ?? null,
      referrer: referrerPage(str(body.referrer), ownHosts),
      country: req.headers.get("x-vercel-ip-country")?.slice(0, 2).toUpperCase() ?? null,
      city: town(req.headers.get("x-vercel-ip-city")),
      region: req.headers.get("x-vercel-ip-country-region")?.trim().toUpperCase().slice(0, 3) || null,
      lat: degree(req.headers.get("x-vercel-ip-latitude"), 90),
      lon: degree(req.headers.get("x-vercel-ip-longitude"), 180),
      device: deviceOf(req.headers.get("user-agent"), typeof body.width === "number" ? body.width : null),
      locale: str(body.locale)?.slice(0, 8) ?? null,
    });
  } catch (err) {
    console.error("Visit not recorded", err);
  }
  return done(fresh);
}

/** The edge's town name (URL-encoded by Vercel), when it has one. */
function town(raw: string | null): string | null {
  if (!raw) return null;
  try { return decodeURIComponent(raw).slice(0, 60) || null; } catch { return null; }
}

/** A position rounded to whole degrees (about 100 km): enough for a dot on a world map, never an address. */
function degree(raw: string | null, limit: number): number | null {
  const v = Number(raw);
  return raw && Number.isFinite(v) && Math.abs(v) <= limit ? Math.round(v) : null;
}
