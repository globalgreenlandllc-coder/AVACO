import "server-only";
import { visitorId } from "./visitor";
import { GatewayError, type Analysis } from "./gateway";
import { BadCode, NoCredits } from "./billing";
import { Forbidden, Invalid, LimitReached, NotFound } from "./workspaces";

export const json = (body: unknown, status = 200) => Response.json(body, { status });

/** The signed-in user's id (or the cookie visitor on an open host, see lib/visitor.ts), or a 401 response. */
export async function requireUser(): Promise<{ userId: string } | { denied: Response }> {
  const userId = await visitorId();
  return userId ? { userId } : { denied: json({ error: "unauthorized", message: "Sign in first" }, 401) };
}

/** Passes the gateway's error code and status through; anything else is a plain 500. */
export function errorResponse(err: unknown): Response {
  if (err instanceof Invalid) return json({ error: "bad_request", message: err.message }, 400);
  if (err instanceof Forbidden || err instanceof NotFound) return json({ error: "not_found", message: "Not found" }, 404); // never confirm that something exists
  if (err instanceof NoCredits) return json({ error: "payment_required", message: "No credits left" }, 402);
  if (err instanceof BadCode) return json({ error: "bad_request", message: err.message }, 400);
  if (err instanceof LimitReached) return json({ error: "limit_reached", message: err.message }, 429);
  if (err instanceof GatewayError) {
    if (err.status >= 500) console.error("Gateway error", err.status, err.code, err.message);
    // A gateway 401 means OUR key is wrong, which is not the visitor's problem to fix.
    const status = err.status === 401 ? 502 : err.status;
    return json({ error: status === 502 ? "upstream_error" : err.code, message: status === 502 ? "Service unavailable" : err.message }, status);
  }
  console.error(err);
  return json({ error: "internal_error", message: "Unexpected error" }, 500);
}

/** What leaves the server for a report: never the gateway's owner id, and no emotions where a workspace hides them. */
export function publicReport(analysis: Analysis, hideEmotions = false) {
  const { external_user_id: _owner, ...report } = analysis;
  return hideEmotions ? { ...report, emostate: null } : report;
}

/** A preview carries the type scores (the cover and the voice signature) and nothing else that is being sold. */
export function previewReport(analysis: Analysis) {
  return { ...publicReport(analysis, true), locked: true as const };
}
