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

/**
 * Reports a step from inside a request: the browser is read now, and the event goes after the response, so a page or
 * an API answer never waits for Meta.
 */
export async function reportToMeta(e: CapiEvent, userId?: string | null): Promise<void> {
  const browser = await capiBrowser(userId).catch(() => null);
  if (!browser) return;
  after(async () => { await sendCapiEvent(e, browser); });
}
