/**
 * The platform owner's view: who may see it, and the numbers behind it.
 * Everything here reads across all users and companies, so every entry point checks requireAdmin() first.
 */
import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, count, countDistinct, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { admins, creditLedger, db, groups, members, participants, promoCodes, recordings, reportAccess, reportStats, selfRecordings, workspaces } from "./db";

const DAY = 24 * 3600 * 1000;

/** Admins are the emails in ADMIN_EMAILS (so nobody can be locked out) plus those added in the portal. */
export async function isAdminEmail(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const lower = email.toLowerCase();
  if ((process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(lower)) return true;
  const [row] = await db().select().from(admins).where(eq(admins.email, lower));
  return Boolean(row);
}

/** The signed-in admin, or a 404: the portal doesn't reveal that it exists. Only a verified primary email counts. */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const { userId } = await auth();
  if (!userId) notFound();
  const user = await (await clerkClient()).users.getUser(userId).catch(() => null);
  const primary = user?.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  const email = primary?.verification?.status === "verified" ? primary.emailAddress : undefined;
  if (!(await isAdminEmail(email))) notFound();
  return { userId, email: email! };
}

/**
 * For the menu: is this signed-in person an admin? Asked on every page, so the answer is remembered for five
 * minutes per person. Inside a cached function nothing may read the current request, which Clerk's own client
 * does; so this asks Clerk's REST API directly, which needs only the secret key.
 * It only decides whether a button is shown; the portal itself always checks again with requireAdmin().
 */
const adminCheck = unstable_cache(async (userId: string): Promise<boolean> => {
  const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!res.ok) throw new Error(`Clerk user lookup failed: ${res.status}`);
  const user = await res.json() as { primary_email_address_id: string | null; email_addresses: Array<{ id: string; email_address: string; verification: { status: string } | null }> };
  const primary = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  return primary?.verification?.status === "verified" ? isAdminEmail(primary.email_address) : false;
}, ["is-admin-v2"], { revalidate: 300 });

export async function showAdminLink(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  // A failure here must not break every page, but it must not be silent either.
  return adminCheck(userId).catch((err) => { console.error("Admin button check failed", err); return false; });
}

const since = (days: number) => new Date(Date.now() - days * DAY);
// Days are UTC everywhere: said explicitly, so the charts don't depend on the database's timezone setting.
const dayOf = (column: unknown) => sql<string>`to_char(date_trunc('day', ${column} at time zone 'UTC'), 'YYYY-MM-DD')`;

export interface Overview {
  revenue: { today: number; week: number; month: number; all: number };
  currency: string;
  payingCustomers: number;
  reports: { all: number; month: number; self: number; company: number };
  opened: { month: number; all: number };
  conversion: { recorded: number; opened: number };
  creditsOutstanding: number;
  users: number | null;
  companies: number;
  people: number;
  series: Array<{ day: string; reports: number; revenue: number }>;
  leadingTypes: Array<{ key: string; n: number }>;
  topFields: Array<{ key: string; n: number }>;
  sources: Array<{ key: string; n: number }>;
  industries: Array<{ key: string; companies: number; recordings: number }>;
}

