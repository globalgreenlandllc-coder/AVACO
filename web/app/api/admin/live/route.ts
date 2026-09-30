/** GET — the live traffic view (components/LiveTraffic.tsx): the last hour of visits, summarised, each visitor with their story. Admins only. */
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { isAdminUser } from "@/lib/admin";
import { creditLedger, db, visits } from "@/lib/db";
import { userLabels } from "@/lib/page";
import { liveSummary, type LiveRow } from "@/lib/visits-math";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) return Response.json({ error: "not_found" }, { status: 404 });
  const d = db();
  const rows = await d.select({
    at: visits.at, path: visits.path, visitor: visits.visitor, session: visits.session, landing: visits.landing, source: visits.source, device: visits.device,
    userId: visits.userId, medium: visits.medium, click: visits.click, campaign: visits.campaign, content: visits.content, referrer: visits.referrer, locale: visits.locale,
    country: visits.country, city: visits.city, region: visits.region, lat: visits.lat, lon: visits.lon,
  }).from(visits).where(gte(visits.at, new Date(Date.now() - 61 * 60_000))).orderBy(desc(visits.at)).limit(5000);
  // Each visitor's month: when this browser first came, and how many visits it made.
  const ids = [...new Set(rows.map((r) => r.visitor))];
  const history = ids.length
    ? await d.select({ visitor: visits.visitor, first: sql<string>`min(${visits.at})`, sessions: sql<number>`count(distinct ${visits.session})::int`, userId: sql<string | null>`max(${visits.userId})` })
      .from(visits).where(and(inArray(visits.visitor, ids), gte(visits.at, new Date(Date.now() - 30 * 86_400_000)))).groupBy(visits.visitor)
    : [];
  const live = liveSummary(rows as LiveRow[], new Date(), new Map(history.map((h) => [h.visitor, { first: new Date(h.first), sessions: Number(h.sessions), userId: h.userId }])));
  // Green pins: a purchase made within this hour (a report, a pack, an add-on). Older buyers stay blue, marked as customers.
  const accounts = [...new Set(live.visitors.map((v) => v.userId).filter((u): u is string => Boolean(u)))];
  const purchases = accounts.length
    ? await d.select({ id: creditLedger.ownerId, last: sql<string>`max(${creditLedger.createdAt})` }).from(creditLedger)
      .where(and(eq(creditLedger.ownerKind, "user"), eq(creditLedger.reason, "purchase"), inArray(creditLedger.ownerId, accounts))).groupBy(creditLedger.ownerId)
    : [];
  const lastPurchase = new Map(purchases.map((p) => [p.id, new Date(p.last).getTime()]));
  const hourAgo = Date.now() - 60 * 60_000;
  live.visitors = live.visitors.map((v) => {
    const last = v.userId ? lastPurchase.get(v.userId) : undefined;
    return { ...v, status: last && last >= hourAgo ? "paid" : v.status, paidAt: last && last >= hourAgo ? last : null, customer: Boolean(last) };
  });
  // Signed-in visitors by name, for the admin's eyes only.
  const labels = await userLabels([...new Set(live.visitors.map((v) => v.userId).filter((u): u is string => Boolean(u)))]);
  live.visitors = live.visitors.map((v) => ({ ...v, account: v.userId ? labels.get(v.userId) ?? "Signed in" : null, userId: null }));
  return Response.json(live, { headers: { "cache-control": "no-store" } });
}
