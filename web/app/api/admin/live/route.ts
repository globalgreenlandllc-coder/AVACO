/** GET — the live traffic view (components/LiveTraffic.tsx): the last hour of visits, summarised. Admins only. */
import { auth } from "@clerk/nextjs/server";
import { desc, gte } from "drizzle-orm";
import { isAdminUser } from "@/lib/admin";
import { db, visits } from "@/lib/db";
import { liveSummary, type LiveRow } from "@/lib/visits-math";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) return Response.json({ error: "not_found" }, { status: 404 });
  const rows = await db().select({
    at: visits.at, path: visits.path, visitor: visits.visitor, session: visits.session, landing: visits.landing, source: visits.source, device: visits.device,
    userId: visits.userId, medium: visits.medium, click: visits.click, country: visits.country, city: visits.city, lat: visits.lat, lon: visits.lon,
  }).from(visits).where(gte(visits.at, new Date(Date.now() - 61 * 60_000))).orderBy(desc(visits.at)).limit(5000);
  return Response.json(liveSummary(rows as LiveRow[]), { headers: { "cache-control": "no-store" } });
}
