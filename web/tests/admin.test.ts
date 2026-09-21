import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const who = vi.hoisted(() => ({ userId: "user_admin" as string | null, email: "boss@example.com", verified: true }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: who.userId }),
  clerkClient: async () => ({ users: {
    getCount: async () => 42,
    getUser: async () => ({ primaryEmailAddressId: "e1", emailAddresses: [{ id: "e1", emailAddress: who.email, verification: { status: who.verified ? "verified" : "unverified" } }] }),
  } }),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/gateway", () => ({ gateway: {} }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as A from "@/lib/admin";
import * as B from "@/lib/billing";

let client: PGlite;
let db: Db;
beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite; setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.workspaces, schema.creditLedger, schema.purchases, schema.promoCodes, schema.selfRecordings, schema.reportAccess, schema.reportStats, schema.settings, schema.admins]) await db.delete(t);
  Object.assign(who, { userId: "user_admin", email: "boss@example.com", verified: true });
  process.env.ADMIN_EMAILS = "Boss@Example.com, second@example.com";
});

describe("who may open the admin portal", () => {
  it("an email in ADMIN_EMAILS, whatever its letter case", async () => expect(await A.requireAdmin()).toEqual({ userId: "user_admin", email: "boss@example.com" }));
  it("an email added in the portal", async () => {
    who.email = "helper@example.com";
    await expect(A.requireAdmin()).rejects.toThrow("NOT_FOUND");
    await db.insert(schema.admins).values({ email: "helper@example.com" });
    expect((await A.requireAdmin()).email).toBe("helper@example.com");
  });
  it("nobody else, and nobody signed out: both just see 'not found'", async () => {
    who.email = "stranger@example.com"; await expect(A.requireAdmin()).rejects.toThrow("NOT_FOUND");
    who.userId = null; await expect(A.requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
  it("not an admin's address that was never verified", async () => { who.verified = false; await expect(A.requireAdmin()).rejects.toThrow("NOT_FOUND"); });
  it("nobody at all when nothing is configured", async () => { delete process.env.ADMIN_EMAILS; await expect(A.requireAdmin()).rejects.toThrow("NOT_FOUND"); });
});

describe("statistics", () => {
  it("adds up revenue, reports, conversion, credits outstanding and the breakdowns", async () => {
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });
    // two people record; one buys a pack and opens a report
    const [a1, a2, a3] = [0, 0, 0].map(() => crypto.randomUUID());
    await B.noteSelfRecording("user_dana", a1); await B.noteSelfRecording("user_dana", a2); await B.noteSelfRecording("user_eli", a3);
    const p = await B.startPurchase(B.asUser("user_dana"), "three", a1);
    await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" });
    await B.noteResult(a1, "self", "analyst", "research"); await B.noteResult(a3, "self", "driver", "leadership"); await B.noteResult(a1, "self", "analyst", "research");

    // a company with a trial, a purchase and one invited recording
    const ws = crypto.randomUUID(), g = crypto.randomUUID(), person = crypto.randomUUID(), rec = crypto.randomUUID();
    await db.insert(schema.workspaces).values({ id: ws, name: "Acme", industry: "hiring", joinCode: "j", createdBy: "user_dana" });
    await db.insert(schema.members).values({ workspaceId: ws, userId: "user_dana", role: "admin" });
    await db.insert(schema.groups).values({ id: g, workspaceId: ws, name: "Vacancy", openToken: "o" });
    await db.insert(schema.participants).values({ id: person, groupId: g, name: "Kim", token: "t", source: "invite" });
    await db.insert(schema.recordings).values({ id: crypto.randomUUID(), participantId: person, analysisId: rec, consentAt: new Date() });
    await B.workspaceTrial(ws);
    const wp = await B.startPurchase(B.asWorkspace(ws), "team25");
    await B.completePurchase(wp.id, { amountCents: 14900, currency: "usd" });
    await B.charge(B.asWorkspace(ws), rec);

    const o = await A.overview();
    expect(o.revenue).toEqual({ today: 16800, week: 16800, month: 16800, all: 16800 });
    expect(o).toMatchObject({ currency: "usd", payingCustomers: 2, users: 42, companies: 1, people: 1 });
    expect(o.reports).toEqual({ all: 4, month: 4, self: 3, company: 1 });
    expect(o.opened).toEqual({ month: 2, all: 2 });                 // Dana's report + the company's recording
    expect(o.conversion).toEqual({ recorded: 3, opened: 1 });       // of three self recordings, one was opened
    expect(o.creditsOutstanding).toBe(3 - 1 + 5 + 25 - 1);          // what is still owed in reports
    expect(o.series).toHaveLength(30);
    expect(o.series.at(-1)).toMatchObject({ reports: 4, revenue: 16800 });
    expect(o.series.slice(0, -1).every((d) => d.reports === 0 && d.revenue === 0)).toBe(true);
    expect(o.leadingTypes).toEqual([{ key: "analyst", n: 1 }, { key: "driver", n: 1 }]); // a report counts once, however often it is read
    expect(o.sources).toEqual([{ key: "self", n: 3 }, { key: "invite", n: 1 }]);
    expect(o.industries).toEqual([{ key: "hiring", companies: 1, recordings: 1 }]);

    const users = await A.userRows();
    expect(users.find((u) => u.userId === "user_dana")).toMatchObject({ recordings: 2, opened: 1, credits: 2, spentCents: 1900 });
    expect(users.find((u) => u.userId === "user_eli")).toMatchObject({ recordings: 1, opened: 0, credits: 0, spentCents: 0 });

    expect(await A.companyRows()).toEqual([expect.objectContaining({ name: "Acme", industry: "hiring", members: 1, people: 1, recordings: 1, recordings30: 1, credits: 29, spentCents: 14900 })]);

    const tx = await A.transactions();
    expect(tx).toHaveLength(5);
    expect(tx.filter((t) => t.ownerKind === "workspace").every((t) => t.workspaceName === "Acme")).toBe(true);
  });

  it("is all zeros on an empty platform", async () => {
    const o = await A.overview();
    expect(o.revenue.all).toBe(0); expect(o.reports.all).toBe(0); expect(o.creditsOutstanding).toBe(0);
    expect(o.leadingTypes).toEqual([]); expect(await A.userRows()).toEqual([]); expect(await A.companyRows()).toEqual([]);
  });
});
