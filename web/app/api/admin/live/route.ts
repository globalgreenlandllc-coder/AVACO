/**
 * GET — the live traffic view (components/LiveTraffic.tsx): the last hour of visits, summarised, each visitor with their
 * story. `?span=` (minutes, 60 to 43200 = 30 days) widens the visitors for the map; the live numbers stay on the last hour.
 * Admins only.
 */
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { isAdminUser } from "@/lib/admin";
import { creditLedger, db, reportAccess, visits } from "@/lib/db";
import { userLabels } from "@/lib/page";
import { liveSummary, type LiveRow } from "@/lib/visits-math";

export const dynamic = "force-dynamic";

/** The spans the map offers, in minutes: an hour up to a month. */
const SPANS = new Set([60, 120, 240, 360, 1440, 4320, 10080, 43200]);
/** The most visitors the map draws; the newest are kept and the total is said. */
const MAX_ON_MAP = 3000;

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) return Response.json({ error: "not_found" }, { status: 404 });
  const asked = Number(new URL(req.url).searchParams.get("span"));
  const spanMin = SPANS.has(asked) ? asked : 60;
  const since = Date.now() - Math.max(61, spanMin + 1) * 60_000;
  const d = db();
  const rows = await d.select({
    at: visits.at, path: visits.path, visitor: visits.visitor, session: visits.session, landing: visits.landing, source: visits.source, device: visits.device,
    userId: visits.userId, medium: visits.medium, click: visits.click, campaign: visits.campaign, content: visits.content, referrer: visits.referrer, locale: visits.locale,
    country: visits.country, city: visits.city, region: visits.region, lat: visits.lat, lon: visits.lon,
  }).from(visits).where(gte(visits.at, new Date(since))).orderBy(desc(visits.at)).limit(spanMin > 60 ? 100_000 : 5000);
  // The visitors the map will show: the most recent ones of the span (rows come newest first), as liveSummary picks them.
  const spanStart = Date.now() - spanMin * 60_000;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) if (r.at.getTime() > spanStart && !seen.has(r.visitor)) { seen.add(r.visitor); if (ids.length < MAX_ON_MAP) ids.push(r.visitor); }
  // Each visitor's month: when this browser first came, and how many visits it made.
  const history = ids.length
    ? await d.select({ visitor: visits.visitor, first: sql<string>`min(${visits.at})`, sessions: sql<number>`count(distinct ${visits.session})::int`, userId: sql<string | null>`max(${visits.userId})` })
      .from(visits).where(and(inArray(visits.visitor, ids), gte(visits.at, new Date(Date.now() - 30 * 86_400_000)))).groupBy(visits.visitor)
    : [];
  const live = liveSummary(rows as LiveRow[], new Date(), new Map(history.map((h) => [h.visitor, { first: new Date(h.first), sessions: Number(h.sessions), userId: h.userId }])), { spanMin, maxVisitors: MAX_ON_MAP });
  // Green pins: a purchase made within the span (a report, a pack, an add-on). Older buyers stay blue, marked as customers.
  const accounts = [...new Set(live.visitors.map((v) => v.userId).filter((u): u is string => Boolean(u)))];
  const purchases = accounts.length
    ? await d.select({ id: creditLedger.ownerId, last: sql<string>`max(${creditLedger.createdAt})` }).from(creditLedger)
      .where(and(eq(creditLedger.ownerKind, "user"), eq(creditLedger.reason, "purchase"), inArray(creditLedger.ownerId, accounts))).groupBy(creditLedger.ownerId)
    : [];
  const lastPurchase = new Map(purchases.map((p) => [p.id, new Date(p.last).getTime()]));
  // Violet pins: the free first report opened within the span.
  const frees = accounts.length
    ? await d.select({ id: reportAccess.ownerId, at: sql<string>`max(${reportAccess.unlockedAt})` }).from(reportAccess)
      .where(and(eq(reportAccess.ownerKind, "user"), eq(reportAccess.source, "welcome"), inArray(reportAccess.ownerId, accounts))).groupBy(reportAccess.ownerId)
    : [];
  const freeAt = new Map(frees.map((f) => [f.id, new Date(f.at).getTime()]));
  const hourAgo = spanStart; // "within the span": the last hour unless a longer one was asked for
  live.visitors = live.visitors.map((v) => {
    const last = v.userId ? lastPurchase.get(v.userId) : undefined;
    const free = v.userId ? freeAt.get(v.userId) : undefined;
    const status = last && last >= hourAgo ? "paid" : free && free >= hourAgo ? "free" : v.status;
    return { ...v, status, paidAt: last && last >= hourAgo ? last : null, customer: Boolean(last), freeAt: free && free >= hourAgo ? free : null, hadFree: Boolean(free) };
  });
  // Signed-in visitors by name, for the admin's eyes only.
  const labels = await userLabels([...new Set(live.visitors.map((v) => v.userId).filter((u): u is string => Boolean(u)))]);
  live.visitors = live.visitors.map((v) => ({ ...v, account: v.userId ? labels.get(v.userId) ?? "Signed in" : null, userId: null }));
  return Response.json(live, { headers: { "cache-control": "no-store" } });
}
