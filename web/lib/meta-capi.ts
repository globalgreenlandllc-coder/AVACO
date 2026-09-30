/**
 * Meta's Conversions API: the steps the pixel reports (lib/meta-pixel.ts), sent again by our server, so they still count
 * when a browser blocks the pixel or an iPhone limits it. The pixel's rules apply: the main site only, advertising
 * allowed (lib/consent.ts), never an admin; and the same event id as the browser, so Meta counts each step once. It
 * sends only what the pixel itself sends about the browser (its address, its user agent, Meta's own _fbp and _fbc
 * cookies): never an email, a name, a recording or a result. Needs META_CAPI_TOKEN; without it nothing is sent.
 * Server only.
 */
import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { isAdminUser } from "./admin";
import { CONSENT_COOKIE, consentFor, parseConsent } from "./consent";
import { META_PIXEL_ID } from "./meta-pixel";
import { isPartnerHost } from "./partners";
import { isOpenHost } from "./visitor";

/** Graph API v25.0: supported by Meta until July 2028. */
const ENDPOINT = "https://graph.facebook.com/v25.0";

export interface CapiEvent { name: string; id: string; custom?: Record<string, unknown> }
export interface CapiBrowser { ip: string | null; userAgent: string | null; fbp: string | null; fbc: string | null; url: string | null }
export interface CapiResult { ok: boolean; received: number | null; message: string }

export const capiToken = () => process.env.META_CAPI_TOKEN?.trim() || null;
export const pixelId = () => process.env.NEXT_PUBLIC_META_PIXEL_ID || META_PIXEL_ID;

/** The browser's event id for a new account (lib/track.ts hashId): the first 8 bytes of SHA-256("avoco:" + id), in hex. */
export const signupEventId = (userId: string) => `signup_${createHash("sha256").update(`avoco:${userId}`).digest("hex").slice(0, 16)}`;

/** This request's browser as Meta may hear of it, or null: no token, a test host, advertising refused, or an admin. */
export async function capiBrowser(userId?: string | null, opts: { admin?: boolean } = {}): Promise<CapiBrowser | null> {
  if (!capiToken()) return null;
  const [h, jar, partner, open] = await Promise.all([headers(), cookies(), isPartnerHost(), isOpenHost()]);
  if (partner || open) return null;
  const { consent } = consentFor({ saved: parseConsent(jar.get(CONSENT_COOKIE)?.value), country: h.get("x-vercel-ip-country"), gpc: h.get("sec-gpc") === "1" });
  if (!consent.ads && !opts.admin) return null;
  if (!opts.admin && userId?.startsWith("user_") && (await isAdminUser(userId))) return null;
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null,
    userAgent: h.get("user-agent"),
    fbp: jar.get("_fbp")?.value ?? null,
    fbc: jar.get("_fbc")?.value ?? null,
    url: h.get("referer"),
  };
}

const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));

/** The request Meta receives for one event: exported for the tests. */
export function capiPayload(e: CapiEvent, b: CapiBrowser, now = Date.now()): Record<string, unknown> {
  return defined({
    event_name: e.name,
    event_time: Math.floor(now / 1000),
    event_id: e.id,
    action_source: "website",
    event_source_url: b.url,
    user_data: defined({ client_ip_address: b.ip, client_user_agent: b.userAgent, fbp: b.fbp, fbc: b.fbc }),
    custom_data: e.custom ? defined(e.custom) : undefined,
  });
}

