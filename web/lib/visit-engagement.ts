/**
 * What happened on a page after it was counted: the beacon's follow-ups (components/VisitBeacon.tsx) say how long the
 * page has been on screen, how much of it was scrolled into view, and which button or link was tapped. Each follow-up
 * updates that page view; nothing new is ever created, so a follow-up whose view was never recorded (an admin's
 * browser, analytics refused) changes nothing. Server only.
 */
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

export interface Engagement { visitor: string; session: string; path: string; seen: number; scroll: number; tap: string | null }

/** A tapped control's name as the statistics show it: one line, at most 60 characters. */
export function cleanTap(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const tap = raw.replace(/\s+/g, " ").trim().slice(0, 60);
  return tap || null;
}

/** A whole number within [0, max], or 0. */
export const bounded = (raw: unknown, max: number) => (typeof raw === "number" && Number.isFinite(raw) ? Math.min(max, Math.max(0, Math.round(raw))) : 0);

/**
 * Updates the latest view of this page in this session (within three hours): time and scroll only ever grow, and a tap
 * is added on a line of its own, the list kept to 400 characters.
 */
export async function recordEngagement(e: Engagement): Promise<void> {
  await db().execute(sql`update visits set
      seen_s = greatest(coalesce(seen_s, 0), ${e.seen}),
      scroll_pct = greatest(coalesce(scroll_pct, 0), ${e.scroll}),
      taps = case when ${e.tap}::text is null then taps else left(concat_ws(E'\n', taps, ${e.tap}::text), 400) end
    where id = (select id from visits where visitor = ${e.visitor} and session = ${e.session} and path = ${e.path}
      and at > now() - interval '3 hours' order by at desc limit 1)`);
}
