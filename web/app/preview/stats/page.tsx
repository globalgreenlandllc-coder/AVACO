import { notFound } from "next/navigation";
import { EngagementReport } from "@/components/EngagementReport";
import { LiveTraffic } from "@/components/LiveTraffic";
import { SourcesReport } from "@/components/SourcesReport";
import { summarize, type VisitRow } from "@/lib/visits-math";

// A made-up month of visits, to look at the statistics without an admin account. Development only. The live panel asks
// /api/admin/live like the real page; a test browser answers it with made-up visitors.
export default function PreviewStats() {
  if (process.env.NODE_ENV === "production") notFound();
  const now = new Date();
  const D = 86_400_000;
  const rows: VisitRow[] = [];
  let seed = 7;
  const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  const doors: Array<Partial<VisitRow>> = [
    { source: "instagram", campaign: "launch", medium: "bio" }, { source: "instagram" }, { source: "google" }, { source: "direct" }, { source: "direct" },
    { source: "blog.example.org", referrer: "blog.example.org/voice-personality-tests" }, { source: "direct", path: "/g/[id]" }, { source: "direct", path: "/m/[id]" }, { source: "newsletter", campaign: "september", medium: "email" },
  ];
  for (let i = 0; i < 160; i++) {
    const door = doors[Math.floor(rand() * doors.length)];
    const at = new Date(now.getTime() - rand() * 29 * D);
    const visitor = `v${i}`, session = `s${i}`;
    const userId = rand() < 0.3 ? `user_${i}` : null;
    rows.push({ at, site: "main", path: door.path ?? "/", visitor, session, userId: null, landing: true, source: door.source ?? "direct", campaign: door.campaign ?? null, medium: door.medium ?? null, referrer: door.referrer ?? null, country: "US", device: rand() < 0.6 ? "phone" : "desktop", locale: "en" });
    if (userId) rows.push({ at: new Date(at.getTime() + 60_000), site: "main", path: "/record", visitor, session, userId, landing: false, source: door.source ?? "direct", country: "US", device: "phone", locale: "en" });
  }
  const users = rows.filter((r) => r.userId).map((r) => r.userId!);
  const signedUp = new Set(users.filter((_, i) => i % 2 === 0)), recorded = new Set(users.filter((_, i) => i % 3 === 0)), paid = new Set(users.filter((_, i) => i % 7 === 0));
  const v = summarize(rows, now, recorded, { signedUp, paid });
  return <div className="space-y-6"><LiveTraffic /><SourcesReport v={v} /><EngagementReport v={v} /></div>;
}
