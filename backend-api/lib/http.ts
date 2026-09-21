/** Error responses. Every error is JSON: {"error":"<code>","message":"..."} */
import { AvocoApiError } from "./avoco";
import { json } from "./auth";

export class BadRequest extends Error {}
export class Misconfigured extends Error {}

export type ErrorCode = "bad_request" | "unauthorized" | "not_found" | "analysis_failed" | "upstream_error";

export function errorJson(code: ErrorCode, message: string, status: number, extra: Record<string, unknown> = {}) {
  return json({ error: code, message, ...extra }, status);
}

export const notFound = (message = "Analysis not found") => errorJson("not_found", message, 404);

/**
 * How an AVOCO failure is reported to our caller. A 4xx other than 401 means AVOCO rejected
 * the audio (usually too short or the wrong format); anything else means AVOCO itself is down
 * or unreachable. The upstream body is only ever logged, never returned whole.
 */
export function describeAvocoError(err: AvocoApiError): { code: ErrorCode; status: number; message: string } {
  const rejected = err.status >= 400 && err.status < 500 && err.status !== 401;
  return rejected
    ? { code: "analysis_failed", status: 422, message: safeUpstreamMessage(err.body) }
    : { code: "upstream_error", status: 502, message: "AVOCO is unavailable, try again later" };
}

/** Catch-all for route handlers. Logs server-side; never leaks tokens or stack traces. */
export function handleRouteError(err: unknown, extra: Record<string, unknown> = {}): Response {
  if (err instanceof BadRequest) return errorJson("bad_request", err.message, 400);
  if (err instanceof AvocoApiError) {
    console.error("AVOCO error", err.status, err.message, err.body.slice(0, 1000));
    const { code, status, message } = describeAvocoError(err);
    return errorJson(code, message, status, { upstream_status: err.status || undefined, ...extra });
  }
  if (err instanceof Misconfigured) {
    console.error(err.message);
    return json({ error: "server_misconfigured", message: err.message }, 500);
  }
  console.error(err);
  return json({ error: "internal_error", message: "Unexpected error" }, 500);
}

function safeUpstreamMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const detail = parsed.detail ?? parsed.message ?? parsed.error ?? "Analysis failed";
    return (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300);
  } catch {
    return body.slice(0, 300) || "Analysis failed";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
