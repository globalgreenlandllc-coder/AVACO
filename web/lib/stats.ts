/**
 * Admin → Statistics: the visits (lib/visits-math.ts) joined with accounts, recordings and payments.
 * Reads across every user, so every entry point checks requireAdmin() first.
 */
import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { and, countDistinct, desc, eq, gte, isNotNull, notInArray, sql } from "drizzle-orm";
import { isAdminEmail } from "./admin";
import { creditLedger, db, industryAccess, matches, selfRecordings, visitExclusions, visits } from "./db";
import { userLabels } from "./page";
import { insightsFor, summarize, type Stats, type VisitRow } from "./visits-math";

const DAY = 86_400_000;

export interface Statistics {
  visits: Stats;
  /** When tracking began: the first visit ever recorded. */
  since: Date | null;
  users: {
    total: number | null;
    week: number; prevWeek: number; month: number; prevMonth: number;
    /** True when Clerk's list was cut off inside the period, so the counts are a floor. */
    capped: boolean;
    series: Array<{ day: string; value: number }>;
    active: number;
    top: Array<{ label: string; views: number; sessions: number; days: number; last: Date }>;
  };
  /** The last 30 days, each step counted in people: visitors → sign-ups → recorded → paid → an add-on bought. */
  funnel: { visitors: number; signups: number; recorded: number; paid: number; addons: number };
  insights: string[];
}


/**
 * New accounts in the last 60 days, from Clerk, newest first; null total when Clerk can't be asked. Admins' own
 * accounts are left out, so a test account of the team never counts as a sign-up. `ids`: the accounts of the last
 * 30 days, for crediting each sign-up to where its person first came from.
 */
/** Clerk's newest 500 accounts and the total, kept for a minute: live mode refreshes the page every 15 seconds. */
let clerkMemo: { at: number; total: number; list: { data: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUserList"]>>["data"] } } | null = null;

async function signups(now: number): Promise<{ total: number | null; created: number[]; ids: Set<string>; capped: boolean }> {
  try {
    if (!clerkMemo || Date.now() - clerkMemo.at > 60_000) {
      const client = await clerkClient();
      const [count, users] = await Promise.all([client.users.getCount(), client.users.getUserList({ orderBy: "-created_at", limit: 500 })]);
      clerkMemo = { at: Date.now(), total: count, list: { data: users.data } };
    }
    const { total, list } = clerkMemo;
    const floor = now - 60 * DAY;
    const recent = list.data.filter((u) => u.createdAt >= floor);
    const kept = (await Promise.all(recent.map(async (u) => {
      const email = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? u.emailAddresses?.[0]?.emailAddress;
      return (await isAdminEmail(email)) ? null : u;
    }))).filter((u) => u !== null);
    return { total, created: kept.map((u) => u.createdAt), ids: new Set(kept.filter((u) => u.createdAt >= now - 30 * DAY).map((u) => u.id)), capped: list.data.length >= 500 && (list.data.at(-1)?.createdAt ?? 0) >= floor };
  } catch (err) {
    console.error("Sign-ups unavailable", err);
    return { total: null, created: [], ids: new Set(), capped: false };
  }
}

export async function statistics(now = new Date()): Promise<Statistics> {
  const d = db();
  const since = (days: number) => new Date(now.getTime() - days * DAY);
  // Browsers noted as an admin's are left out here too, in case a view of theirs slipped in before they were recognised.
  const excluded = d.select({ visitor: visitExclusions.visitor }).from(visitExclusions);
  const [rows, first, clerk, recordedRows, paid, chapters, couples, buyers] = await Promise.all([
    d.select({ at: visits.at, site: visits.site, path: visits.path, visitor: visits.visitor, session: visits.session, userId: visits.userId, landing: visits.landing, source: visits.source, campaign: visits.campaign, medium: visits.medium, content: visits.content, referrer: visits.referrer, click: visits.click, country: visits.country, device: visits.device, locale: visits.locale })
      .from(visits).where(and(gte(visits.at, since(60)), notInArray(visits.visitor, excluded))).orderBy(desc(visits.at)).limit(60000),
    d.select({ at: sql<Date | null>`min(${visits.at})` }).from(visits),
    signups(now.getTime()),
    d.select({ userId: selfRecordings.userId }).from(selfRecordings).where(gte(selfRecordings.createdAt, since(30))).groupBy(selfRecordings.userId),
    d.select({ n: countDistinct(creditLedger.ownerId) }).from(creditLedger).where(and(eq(creditLedger.reason, "purchase"), gte(creditLedger.createdAt, since(30)))),
    d.select({ n: countDistinct(industryAccess.ownerId) }).from(industryAccess).where(and(eq(industryAccess.source, "credit"), gte(industryAccess.unlockedAt, since(30)))),
    d.select({ n: countDistinct(matches.ownerId) }).from(matches).where(and(eq(matches.source, "credit"), isNotNull(matches.paidAt), gte(matches.createdAt, since(30)))),
    d.select({ ownerId: creditLedger.ownerId }).from(creditLedger).where(and(eq(creditLedger.ownerKind, "user"), eq(creditLedger.reason, "purchase"), gte(creditLedger.createdAt, since(30)))).groupBy(creditLedger.ownerId),
  ]);
  const recordedUsers = new Set(recordedRows.map((r) => r.userId));
  const v = summarize(rows as VisitRow[], now, recordedUsers, { signedUp: clerk.ids, paid: new Set(buyers.map((b) => b.ownerId)) });

  const t = now.getTime();
  const inRange = (from: number, to: number) => clerk.created.filter((c) => c >= from && c < to).length;
  const days = Array.from({ length: 30 }, (_, i) => new Date(t - (29 - i) * DAY).toISOString().slice(0, 10));
  const users = {
    total: clerk.total,
    week: inRange(t - 7 * DAY, Infinity), prevWeek: inRange(t - 14 * DAY, t - 7 * DAY),
    month: inRange(t - 30 * DAY, Infinity), prevMonth: inRange(t - 60 * DAY, t - 30 * DAY),
    capped: clerk.capped,
    series: days.map((day) => ({ day, value: clerk.created.filter((c) => new Date(c).toISOString().slice(0, 10) === day).length })),
    active: v.month.accounts,
    top: [] as Statistics["users"]["top"],
  };
  const labels = await userLabels(v.accounts.map((a) => a.userId));
  users.top = v.accounts.map((a) => ({ label: labels.get(a.userId) ?? a.userId, views: a.views, sessions: a.sessions, days: a.days, last: a.last }));

  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const funnel = { visitors: v.month.visitors, signups: users.month, recorded: recordedUsers.size, paid: paid[0]?.n ?? 0, addons: Math.max(chapters[0]?.n ?? 0, couples[0]?.n ?? 0) };
  return {
    visits: v,
    since: first[0]?.at ? new Date(first[0].at) : null,
    users, funnel,
    insights: insightsFor(v, { signups: users.month, prevSignups: users.prevMonth, recorded: recordedUsers.size, languageName: (code) => names.of(code) ?? code }),
  };
}