/** Sends one event now. `testCode` (Events Manager → Test events) keeps it out of the real numbers. */
export async function sendCapiEvent(e: CapiEvent, b: CapiBrowser, testCode?: string | null): Promise<CapiResult> {
  const token = capiToken();
  if (!token) return { ok: false, received: null, message: "META_CAPI_TOKEN is not set on the server." };
  try {
    const res = await fetch(`${ENDPOINT}/${pixelId()}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: [capiPayload(e, b)], access_token: token, ...(testCode ? { test_event_code: testCode } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await res.json().catch(() => null) as { events_received?: number; error?: { message?: string } } | null;
    if (!res.ok) {
      console.error("Meta Conversions API refused an event", e.name, res.status, body?.error?.message);
      return { ok: false, received: null, message: body?.error?.message ?? `Meta answered ${res.status}` };
    }
    return { ok: true, received: body?.events_received ?? null, message: "Received by Meta" };
  } catch (err) {
    console.error("Meta Conversions API unreachable", e.name, err);
    return { ok: false, received: null, message: "Meta could not be reached" };
  }
}

/** The Avoco ad account the pixel is meant to be connected to (Business settings → Data sources → Datasets). */
export const AD_ACCOUNT_ID = "1617058886555636";

export interface PixelStatus {
  /** ok false with `readable` false: the token may send events but Meta won't let it read the pixel's details. */
  ok: boolean; message: string; readable?: boolean;
  name?: string; lastFired?: string | null; automaticMatching?: boolean | null; business?: string | null;
  /** The ad accounts the pixel is shared with; null when Meta wouldn't say (the token's permissions). */
  accounts?: Array<{ id: string; name: string }> | null;
  /** Events Meta received in the last 24 hours, by name; null when Meta wouldn't say. */
  events?: Array<{ event: string; count: number }> | null;
}

/** GET on Meta's Graph API with the server's token; the token goes in a header, never in the address. */
async function graph<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = capiToken();
  if (!token) return { ok: false, message: "META_CAPI_TOKEN is not set on the server." };
  try {
    const res = await fetch(`${ENDPOINT}/${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    const body = await res.json().catch(() => null) as (T & { error?: { message?: string } }) | null;
    if (!res.ok || !body) return { ok: false, message: body?.error?.message ?? `Meta answered ${res.status}` };
    return { ok: true, data: body };
  } catch {
    return { ok: false, message: "Meta could not be reached" };
  }
}

/**
 * What Meta itself says about the pixel, for Admin → Settings: whether events are arriving, the ad accounts it is
 * connected to, and whether automatic advanced matching is on. Each part is best effort: a token that may read the
 * pixel but not its sharing still shows the rest.
 */
export async function pixelStatus(now = Date.now()): Promise<PixelStatus> {
  const id = pixelId();
  // One detail per request: Meta refuses a whole request over one field the token may not read.
  const [basic, matching, owner] = await Promise.all([
    graph<{ name?: string; last_fired_time?: string }>(`${id}?fields=name,last_fired_time`),
    graph<{ enable_automatic_matching?: boolean }>(`${id}?fields=enable_automatic_matching`),
    graph<{ owner_business?: { id: string; name?: string } }>(`${id}?fields=owner_business{id,name}`),
  ]);
  if (!basic.ok) {
    const permission = /permission|\(#10\)|\(#100\)|\(#200\)/i.test(basic.message);
    return permission
      ? { ok: false, readable: false, message: "Meta lets this token send events, not read the pixel's details. Sending is what counts; the events show in Events Manager → Overview." }
      : { ok: false, message: basic.message };
  }
  const p = { ...basic.data, ...(matching.ok ? matching.data : {}), ...(owner.ok ? owner.data : {}) };
  const since = Math.floor((now - 24 * 3600_000) / 1000);
  const [shared, byAccount, stats] = await Promise.all([
    p.owner_business?.id ? graph<{ data?: Array<{ id: string; account_id?: string; name?: string }> }>(`${id}/shared_accounts?business=${p.owner_business.id}&fields=account_id,name`) : Promise.resolve(null),
    graph<{ data?: Array<{ id: string }> }>(`act_${AD_ACCOUNT_ID}/adspixels?fields=id`),
    graph<{ data?: Array<{ data?: Array<{ value: string; count: number }> }> }>(`${id}/stats?aggregation=event&start_time=${since}`),
  ]);
  let accounts: PixelStatus["accounts"] = null;
  if (shared?.ok) accounts = (shared.data.data ?? []).map((a) => ({ id: a.account_id ?? a.id.replace(/^act_/, ""), name: a.name ?? "" }));
  if (byAccount.ok && (byAccount.data.data ?? []).some((x) => x.id === id) && !accounts?.some((a) => a.id === AD_ACCOUNT_ID)) accounts = [...(accounts ?? []), { id: AD_ACCOUNT_ID, name: "Avoco" }];
  if (!shared?.ok && !byAccount.ok) accounts = null;
  let events: PixelStatus["events"] = null;
  if (stats.ok) {
    const by = new Map<string, number>();
    for (const hour of stats.data.data ?? []) for (const e of hour.data ?? []) by.set(e.value, (by.get(e.value) ?? 0) + (Number(e.count) || 0));
    events = [...by].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count);
  }
  return {
    ok: true, message: "Meta answered",
    name: p.name, lastFired: p.last_fired_time ?? null, automaticMatching: p.enable_automatic_matching ?? null,
    business: p.owner_business?.name ?? null, accounts, events,
  };
}

/**
 * Reports a step from inside a request: the browser is read now, and the event goes after the response, so a page or
 * an API answer never waits for Meta.
 */
export async function reportToMeta(e: CapiEvent, userId?: string | null): Promise<void> {
  const browser = await capiBrowser(userId).catch(() => null);
  if (!browser) return;
  after(async () => { await sendCapiEvent(e, browser); });
}
