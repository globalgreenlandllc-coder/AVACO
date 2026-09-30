import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// The request as the server sees it: headers and cookies, replaced per test.
const request = vi.hoisted(() => ({ headers: new Headers(), cookies: new Map<string, string>(), admin: false, partner: false, open: false }));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({ get: (name: string) => (request.cookies.has(name) ? { value: request.cookies.get(name) } : undefined) }),
}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("@/lib/admin", () => ({ isAdminUser: async () => request.admin }));
vi.mock("@/lib/partners", () => ({ isPartnerHost: async () => request.partner }));
vi.mock("@/lib/visitor", () => ({ isOpenHost: async () => request.open }));

import { capiBrowser, capiPayload, reportToMeta, sendCapiEvent, signupEventId } from "@/lib/meta-capi";
import { hashId } from "@/lib/track";

const browser = { ip: "203.0.113.7", userAgent: "Mozilla/5.0 (iPhone)", fbp: "fb.1.1700000000000.123", fbc: null, url: "https://www.avocousa.us/record" };

beforeEach(() => {
  vi.stubEnv("META_CAPI_TOKEN", "test-token");
  request.headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Mozilla/5.0 (iPhone)", "x-vercel-ip-country": "US", referer: "https://www.avocousa.us/record" });
  request.cookies = new Map([["_fbp", "fb.1.1700000000000.123"]]);
  request.admin = false; request.partner = false; request.open = false;
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Meta's Conversions API", () => {
  it("uses the browser's own event id for a new account, so Meta counts the sign-up once", async () => {
    expect(signupEventId("user_3JeSNeA4U4")).toBe(`signup_${await hashId("user_3JeSNeA4U4")}`);
  });

  it("sends what the pixel sends about the browser, and nothing empty", () => {
    const body = capiPayload({ name: "Purchase", id: "purchase_1", custom: { value: 9, currency: "USD", content_name: undefined } }, browser, 1_790_000_000_500);
    expect(body).toEqual({
      event_name: "Purchase", event_time: 1_790_000_000, event_id: "purchase_1", action_source: "website", event_source_url: "https://www.avocousa.us/record",
      user_data: { client_ip_address: "203.0.113.7", client_user_agent: "Mozilla/5.0 (iPhone)", fbp: "fb.1.1700000000000.123" },
      custom_data: { value: 9, currency: "USD" },
    });
  });

  it("reads the browser only where the pixel would run", async () => {
    expect(await capiBrowser("user_1")).toMatchObject({ ip: "203.0.113.7", fbp: "fb.1.1700000000000.123", url: "https://www.avocousa.us/record" });
    request.headers.set("sec-gpc", "1");
    expect(await capiBrowser("user_1")).toBeNull(); // Global Privacy Control refuses advertising
    request.headers.delete("sec-gpc");
    request.cookies.set("avoco_consent", "a1.m0");
    expect(await capiBrowser("user_1")).toBeNull(); // advertising turned off in the privacy choices
    request.cookies.delete("avoco_consent");
    request.headers.set("x-vercel-ip-country", "DE");
    expect(await capiBrowser("user_1")).toBeNull(); // the EEA asks first
    request.headers.set("x-vercel-ip-country", "US");
    request.admin = true;
    expect(await capiBrowser("user_1")).toBeNull(); // never an admin's browser…
    expect(await capiBrowser("user_1", { admin: true })).not.toBeNull(); // …except for the admin's own test event
    request.admin = false; request.partner = true;
    expect(await capiBrowser("user_1")).toBeNull(); // not on the test hosts
    request.partner = false;
    vi.stubEnv("META_CAPI_TOKEN", "");
    expect(await capiBrowser("user_1")).toBeNull(); // nothing without the token
  });

  it("posts to the pixel's events with the token, a test code when given, and says what Meta answered", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ events_received: 1, fbtrace_id: "x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await sendCapiEvent({ name: "PageView", id: "test_1" }, browser, "TEST123")).toEqual({ ok: true, received: 1, message: "Received by Meta" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v25.0/1558938122217068/events");
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({ access_token: "test-token", test_event_code: "TEST123", data: [{ event_name: "PageView", event_id: "test_1" }] });

    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid OAuth access token" } }), { status: 400 }));
    expect(await sendCapiEvent({ name: "PageView", id: "test_2" }, browser)).toMatchObject({ ok: false, message: "Invalid OAuth access token" });
  });

  it("reports a step after the response, and stays quiet where it mustn't", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await reportToMeta({ name: "RecordVoice", id: "record_1" }, "user_1");
    expect(fetch).toHaveBeenCalledTimes(1);
    request.headers.set("sec-gpc", "1");
    await reportToMeta({ name: "RecordVoice", id: "record_2" }, "user_1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
