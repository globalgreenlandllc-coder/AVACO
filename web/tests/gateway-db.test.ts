import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { openRecordingsToday, stillProcessing } from "@/lib/gateway-db";
import { openLimitReached } from "@/lib/visitor";

let client: PGlite;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const add = (n: number, owner: string, status: string, minutesAgo = 0) =>
  client.query("insert into analyses (id, external_user_id, status, created_at) values ($1, $2, $3, now() - make_interval(mins => $4))", [id(n), owner, status, minutesAgo]);

beforeAll(async () => {
  client = new PGlite();
  // The gateway's table, as far as these reads use it (the real one lives in the gateway's migrations).
  await client.exec("create table analyses (id uuid primary key, external_user_id text not null, status text not null, created_at timestamptz not null default now())");
  setDbForTests(drizzle(client, { schema }) as unknown as Db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => { await client.exec("delete from analyses"); vi.unstubAllEnvs(); });

describe("the report page's poll while AVOCO works", () => {
  it("answers from the database only for the owner's young, processing analysis", async () => {
    await add(1, "user_dana", "processing", 1);
    expect(await stillProcessing("user_dana", id(1))).toBe(true);
    expect(await stillProcessing("user_tom", id(1))).toBe(false); // someone else's report never answers
    expect(await stillProcessing("user_dana", "not-a-uuid")).toBe(false);
  });

  it("sends everything else to the gateway: finished, queued, or old enough for its timeout", async () => {
    await add(1, "user_dana", "completed");
    await add(2, "user_dana", "queued"); // the gateway's read is what retries it
    await add(3, "user_dana", "processing", 20); // the gateway expires it at 15 minutes
    for (const n of [1, 2, 3]) expect(await stillProcessing("user_dana", id(n))).toBe(false);
  });
});

describe("the free test site's daily limit", () => {
  it("counts today's recordings by open-host visitors only", async () => {
    await add(1, "open:aaaa", "completed");
    await add(2, "open:bbbb", "processing");
    await add(3, "user_dana", "completed"); // the real site doesn't count
    await add(4, "open:cccc", "completed", 60 * 26); // yesterday
    expect(await openRecordingsToday()).toBe(2);
  });

  it("closes at OPEN_DAILY_LIMIT", async () => {
    vi.stubEnv("OPEN_DAILY_LIMIT", "2");
    await add(1, "open:aaaa", "completed");
    expect(await openLimitReached()).toBe(false);
    await add(2, "open:bbbb", "completed");
    expect(await openLimitReached()).toBe(true);
  });
});
