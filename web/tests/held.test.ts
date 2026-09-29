import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const calls = vi.hoisted(() => ({ ids: [] as string[], failNext: false }));
vi.mock("@/lib/gateway", () => ({
  gateway: {
    createAnalysis: async () => {
      if (calls.failNext) { calls.failNext = false; throw new Error("AVOCO down"); }
      await new Promise((r) => setTimeout(r, 15));
      const id = crypto.randomUUID();
      calls.ids.push(id);
      return { id };
    },
  },
}));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";

let client: PGlite;
let db: Db;
const URL_A = "https://abc.public.blob.vercel-storage.com/voice-1.wav";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.creditLedger, schema.purchases, schema.selfRecordings, schema.reportAccess, schema.reportPeople, schema.settings]) await db.delete(t);
  await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });
  calls.ids.length = 0;
  calls.failNext = false;
});

describe("a recording kept at the paywall", () => {
  it("is analysed once and opened when the purchase lands, however many times the payment is confirmed", async () => {
    const p = await B.startPurchase(B.asUser("user_a"), "three", null, null, { audioUrl: URL_A, person: "Anna" });
    const paid = { amountCents: 1900, currency: "usd" };
    await Promise.all([B.completePurchase(p.id, paid), B.completePurchase(p.id, paid), B.completePurchase(p.id, paid)]);
    expect(calls.ids).toHaveLength(1);
    const id = calls.ids[0];
    const [row] = await db.select().from(schema.purchases);
    expect(row.unlockAnalysisId).toBe(id);
    expect(await B.hasFullAccess("user_a", id)).toBe(true);
    expect(await B.balance(B.asUser("user_a"))).toBe(2); // three bought, one opened the report
    expect(await B.startHeldRecording(p.id)).toBe(id);
    expect(calls.ids).toHaveLength(1);
    expect(await B.heldRecordingReport("user_a", URL_A)).toBe(id);
    expect(await B.heldRecordingReport("user_b", URL_A)).toBeNull();
    const [named] = await db.select().from(schema.reportPeople);
    expect(named).toMatchObject({ analysisId: id, name: "Anna" });
  });

  it("waits for the payment, and tries again after AVOCO failed", async () => {
    const p = await B.startPurchase(B.asUser("user_a"), "one", null, null, { audioUrl: URL_A, person: null });
    expect(await B.startHeldRecording(p.id)).toBeNull(); // not paid yet
    calls.failNext = true;
    await B.completePurchase(p.id, { amountCents: 900, currency: "usd" }); // AVOCO fails: the claim is released
    expect(calls.ids).toHaveLength(0);
    const id = await B.startHeldRecording(p.id);
    expect(id).toBe(calls.ids[0]);
    expect(await B.balance(B.asUser("user_a"))).toBe(0);
  });

  it("leaves ordinary purchases alone", async () => {
    const p = await B.startPurchase(B.asUser("user_a"), "three");
    await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" });
    expect(calls.ids).toHaveLength(0);
    expect(await B.startHeldRecording(p.id)).toBeNull();
    expect(await B.balance(B.asUser("user_a"))).toBe(3);
  });
});
