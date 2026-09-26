import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gateway", () => ({ gateway: {} }));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { markReady, markSeen, unseenReadyMatches } from "@/lib/matches";

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
beforeEach(async () => { await db.delete(schema.matches); });

async function insertMatch(id: string, ownerId: string) {
  const [m] = await db.insert(schema.matches).values({
    id, ownerKind: "user", ownerId, analysisId: "11111111-1111-4111-8111-111111111111", ownerName: "Dana", partnerName: "Serge",
    partnerToken: `token-${id.slice(0, 8)}-abcdefghijklmnop`, source: "credit",
  }).returning();
  return m;
}

describe("the 'report is ready' notice", () => {
  it("appears once the match is marked ready and goes away once the orderer has seen it", async () => {
    const a = await insertMatch("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "user_dana");
    const b = await insertMatch("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "user_other");
    expect(await unseenReadyMatches("user_dana")).toEqual([]);

    await markReady(a);
    await markReady(b);
    const [ready] = await unseenReadyMatches("user_dana");
    expect(ready?.id).toBe(a.id); // only Dana's own match
    expect(ready.readyAt).toBeInstanceOf(Date);

    const firstReady = ready.readyAt;
    await markReady(ready); // idempotent: the first time stays the time
    expect((await unseenReadyMatches("user_dana"))[0].readyAt).toEqual(firstReady);

    await markSeen(ready);
    expect(await unseenReadyMatches("user_dana")).toEqual([]);
    expect((await unseenReadyMatches("user_other")).map((m) => m.id)).toEqual([b.id]);
  });
});
