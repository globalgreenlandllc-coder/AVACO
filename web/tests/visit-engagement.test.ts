import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { bounded, cleanTap, recordEngagement } from "@/lib/visit-engagement";

let client: PGlite;
let db: Db;
const view = (id: string, o: Partial<typeof schema.visits.$inferInsert> = {}) =>
  db.insert(schema.visits).values({ id, site: "main", path: "/", visitor: "v1", session: "s1", seenS: 0, scrollPct: 0, ...o });
const read = async (id: string) => (await db.select().from(schema.visits)).find((r) => r.id === id)!;

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite as unknown as Db;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => { await db.delete(schema.visits); });

const base = { visitor: "v1", session: "s1", path: "/", seen: 0, scroll: 0, tap: null };

describe("a page's follow-ups", () => {
  it("only ever raise the time and the scroll, and add each tap on its own line", async () => {
    await view("00000000-0000-4000-8000-000000000001");
    await recordEngagement({ ...base, seen: 6, scroll: 40 });
    await recordEngagement({ ...base, seen: 3, scroll: 25, tap: "hero: start (phone)" }); // an older, smaller reading
    await recordEngagement({ ...base, tap: "bar: not now" });
    expect(await read("00000000-0000-4000-8000-000000000001")).toMatchObject({ seenS: 6, scrollPct: 40, taps: "hero: start (phone)\nbar: not now" });
  });

  it("update the latest view of that page in that session, and never create one", async () => {
    await view("00000000-0000-4000-8000-000000000002", { at: new Date(Date.now() - 60_000) });
    await view("00000000-0000-4000-8000-000000000003");
    await recordEngagement({ ...base, seen: 9 });
    await recordEngagement({ ...base, session: "someone-else", seen: 30 });
    expect((await read("00000000-0000-4000-8000-000000000002")).seenS).toBe(0);
    expect((await read("00000000-0000-4000-8000-000000000003")).seenS).toBe(9);
    expect(await db.select().from(schema.visits)).toHaveLength(2);
  });

  it("keep numbers in range and tap names on one short line", () => {
    expect(bounded(99_999, 3600)).toBe(3600);
    expect(bounded(-4, 100)).toBe(0);
    expect(bounded("12", 100)).toBe(0);
    expect(cleanTap("  Try it\n free  →  ")).toBe("Try it free →");
    expect(cleanTap("x".repeat(90))).toHaveLength(60);
    expect(cleanTap("   ")).toBeNull();
  });
});
