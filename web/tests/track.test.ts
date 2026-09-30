import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { goToCheckout, purchaseItem, track } from "@/lib/track";

describe("conversion events", () => {
  let store: Record<string, string>;
  beforeEach(() => {
    store = {};
    (globalThis as Record<string, unknown>).window = globalThis;
    (globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } };
    (globalThis as Record<string, unknown>).dataLayer = [];
    delete (globalThis as Record<string, unknown>).__avocoNoTrack;
  });
  afterEach(() => { for (const k of ["window", "localStorage", "dataLayer", "__avocoNoTrack"]) delete (globalThis as Record<string, unknown>)[k]; });
  const layer = () => (globalThis as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;

  it("pushes an event once per id", () => {
    track("sign_up", { event_id: "signup_abc", method: "email" });
    track("sign_up", { event_id: "signup_abc", method: "email" });
    expect(layer()).toEqual([{ event: "sign_up", event_id: "signup_abc", method: "email" }]);
  });

  it("clears the previous ecommerce object before a purchase", () => {
    track("purchase", { event_id: "purchase_1", value: 9, currency: "USD", ecommerce: { transaction_id: "1" } });
    expect(layer()[0]).toEqual({ ecommerce: null });
    expect(layer()[1]).toMatchObject({ event: "purchase", value: 9, currency: "USD" });
  });

  it("stays silent in an admin's browser", () => {
    (globalThis as Record<string, unknown>).__avocoNoTrack = true;
    track("record_voice", { event_id: "record_1" });
    expect(layer()).toEqual([]);
  });

  it("announces a checkout before leaving for Stripe", async () => {
    const loc = { href: "https://www.avocousa.us/credits" };
    (globalThis as Record<string, unknown>).location = loc;
    goToCheckout("https://checkout.stripe.com/c/pay/cs_test_1", "credits");
    expect(layer()[0]).toMatchObject({ event: "begin_checkout", item: "credits" });
    expect(loc.href).toBe("https://www.avocousa.us/credits"); // not yet: the tags get a moment to send
    await new Promise((r) => setTimeout(r, 300));
    expect(loc.href).toBe("https://checkout.stripe.com/c/pay/cs_test_1");
    delete (globalThis as Record<string, unknown>).location;
  });

  it("names what was bought", () => {
    expect(purchaseItem({ pack: "one", credits: 1 })).toBe("report");
    expect(purchaseItem({ pack: "ten", credits: 10 })).toBe("credits_10");
    expect(purchaseItem({ pack: "one", credits: 1, recordingUrl: "https://x" })).toBe("report");
    expect(purchaseItem({ pack: "industry", credits: 1, unlockIndustry: "construction" })).toBe("career_fit");
    expect(purchaseItem({ pack: "best", credits: 2, unlockIndustry: "best" })).toBe("best_industry");
    expect(purchaseItem({ pack: "match", credits: 2, matchId: "m" })).toBe("relationship");
    expect(purchaseItem({ pack: "gift", credits: 0, giftId: "g" })).toBe("gift");
  });
});
