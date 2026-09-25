import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as schema from "@/lib/db/schema";
import { setDbForTests, type Db } from "@/lib/db";
import { open, seal, secretsReady } from "@/lib/secrets";
import { clearStripeKeys, saveStripeKeys, stripeKeys, stripeReady, stripeStatus } from "@/lib/stripe";

let client: PGlite;
let db: Db;
const SECRET = "test-settings-secret-0123456789";
// Key-shaped fixtures, assembled at run time so nothing in the source looks like a real key to a secret scanner.
const key = (prefix: string, mode: string) => `${prefix}_${mode}_` + "51AbCdEfGhIjKlMnOpQrStUv";
const LIVE = key("sk", "live"), TEST = key("sk", "test"), WHSEC = "whsec" + "_AbCdEfGhIjKlMnOpQrStUvWx";

/** Pretends to be Stripe's GET /v1/account: accepts the keys above, refuses anything else. */
function stubStripe() {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(String(url));
    const key = String((init?.headers as Record<string, string>)?.Authorization ?? "").replace("Bearer ", "");
    if (key === LIVE || key === TEST) return new Response(JSON.stringify({ id: "acct_1", settings: { dashboard: { display_name: "Global Greenland" } } }), { status: 200 });
    return new Response(JSON.stringify({ error: { message: "Invalid API Key provided" } }), { status: 401 });
  }));
  return calls;
}

beforeAll(async () => {
  client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder: "./drizzle" });
  db = pglite;
  setDbForTests(db);
});
afterAll(async () => { setDbForTests(null); await client.close(); });
beforeEach(async () => {
  process.env.SETTINGS_SECRET = SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await db.delete(schema.settings);
});
afterEach(() => vi.unstubAllGlobals());

describe("sealed secrets", () => {
  it("round-trips, and every seal of the same value looks different", () => {
    const a = seal("sk_live_abc"), b = seal("sk_live_abc");
    expect(a).not.toBe(b);
    expect(open(a)).toBe("sk_live_abc");
    expect(open(b)).toBe("sk_live_abc");
    expect(a.startsWith("v1.")).toBe(true);
  });

  it("refuses a tampered value and a value sealed under another secret", () => {
    const sealed = seal("whsec_123");
    const [v, iv, tag, data] = sealed.split(".");
    expect(() => open([v, iv, tag, data.slice(0, -2) + (data.endsWith("AA") ? "BB" : "AA")].join("."))).toThrow();
    process.env.SETTINGS_SECRET = "another-secret-with-enough-length";
    expect(() => open(sealed)).toThrow();
  });

  it("is only ready with a long enough SETTINGS_SECRET", () => {
    expect(secretsReady()).toBe(true);
    process.env.SETTINGS_SECRET = "short";
    expect(secretsReady()).toBe(false);
    expect(() => seal("x")).toThrow(/SETTINGS_SECRET/);
  });
});

describe("Stripe keys from the admin portal", () => {
  it("is not connected with nothing saved and nothing in the environment", async () => {
    expect(await stripeReady()).toBe(false);
    expect(await stripeStatus()).toMatchObject({ connected: false, source: null, canStore: true });
  });

  it("rejects malformed keys before asking Stripe", async () => {
    const calls = stubStripe();
    expect(await saveStripeKeys({ secretKey: "pk" + "_live_notasecret", webhookSecret: WHSEC }, "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("sk_live_") });
    expect(await saveStripeKeys({ secretKey: LIVE, webhookSecret: "nope" }, "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("whsec_") });
    expect(calls).toHaveLength(0);
    expect(await stripeReady()).toBe(false);
  });

  it("refuses a key Stripe doesn't recognise, and stores nothing", async () => {
    stubStripe();
    expect(await saveStripeKeys({ secretKey: key("sk", "live").replace("51Ab", "Wrong"), webhookSecret: WHSEC }, "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("Invalid API Key") });
    expect(await stripeReady()).toBe(false);
  });

  it("checks a good key with Stripe, stores both secrets sealed, and serves them back", async () => {
    const calls = stubStripe();
    expect(await saveStripeKeys({ secretKey: ` ${LIVE} `, webhookSecret: WHSEC }, "dima@example.com")).toEqual({ ok: true, account: "Global Greenland" });
    expect(calls).toEqual(["https://api.stripe.com/v1/account"]);

    const [row] = await db.select().from(schema.settings);
    const stored = row.value as Record<string, string>;
    expect(stored.secretKey).not.toContain(LIVE); // sealed, not plain
    expect(stored.webhookSecret).not.toContain(WHSEC);
    expect(JSON.stringify(row.value)).not.toContain(LIVE.slice(0, 12));

    expect(await stripeKeys()).toEqual({ secretKey: LIVE, webhookSecret: WHSEC });
    expect(await stripeReady()).toBe(true);
    expect(await stripeStatus()).toMatchObject({ connected: true, source: "portal", mode: "live", keyHint: "…StUv", account: "Global Greenland", savedBy: "dima@example.com" });
  });

  it("tells a test key from a live one, and disconnects cleanly", async () => {
    stubStripe();
    await saveStripeKeys({ secretKey: TEST, webhookSecret: WHSEC }, "dima");
    expect((await stripeStatus()).mode).toBe("test");
    await clearStripeKeys();
    expect(await stripeReady()).toBe(false);
    expect((await stripeStatus()).connected).toBe(false);
  });

  it("falls back to the environment's keys, and the portal's win when both exist", async () => {
    process.env.STRIPE_SECRET_KEY = key("sk", "test").replace("51AbCdEfGhIjKlMnOpQrStUv", "FromTheEnvironment");
    process.env.STRIPE_WEBHOOK_SECRET = "whsec" + "_FromTheEnvironment";
    expect(await stripeKeys()).toEqual({ secretKey: process.env.STRIPE_SECRET_KEY, webhookSecret: process.env.STRIPE_WEBHOOK_SECRET });
    expect(await stripeStatus()).toMatchObject({ connected: true, source: "environment", mode: "test", keyHint: "…ment" });
    stubStripe();
    await saveStripeKeys({ secretKey: LIVE, webhookSecret: WHSEC }, "dima");
    expect((await stripeKeys())?.secretKey).toBe(LIVE);
    expect((await stripeStatus()).source).toBe("portal");
  });

  it("does not store keys when the server can't seal them, and says why", async () => {
    stubStripe();
    process.env.SETTINGS_SECRET = "";
    expect(await saveStripeKeys({ secretKey: LIVE, webhookSecret: WHSEC }, "dima")).toMatchObject({ ok: false, reason: expect.stringContaining("SETTINGS_SECRET") });
    expect((await stripeStatus()).canStore).toBe(false);
  });

  it("ignores stored keys that no longer open (SETTINGS_SECRET changed) instead of failing", async () => {
    stubStripe();
    await saveStripeKeys({ secretKey: LIVE, webhookSecret: WHSEC }, "dima");
    process.env.SETTINGS_SECRET = "a-different-secret-after-rotation";
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await stripeKeys()).toBeNull();
    expect((await stripeStatus()).connected).toBe(false);
    quiet.mockRestore();
  });
});
