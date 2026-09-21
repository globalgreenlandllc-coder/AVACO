import { timingSafeEqual } from "node:crypto";

/**
 * Checks the platform API key. Keys never expire; revoke one by removing it
 * from PLATFORM_API_KEYS (comma-separated) and redeploying.
 * Send as:  Authorization: Bearer <key>   or   x-api-key: <key>
 */
export function requireApiKey(req: Request): Response | null {
  const keys = (process.env.PLATFORM_API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return json({ error: "server_misconfigured", message: "No API keys configured" }, 500);

  const header = req.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice(7).trim() : req.headers.get("x-api-key")?.trim();
  if (!provided) return json({ error: "unauthorized", message: "Missing API key" }, 401);

  const ok = keys.some((k) => safeEqual(k, provided));
  return ok ? null : json({ error: "unauthorized", message: "Invalid API key" }, 401);
}

/** Timing-safe string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Checks ?secret= on the AVOCO webhook. AVOCO callbacks are unsigned, so the secret
 * in the callback URL is the only thing that proves a callback is genuine.
 */
export function requireCallbackSecret(req: Request): Response | null {
  const expected = process.env.AVOCO_CALLBACK_SECRET;
  if (!expected) return json({ error: "server_misconfigured", message: "Callback secret is not configured" }, 500);
  const provided = new URL(req.url).searchParams.get("secret") ?? "";
  return safeEqual(expected, provided) ? null : json({ error: "unauthorized", message: "Invalid callback secret" }, 401);
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}