export async function overview(): Promise<Overview> {
  const d = db();
  const purchasesSince = (from: Date | null) => d.select({ total: sum(creditLedger.amountCents) }).from(creditLedger)
    .where(and(eq(creditLedger.reason, "purchase"), from ? gte(creditLedger.createdAt, from) : undefined));
  const startOfToday = new Date(new Date().setUTCHours(0, 0, 0, 0));

  const [today, week, month, all, currencyRow, paying, selfAll, selfMonth, coAll, coMonth, openedAll, openedMonth, selfOpenedMonth, outstanding, companies, people,
    selfDaily, coDaily, revDaily, types, fields, sources, industryCompanies, industryRecordings] = await Promise.all([
    purchasesSince(startOfToday), purchasesSince(since(7)), purchasesSince(since(30)), purchasesSince(null),
    d.select({ currency: creditLedger.currency }).from(creditLedger).where(eq(creditLedger.reason, "purchase")).orderBy(desc(creditLedger.createdAt)).limit(1),
    d.select({ n: countDistinct(sql`${creditLedger.ownerKind} || ':' || ${creditLedger.ownerId}`) }).from(creditLedger).where(eq(creditLedger.reason, "purchase")),
    d.select({ n: count() }).from(selfRecordings),
    d.select({ n: count() }).from(selfRecordings).where(gte(selfRecordings.createdAt, since(30))),
    d.select({ n: count() }).from(recordings),
    d.select({ n: count() }).from(recordings).where(gte(recordings.createdAt, since(30))),
    d.select({ n: count() }).from(creditLedger).where(eq(creditLedger.reason, "report")),
    d.select({ n: count() }).from(creditLedger).where(and(eq(creditLedger.reason, "report"), gte(creditLedger.createdAt, since(30)))),
    d.select({ n: count() }).from(selfRecordings).innerJoin(reportAccess, eq(reportAccess.analysisId, selfRecordings.analysisId)).where(gte(selfRecordings.createdAt, since(30))),
    d.select({ total: sum(creditLedger.delta) }).from(creditLedger),
    d.select({ n: count() }).from(workspaces),
    d.select({ n: count() }).from(participants),
    d.select({ day: dayOf(selfRecordings.createdAt), n: count() }).from(selfRecordings).where(gte(selfRecordings.createdAt, since(30))).groupBy(sql`1`),
    d.select({ day: dayOf(recordings.createdAt), n: count() }).from(recordings).where(gte(recordings.createdAt, since(30))).groupBy(sql`1`),
    d.select({ day: dayOf(creditLedger.createdAt), total: sum(creditLedger.amountCents) }).from(creditLedger).where(and(eq(creditLedger.reason, "purchase"), gte(creditLedger.createdAt, since(30)))).groupBy(sql`1`),
    d.select({ key: reportStats.leadingType, n: count() }).from(reportStats).groupBy(reportStats.leadingType).orderBy(desc(count())),
    d.select({ key: reportStats.topField, n: count() }).from(reportStats).where(sql`${reportStats.topField} is not null`).groupBy(reportStats.topField).orderBy(desc(count())).limit(8),
    d.select({ key: participants.source, n: count() }).from(recordings).innerJoin(participants, eq(participants.id, recordings.participantId)).groupBy(participants.source),
    d.select({ key: workspaces.industry, n: count() }).from(workspaces).groupBy(workspaces.industry),
    d.select({ key: workspaces.industry, n: count() }).from(recordings).innerJoin(participants, eq(participants.id, recordings.participantId))
      .innerJoin(groups, eq(groups.id, participants.groupId)).innerJoin(workspaces, eq(workspaces.id, groups.workspaceId)).groupBy(workspaces.industry),
  ]);

  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * DAY).toISOString().slice(0, 10));
  const at = <T extends { day: string }>(rows: T[], day: string) => rows.find((r) => r.day === day);
  const users = await (await clerkClient()).users.getCount().catch(() => null);
  const selfN = selfAll[0]?.n ?? 0, coN = coAll[0]?.n ?? 0;

  return {
    revenue: { today: Number(today[0]?.total ?? 0), week: Number(week[0]?.total ?? 0), month: Number(month[0]?.total ?? 0), all: Number(all[0]?.total ?? 0) },
    currency: currencyRow[0]?.currency ?? "usd",
    payingCustomers: paying[0]?.n ?? 0,
    reports: { all: selfN + coN, month: (selfMonth[0]?.n ?? 0) + (coMonth[0]?.n ?? 0), self: selfN, company: coN },
    opened: { month: openedMonth[0]?.n ?? 0, all: openedAll[0]?.n ?? 0 },
    conversion: { recorded: selfMonth[0]?.n ?? 0, opened: selfOpenedMonth[0]?.n ?? 0 },
    creditsOutstanding: Number(outstanding[0]?.total ?? 0),
    users,
    companies: companies[0]?.n ?? 0,
    people: people[0]?.n ?? 0,
    series: days.map((day) => ({ day, reports: (at(selfDaily, day)?.n ?? 0) + (at(coDaily, day)?.n ?? 0), revenue: Number(at(revDaily, day)?.total ?? 0) })),
    leadingTypes: types.map((r) => ({ key: r.key, n: r.n })),
    topFields: fields.map((r) => ({ key: r.key!, n: r.n })),
    sources: [{ key: "self", n: selfN }, ...sources.map((r) => ({ key: r.key as string, n: r.n }))].filter((r) => r.n > 0).sort((a, b) => b.n - a.n),
    industries: industryCompanies.map((r) => ({ key: r.key, companies: r.n, recordings: industryRecordings.find((x) => x.key === r.key)?.n ?? 0 })).sort((a, b) => b.recordings - a.recordings || b.companies - a.companies),
  };
}

export interface UserRow { userId: string; recordings: number; opened: number; credits: number; spentCents: number; lastActive: Date | null }

