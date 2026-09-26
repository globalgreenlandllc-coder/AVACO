import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gateway", () => ({ gateway: {} }));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => false }));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";
import { claimGift, coverWithGift, createGift, giftByToken, giftPrice, startGiftPurchase } from "@/lib/gifts";

let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111";
const A2 = "22222222-2222-4222-8222-222222222222";

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  for (const t of [schema.creditLedger, schema.purchases, schema.gifts, schema.selfRecordings, schema.reportAccess, schema.settings]) await db.delete(t);
  await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });
});

describe("gifts", () => {
  it("cost the single-report price per report plus the add-on price per industry chapter", async () => {
    expect((await giftPrice(1, 0)).amountCents).toBe(900);
    expect((await giftPrice(2, 3)).amountCents).toBe(2 * 900 + 3 * 490);
  });

  it("refuse nonsense", async () => {
    await expect(createGift("user_dana", { giverName: "", reports: 1 })).rejects.toThrow("Your name");
    await expect(createGift("user_dana", { giverName: "Dana", reports: 0 })).rejects.toThrow("Reports");
    await expect(createGift("user_dana", { giverName: "Dana", reports: 1, industries: 99 })).rejects.toThrow("Industry");
  });

  it("wait for the payment, then are claimed once into the recipient's account, and open their recordings by themselves", async () => {
    const gift = await createGift("user_dana", { giverName: "Dana", recipientName: "Lena", message: "For you", reports: 1, industries: 1 });
    expect(gift).toMatchObject({ status: "pending", amountCents: 1390, reports: 1, industries: 1 });
    expect((await giftByToken(gift.token))?.id).toBe(gift.id);

    // Not claimable before it is paid.
    await expect(claimGift(gift, "user_lena")).rejects.toThrow("not been paid");

    // Stripe pays: the giver's balance stays 0, the gift becomes ready to send.
    const purchase = await startGiftPurchase(gift);
    expect(await B.completePurchase(purchase.id, { amountCents: 1390, currency: "usd" })).toBe("credited");
    expect(await B.balance(B.asUser("user_dana"))).toBe(0);
    const paid = (await giftByToken(gift.token))!;
    expect(paid.status).toBe("paid");

    // Lena claims: two credits land in her account, once, however often the page reloads.
    const claimed = await claimGift(paid, "user_lena");
    expect(claimed).toMatchObject({ status: "claimed", claimedBy: "user_lena" });
    await claimGift(claimed, "user_lena");
    expect(await B.balance(B.asUser("user_lena"))).toBe(2);
    await expect(claimGift(claimed, "user_someone_else")).rejects.toThrow("already been claimed");

    // Her recording is opened with the gift's credit at once; the chapter credit stays for an industry of her choice.
    await B.noteSelfRecording("user_lena", A1);
    expect(await B.hasFullAccess("user_lena", A1)).toBe(false);
    const covered = await coverWithGift("user_lena", A1);
    expect(covered?.reportsUsed).toBe(1);
    expect(await B.hasFullAccess("user_lena", A1)).toBe(true);
    expect(await B.balance(B.asUser("user_lena"))).toBe(1);

    // The gift had one report: a second recording is not covered (the remaining credit is hers to spend as she likes).
    await B.noteSelfRecording("user_lena", A2);
    expect(await coverWithGift("user_lena", A2)).toBeNull();
    expect(await B.hasFullAccess("user_lena", A2)).toBe(false);
  });
});
