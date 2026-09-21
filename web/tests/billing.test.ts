import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import * as B from "@/lib/billing";
import { verifyStripeSignature } from "@/lib/stripe";

let client: PGlite;
let db: Db;
const A1 = "11111111-1111-4111-8111-111111111111", A2 = "22222222-2222-4222-8222-222222222222";
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
  for (const t of [schema.creditLedger, schema.purchases, schema.promoCodes, schema.selfRecordings, schema.reportAccess, schema.reportStats, schema.settings]) await db.delete(t);
});
const on = () => B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true });

describe("settings", () => {
  it("defaults to billing off, and keeps only sane values when saved", async () => {
    expect((await B.getSettings()).enabled).toBe(false);
    await B.saveSettings({ ...B.DEFAULT_SETTINGS, enabled: true, currency: "EURO!", freePreviewsPer30Days: -4, workspaceTrialCredits: 99999,
      packs: [{ id: "ok", credits: 2, amountCents: 1500, audience: "user" }, { id: "free!", credits: 1, amountCents: 0, audience: "user" }, { id: "neg", credits: -1, amountCents: 900, audience: "user" }] });
    expect(await B.getSettings()).toMatchObject({ enabled: true, currency: "usd", freePreviewsPer30Days: 0, workspaceTrialCredits: 1000, packs: [{ id: "ok" }] });
  });
});

describe("credits", () => {
  it("a balance is the sum of the ledger; users and workspaces with the same id don't share one", async () => {
    await B.grant(dana, 5, "admin", "welcome");
    await B.grant(dana, -2, "admin");
    await B.grant(B.asWorkspace("user_dana"), 40, "admin");
    expect(await B.balance(dana)).toBe(3);
    expect(await B.balance(B.asWorkspace("user_dana"))).toBe(40);
    expect(await B.balance(B.asUser("nobody"))).toBe(0);
    await expect(B.grant(dana, 0, "admin")).rejects.toThrow();
    await expect(B.grant(dana, 1.5, "admin")).rejects.toThrow();
  });

  it("charges one credit per report, once, and refuses at zero", async () => {
    await B.grant(dana, 1, "admin");
    expect(await B.charge(dana, A1)).toBe(true);
    expect(await B.charge(dana, A1)).toBe(true); // same report again: no second charge
    expect(await B.balance(dana)).toBe(0);
    expect(await B.charge(dana, A2)).toBe(false);
    expect(await B.balance(dana)).toBe(0);
  });

  it("gives a new workspace its trial once", async () => {
    await B.workspaceTrial("ws1");
    await B.workspaceTrial("ws1");
    expect(await B.balance(B.asWorkspace("ws1"))).toBe(B.DEFAULT_SETTINGS.workspaceTrialCredits);
  });
});

