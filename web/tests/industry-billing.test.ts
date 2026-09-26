import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";
import { DEFAULT_INDUSTRY_PRICE_CENTS, INDUSTRY_PACK, industryPriceCents, saveIndustryPrice, startIndustryPurchase } from "@/lib/industry-billing";

let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111";
const dana = B.asUser("user_dana");

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.creditLedger, schema.purchases, schema.selfRecordings, schema.reportAccess, schema.industryAccess, schema.settings]) await db.delete(t);
});

describe("the industry add-on's own price", () => {
  it("has a default, is saved from the portal, and is clamped to something sane", async () => {
    expect(await industryPriceCents()).toBe(DEFAULT_INDUSTRY_PRICE_CENTS);
    await saveIndustryPrice(690);
    expect(await industryPriceCents()).toBe(690);
    await saveIndustryPrice(3);
    expect(await industryPriceCents()).toBe(50);
  });

  it("buys one chapter at that price and opens it when the payment lands, leaving no spare credit", async () => {
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });
    await saveIndustryPrice(490);
    const p = await startIndustryPurchase(dana, A1, "architecture");
    expect(p).toMatchObject({ pack: INDUSTRY_PACK, credits: 1, amountCents: 490, unlockAnalysisId: A1, unlockIndustry: "architecture" });

    expect(await B.completePurchase(p.id, { amountCents: 490, currency: "usd" })).toBe("credited");
    expect(await B.hasIndustryAccess("user_dana", A1, "architecture")).toBe(true);
    expect(await B.balance(dana)).toBe(0); // the credit went to the chapter, never usable for a $9 report
    expect(await B.completePurchase(p.id, { amountCents: 490, currency: "usd" })).toBe("already"); // Stripe retries change nothing
    expect(await B.balance(dana)).toBe(0);
  });
});
