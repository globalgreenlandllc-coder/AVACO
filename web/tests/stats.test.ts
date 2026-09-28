import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Clerk: 42 accounts, two made this month (one of them Anna), an admin's test account this month, one the month before, one long ago.
vi.mock("@clerk/nextjs/server", () => {
  const DAY = 86_400_000, now = Date.now();
  return { clerkClient: async () => ({ users: { getCount: async () => 42, getUserList: async () => ({ data: [{ id: "user_anna", createdAt: now - 2 * DAY, primaryEmailAddressId: "e1", emailAddresses: [{ id: "e1", emailAddress: "anna@example.com" }] }, { id: "user_ben", createdAt: now - 3 * DAY, emailAddresses: [] }, { id: "user_boss", createdAt: now - DAY, primaryEmailAddressId: "e2", emailAddresses: [{ id: "e2", emailAddress: "boss@avocousa.us" }] }, { createdAt: now - 40 * DAY }, { createdAt: now - 200 * DAY }] }) } }) };
});
vi.mock("@/lib/page", () => ({ userLabels: async (ids: string[]) => new Map(ids.map((id) => [id, `Person ${id}`])) }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { statistics } from "@/lib/stats";
import { excludeVisitor, isExcludedVisitor } from "@/lib/visit-exclusions";

const DAY = 86_400_000, H = 3_600_000;
let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });

describe("statistics", () => {
  it("joins the visits with sign-ups, recordings and purchases", async () => {
    const now = new Date().setUTCHours(12, 0, 0, 0); // noon, so Anna's two visits an hour apart never straddle midnight UTC
    const v = (at: number, o: Partial<typeof schema.visits.$inferInsert>) => ({ id: crypto.randomUUID(), at: new Date(at), site: "main" as const, path: "/", visitor: "anna", session: "a1", userId: null, landing: false, source: "instagram", campaign: null, country: "US", device: "phone" as const, locale: "en", ...o });
    await db.insert(schema.visits).values([
      v(now - 2 * DAY, { landing: true }),
      v(now - 2 * DAY + H, { path: "/record", userId: "user_anna" }),
      v(now - 2 * DAY + 2 * H, { path: "/reports/[id]", userId: "user_anna" }),
      v(now - 3 * DAY, { visitor: "ben", session: "b1", landing: true, source: "google", device: "desktop", locale: "es", country: "DE" }),
      v(now - 45 * DAY, { visitor: "old", session: "o1", landing: true, source: "direct" }),
    ]);
    await db.insert(schema.selfRecordings).values({ analysisId: A1, userId: "user_anna", createdAt: new Date(now - DAY) });
    await db.insert(schema.creditLedger).values({ id: crypto.randomUUID(), ownerKind: "user", ownerId: "user_anna", delta: 1, reason: "purchase", ref: "p1", amountCents: 900, currency: "usd", createdAt: new Date(now - DAY) });
    await db.insert(schema.industryAccess).values({ analysisId: A1, industry: "it", ownerKind: "user", ownerId: "user_anna", source: "credit", unlockedAt: new Date(now - DAY) });
    await db.insert(schema.admins).values({ email: "boss@avocousa.us" }); // the admin's own account is not a sign-up

    const s = await statistics();
    expect(s.since?.getTime()).toBeCloseTo(now - 45 * DAY, -3);
    expect(s.visits.month).toEqual({ views: 4, visitors: 2, sessions: 2, accounts: 1 });
    expect(s.visits.prevMonth.visitors).toBe(1);
    expect(s.users).toMatchObject({ total: 42, month: 2, prevMonth: 1, week: 2, capped: false, active: 1 });
    expect(s.users.series.reduce((n, d) => n + d.value, 0)).toBe(2);
    expect(s.users.top).toEqual([{ label: "Person user_anna", views: 2, sessions: 1, days: 1, last: new Date(now - 2 * DAY + 2 * H) }]);
    expect(s.funnel).toEqual({ visitors: 2, signups: 2, recorded: 1, paid: 1, addons: 1 });
    expect(s.visits.sources).toEqual([{ source: "instagram", channel: "social", sessions: 1, visitors: 1, signups: 1, recorded: 1, paid: 1 }, { source: "google", channel: "search", sessions: 1, visitors: 1, signups: 0, recorded: 0, paid: 0 }]);
    expect(s.visits.countries).toEqual([{ country: "US", visitors: 1 }, { country: "DE", visitors: 1 }]);
    expect(s.visits.recording).toEqual({ reached: 1, finished: 1 });
    expect(s.insights.length).toBeGreaterThan(0);
  });

  it("leaves an admin's browser out, past views included", async () => {
    const now = Date.now();
    await db.insert(schema.visits).values([
      { id: crypto.randomUUID(), at: new Date(now - DAY), site: "main", path: "/", visitor: "boss-phone", session: "p1", landing: true, source: "direct", device: "phone" },
      { id: crypto.randomUUID(), at: new Date(now - DAY + H), site: "main", path: "/record", visitor: "boss-phone", session: "p1", userId: "user_boss", source: "direct", device: "phone" },
    ]);
    expect((await statistics()).visits.month.visitors).toBe(3);
    await excludeVisitor("boss-phone", "user_boss");
    expect(await isExcludedVisitor("boss-phone")).toBe(true);
    expect(await isExcludedVisitor("anna")).toBe(false);
    expect((await statistics()).visits.month.visitors).toBe(2);
    expect(await db.select().from(schema.visits).where(eq(schema.visits.visitor, "boss-phone"))).toHaveLength(0);
    await excludeVisitor("boss-phone", "user_boss"); // noting it twice is fine
  });
});
