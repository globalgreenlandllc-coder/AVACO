import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gateway", () => ({ gateway: {} }));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { isPaid, matchByToken } from "@/lib/matches";

let client: PGlite;
let db: Db;

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => { await db.delete(schema.matches); await db.delete(schema.creditLedger); });

/** A match as rows made before match payments existed look: no paid_at, whatever it cost. */
async function legacyMatch(n: number, source: "admin" | "free" | "credit") {
  const id = `${String(n).repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
  const [m] = await db.insert(schema.matches).values({
    id, ownerKind: "user", ownerId: "user_dima", analysisId: "11111111-1111-4111-8111-111111111111", ownerName: "Dima", partnerName: "Olga",
    partnerToken: `token-${n}-abcdefghijklmnopqrstuv`, source, createdAt: new Date("2026-09-26T21:32:51.630Z"),
  }).returning();
  return m;
}

describe("a paid couple's report", () => {
  it("counts an admin's or a free match as paid even without a payment date, and opens its partner link", async () => {
    const admin = await legacyMatch(1, "admin");
    const free = await legacyMatch(2, "free");
    const card = await legacyMatch(3, "credit");
    expect([isPaid(admin), isPaid(free), isPaid(card)]).toEqual([true, true, false]);
    expect((await matchByToken(admin.partnerToken))?.id).toBe(admin.id);
    expect((await matchByToken(free.partnerToken))?.id).toBe(free.id);
    expect(await matchByToken(card.partnerToken)).toBeNull(); // a card checkout never finished: the link stays closed
    expect(isPaid({ paidAt: new Date(), source: "credit" })).toBe(true);
  });

  it("the 0011 migration dates the free and credit-paid matches, and leaves an unfinished card checkout unpaid", async () => {
    const admin = await legacyMatch(1, "admin");
    const free = await legacyMatch(2, "free");
    const byCredits = await legacyMatch(3, "credit");
    const unpaidCard = await legacyMatch(4, "credit");
    await db.insert(schema.creditLedger).values({ id: crypto.randomUUID(), ownerKind: "user", ownerId: "user_dima", delta: -2, reason: "match", ref: byCredits.id });

    await db.execute(sql.raw(readFileSync("./drizzle/0011_free_matches_paid.sql", "utf8")));

    const rows = new Map((await db.select().from(schema.matches)).map((m) => [m.id, m.paidAt?.toISOString() ?? null]));
    expect(rows.get(admin.id)).toBe("2026-09-26T21:32:51.630Z");
    expect(rows.get(free.id)).toBe("2026-09-26T21:32:51.630Z");
    expect(rows.get(byCredits.id)).toBe("2026-09-26T21:32:51.630Z");
    expect(rows.get(unpaidCard.id)).toBeNull();
  });
});