describe("purchases", () => {
  it("credits a paid purchase exactly once, however many times the webhook fires", async () => {
    const p = await B.startPurchase(dana, "three");
    expect(p).toMatchObject({ credits: 3, amountCents: 1900, status: "pending" });
    expect(await B.balance(dana)).toBe(0); // nothing until the money arrives

    expect(await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" })).toBe("credited");
    expect(await B.completePurchase(p.id, { amountCents: 1900, currency: "usd" })).toBe("already");
    expect(await B.balance(dana)).toBe(3);
    const [row] = await db.select().from(schema.purchases);
    expect(row.status).toBe("paid");
    expect(await B.completePurchase(crypto.randomUUID(), { amountCents: 1, currency: "usd" })).toBe("unknown");
  });

  it("won't sell a company pack to a person, or an unknown pack to anyone", async () => {
    await expect(B.startPurchase(dana, "team25")).rejects.toBeInstanceOf(B.BadCode);
    await expect(B.startPurchase(dana, "nope")).rejects.toBeInstanceOf(B.BadCode);
    expect((await B.startPurchase(B.asWorkspace("ws1"), "team25")).credits).toBe(25);
  });

  it("opens the report the buyer came from as soon as the payment lands", async () => {
    await on();
    await B.noteSelfRecording("user_dana", A1);
    expect(await B.hasFullAccess("user_dana", A1)).toBe(false);
    const p = await B.startPurchase(dana, "one", A1);
    await B.completePurchase(p.id, { amountCents: 900, currency: "usd" });
    expect(await B.hasFullAccess("user_dana", A1)).toBe(true);
    expect(await B.balance(dana)).toBe(0); // bought one, spent one
  });
});

describe("promo codes", () => {
  const code = (over: Partial<typeof schema.promoCodes.$inferInsert> = {}) => db.insert(schema.promoCodes).values({ code: "LAUNCH", credits: 2, ...over });

  it("gives its credits once per person, and counts uses", async () => {
    await code({ maxUses: 2 });
    expect(await B.redeem(dana, " launch ")).toBe(2);
    await expect(B.redeem(dana, "LAUNCH")).rejects.toThrow("already used");
    expect(await B.redeem(B.asUser("user_eli"), "LAUNCH")).toBe(2);
    await expect(B.redeem(B.asUser("user_fay"), "LAUNCH")).rejects.toThrow("isn't valid"); // used up
    expect(await B.balance(dana)).toBe(2);
  });

  it.each([["expired", { expiresAt: new Date(Date.now() - 1000) }], ["switched off", { active: false }]])("refuses a code that is %s", async (_n, over) => {
    await code(over);
    await expect(B.redeem(dana, "LAUNCH")).rejects.toBeInstanceOf(B.BadCode);
  });

  it("refuses unknown and empty codes", async () => {
    await expect(B.redeem(dana, "WHAT")).rejects.toBeInstanceOf(B.BadCode);
    await expect(B.redeem(dana, "")).rejects.toBeInstanceOf(B.BadCode);
    await expect(B.redeem(dana, null)).rejects.toBeInstanceOf(B.BadCode);
  });
});

describe("locked and unlocked reports", () => {
  it("with billing off everything is open and previews are unlimited", async () => {
    await B.noteSelfRecording("user_dana", A1);
    expect(await B.hasFullAccess("user_dana", A1)).toBe(true);
    expect(await B.previewsLeft("user_dana")).toBe(Infinity);
  });

  it("with billing on a new recording is a preview until a credit opens it", async () => {
    await on();
    await B.noteSelfRecording("user_dana", A1);
    expect(await B.hasFullAccess("user_dana", A1)).toBe(false);
    await expect(B.unlock("user_dana", A1)).rejects.toBeInstanceOf(B.NoCredits);

    await B.grant(dana, 1, "admin");
    await B.unlock("user_dana", A1);
    await B.unlock("user_dana", A1); // opening twice costs once
    expect(await B.hasFullAccess("user_dana", A1)).toBe(true);
    expect(await B.balance(dana)).toBe(0);
    expect(await B.hasFullAccess("user_other", A1)).toBe(false); // somebody else's credit doesn't open it for them
  });

  it("keeps reports from before billing open", async () => {
    await on();
    expect(await B.hasFullAccess("user_dana", A2)).toBe(true); // never recorded under billing
  });

  it("caps free previews per 30 days; unlocking one frees the slot", async () => {
    await on();
    const ids = [0, 1, 2].map(() => crypto.randomUUID());
    for (const id of ids) await B.noteSelfRecording("user_dana", id);
    expect(await B.previewsLeft("user_dana")).toBe(0);
    expect(await B.previewsLeft("user_other")).toBe(3);

    await B.grant(dana, 1, "admin");
    await B.unlock("user_dana", ids[0]);
    expect(await B.previewsLeft("user_dana")).toBe(1);

    await B.forgetReport(ids[1]); // deleted by the person
    expect(await B.previewsLeft("user_dana")).toBe(2);
  });
});

describe("Stripe webhook signature", () => {
  const secret = "whsec_test", body = '{"type":"checkout.session.completed"}', now = 1_790_000_000;
  const sign = (t: number, payload = body, key = secret) => `t=${t},v1=${createHmac("sha256", key).update(`${t}.${payload}`).digest("hex")}`;

  it("accepts a genuine, recent signature", () => expect(verifyStripeSignature(body, sign(now), secret, now)).toBe(true));
  it("accepts when one of several v1 signatures matches (secret rotation)", () => expect(verifyStripeSignature(body, `${sign(now)},v1=${"0".repeat(64)}`, secret, now)).toBe(true));
  it.each([
    ["a changed body", () => verifyStripeSignature(body + " ", sign(now), secret, now)],
    ["the wrong secret", () => verifyStripeSignature(body, sign(now, body, "whsec_other"), secret, now)],
    ["a replay older than five minutes", () => verifyStripeSignature(body, sign(now - 301), secret, now)],
    ["a missing header", () => verifyStripeSignature(body, null, secret, now)],
    ["a header without a timestamp", () => verifyStripeSignature(body, "v1=abc", secret, now)],
    ["an empty secret", () => verifyStripeSignature(body, sign(now, body, ""), "", now)],
  ])("rejects %s", (_n, run) => expect(run()).toBe(false));
});
