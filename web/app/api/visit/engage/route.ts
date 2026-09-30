/**
 * The beacon's follow-ups for a page already counted (lib/visit-engagement.ts): seconds on screen, how far it was
 * scrolled, a button or link tapped. The same rules as the page view itself: served by Vercel, analytics allowed, and
 * never a failure: the answer is always an empty 204.
 */
import type { NextRequest } from "next/server";
import { CONSENT_COOKIE, OPT_IN_COUNTRIES, parseConsent } from "@/lib/consent";
import { bounded, cleanTap, recordEngagement } from "@/lib/visit-engagement";
import { normalizePath } from "@/lib/visits-math";

const empty = () => new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("x-vercel-id") && !process.env.RECORD_LOCAL_VISITS) return empty();
    const saved = parseConsent(req.cookies.get(CONSENT_COOKIE)?.value);
    if (saved ? !saved.analytics : OPT_IN_COUNTRIES.has(req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "")) return empty();
    // Only a browser the page view already knows: the follow-up belongs to that view and never starts a new one.
    const visitor = req.cookies.get("avoco_vid")?.value ?? "";
    if (!/^[a-f0-9-]{36}$/.test(visitor)) return empty();
    const text = await req.text();
    if (text.length > 1000) return empty();
    const body = JSON.parse(text) as Record<string, unknown>;
    const session = typeof body.session === "string" && /^[A-Za-z0-9-]{4,64}$/.test(body.session) ? body.session : null;
    const path = typeof body.path === "string" ? normalizePath(body.path) : null;
    if (!session || !path) return empty();
    await recordEngagement({ visitor, session, path, seen: bounded(body.seen, 3600), scroll: bounded(body.scroll, 100), tap: cleanTap(body.tap) });
  } catch (err) {
    console.error("Engagement not recorded", err);
  }
  return empty();
}