/** People who recorded or hold credits, most recently active first. */
export async function userRows(): Promise<UserRow[]> {
  const d = db();
  const [recs, opens, ledger] = await Promise.all([
    d.select({ userId: selfRecordings.userId, n: count(), last: sql<Date>`max(${selfRecordings.createdAt})` }).from(selfRecordings).groupBy(selfRecordings.userId),
    d.select({ userId: reportAccess.ownerId, n: count() }).from(reportAccess).where(eq(reportAccess.ownerKind, "user")).groupBy(reportAccess.ownerId),
    d.select({ userId: creditLedger.ownerId, credits: sum(creditLedger.delta), spent: sum(creditLedger.amountCents), last: sql<Date>`max(${creditLedger.createdAt})` })
      .from(creditLedger).where(eq(creditLedger.ownerKind, "user")).groupBy(creditLedger.ownerId),
  ]);
  const ids = new Set([...recs.map((r) => r.userId), ...ledger.map((r) => r.userId)]);
  const latest = (a: Date | null | undefined, b: Date | null | undefined) => { const [x, y] = [a ? new Date(a) : null, b ? new Date(b) : null]; return !x ? y : !y ? x : x > y ? x : y; };
  return [...ids].map((userId) => {
    const r = recs.find((x) => x.userId === userId), l = ledger.find((x) => x.userId === userId);
    return { userId, recordings: r?.n ?? 0, opened: opens.find((x) => x.userId === userId)?.n ?? 0, credits: Number(l?.credits ?? 0), spentCents: Number(l?.spent ?? 0), lastActive: latest(r?.last, l?.last) };
  }).sort((a, b) => (b.lastActive?.getTime() ?? 0) - (a.lastActive?.getTime() ?? 0)).slice(0, 300);
}

export interface CompanyRow { id: string; name: string; industry: string; members: number; people: number; recordings: number; recordings30: number; credits: number; spentCents: number; createdAt: Date }

export async function companyRows(): Promise<CompanyRow[]> {
  const d = db();
  const [list, memberCounts, peopleCounts, recCounts, rec30, ledger] = await Promise.all([
    d.select().from(workspaces).orderBy(desc(workspaces.createdAt)).limit(300),
    d.select({ id: members.workspaceId, n: count() }).from(members).groupBy(members.workspaceId),
    d.select({ id: groups.workspaceId, n: count() }).from(participants).innerJoin(groups, eq(groups.id, participants.groupId)).groupBy(groups.workspaceId),
    d.select({ id: groups.workspaceId, n: count() }).from(recordings).innerJoin(participants, eq(participants.id, recordings.participantId)).innerJoin(groups, eq(groups.id, participants.groupId)).groupBy(groups.workspaceId),
    d.select({ id: groups.workspaceId, n: count() }).from(recordings).innerJoin(participants, eq(participants.id, recordings.participantId)).innerJoin(groups, eq(groups.id, participants.groupId))
      .where(gte(recordings.createdAt, since(30))).groupBy(groups.workspaceId),
    d.select({ id: creditLedger.ownerId, credits: sum(creditLedger.delta), spent: sum(creditLedger.amountCents) }).from(creditLedger).where(eq(creditLedger.ownerKind, "workspace")).groupBy(creditLedger.ownerId),
  ]);
  const n = (rows: Array<{ id: string; n: number }>, id: string) => rows.find((r) => r.id === id)?.n ?? 0;
  return list.map((ws) => {
    const l = ledger.find((r) => r.id === ws.id);
    return { id: ws.id, name: ws.name, industry: ws.industry, members: n(memberCounts, ws.id), people: n(peopleCounts, ws.id), recordings: n(recCounts, ws.id), recordings30: n(rec30, ws.id), credits: Number(l?.credits ?? 0), spentCents: Number(l?.spent ?? 0), createdAt: ws.createdAt };
  });
}

export async function transactions(limit = 300) {
  const rows = await db().select().from(creditLedger).orderBy(desc(creditLedger.createdAt)).limit(limit);
  const wsIds = [...new Set(rows.filter((r) => r.ownerKind === "workspace").map((r) => r.ownerId))];
  const names = wsIds.length ? await db().select({ id: workspaces.id, name: workspaces.name }).from(workspaces).where(inArray(workspaces.id, wsIds)) : [];
  return rows.map((r) => ({ ...r, workspaceName: r.ownerKind === "workspace" ? names.find((n) => n.id === r.ownerId)?.name ?? "(deleted company)" : null }));
}

export const listPromoCodes = () => db().select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
export const listAdmins = () => db().select().from(admins).orderBy(admins.createdAt);
