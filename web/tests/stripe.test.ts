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

/** A webhook secret Stripe would hand back on creation; assembled at run time like the keys. */
const GENERATED = "whsec" + "_GeneratedByStripe0123456789";

/**
 * Pretends to be Stripe: /v1/account accepts the keys above and refuses anything else; /v1/webhook_endpoints
 * lists, creates (returning the secret once) and deletes endpoints. `endpoints` starts with what already exists.
 */
function stubStripe(endpoints: Array<{ id: string; url: string }> = []) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push(`${method} ${String(url)}`);
    const key = String((init?.headers as Record<string, string>)?.Authorization ?? "").replace("Bearer ", "");
    if (key !== LIVE && key !== TEST) return new Response(JSON.stringify({ error: { message: "Invalid API Key provided" } }), { status: 401 });
    const u = String(url);
    if (u.endsWith("/v1/account")) return new Response(JSON.stringify({ id: "acct_1", settings: { dashboard: { display_name: "Global Greenland" } } }), { status: 200 });
    if (u.includes("/v1/webhook_endpoints")) {
      if (method === "GET") return new Response(JSON.stringify({ data: endpoints }), { status: 200 });
      if (method === "DELETE") { const id = u.split("/").pop()!; endpoints.splice(endpoints.findIndex((e) => e.id === id), 1); return new Response(JSON.stringify({ id, deleted: true }), { status: 200 }); }
      const form = new URLSearchParams(String(init?.body));
      const ep = { id: `we_${endpoints.length + 1}`, url: form.get("url")!, events: form.getAll("enabled_events[0]") };
      endpoints.push(ep);
      return new Response(JSON.stringify({ ...ep, secret: GENERATED }), { status: 200 });
    }
    return new Response("not found", { status: 404 });
  }));
  return { calls, endpoints };
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
    const { calls } = stubStripe();
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
    const { calls } = stubStripe();
    expect(await saveStripeKeys({ secretKey: ` ${LIVE} `, webhookSecret: WHSEC }, "dima@example.com")).toEqual({ ok: true, account: "Global Greenland", registered: false });
    expect(calls).toEqual(["GET https://api.stripe.com/v1/account"]); // a pasted webhook secret means nothing to register

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

describe("registering the webhook for the admin", () => {
  const URL = "https://www.avocousa.us/api/stripe/webhook";

  it("creates the endpoint in Stripe with only the secret key, and keeps the secret Stripe returned", async () => {
    const { calls, endpoints } = stubStripe();
    expect(await saveStripeKeys({ secretKey: LIVE, webhookSecret: "", webhookUrl: URL }, "dima")).toEqual({ ok: true, account: "Global Greenland", registered: true });
    expect(endpoints).toEqual([{ id: "we_1", url: URL, events: ["checkout.session.completed"] }]);
    expect(calls).toEqual(["GET https://api.stripe.com/v1/account", "GET https://api.stripe.com/v1/webhook_endpoints?limit=100", "POST https://api.stripe.com/v1/webhook_endpoints"]);
    expect(await stripeKeys()).toEqual({ secretKey: LIVE, webhookSecret: GENERATED });
    expect((await stripeStatus()).webhookUrl).toBe(URL);
  });

  it("replaces an earlier endpoint at the same URL, whose secret Stripe would never show again", async () => {
    const { endpoints } = stubStripe([{ id: "we_old", url: URL }, { id: "we_other", url: "https://example.com/hook" }]);
    expect((await saveStripeKeys({ secretKey: TEST, webhookUrl: URL }, "dima")).ok).toBe(true);
    expect(endpoints.map((e) => e.url)).toEqual(["https://example.com/hook", URL]); // ours replaced, the unrelated one untouched
    expect(endpoints.some((e) => e.id === "we_old")).toBe(false);
  });

  it("removes the endpoint it registered when Stripe is disconnected", async () => {
    const { calls, endpoints } = stubStripe();
    await saveStripeKeys({ secretKey: LIVE, webhookUrl: URL }, "dima");
    await clearStripeKeys();
    expect(endpoints).toEqual([]);
    expect(calls.at(-1)).toBe("DELETE https://api.stripe.com/v1/webhook_endpoints/we_1");
    expect(await stripeReady()).toBe(false);
  });

  it("explains what to do when Stripe refuses to create the endpoint, and stores nothing", async () => {
    stubStripe();
    const restricted = key("rk", "live");
    expect((await saveStripeKeys({ secretKey: restricted, webhookUrl: URL }, "dima")).ok).toBe(false); // the stub only knows sk_ keys → 401 on /v1/account
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/v1/account")) return new Response(JSON.stringify({ id: "acct_1" }), { status: 200 });
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify({ data: [] }), { status: 200 });
      return new Response(JSON.stringify({ error: { message: "This API key does not have permission to create webhook endpoints" } }), { status: 403 });
    }));
    const result = await saveStripeKeys({ secretKey: LIVE, webhookUrl: URL }, "dima");
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("does not have permission") });
    expect((result as { reason: string }).reason).toContain("Developers → Webhooks");
    expect(await stripeReady()).toBe(false);
  });
});
