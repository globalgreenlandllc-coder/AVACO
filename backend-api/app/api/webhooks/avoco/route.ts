/**
 * POST /api/webhooks/avoco?secret=... — AVOCO posts async results here:
 *   {"id","psy_types":[...]}  or  {"id","emo_scales":[...]}
 * No API key: AVOCO can't send one, and its callbacks are unsigned, so the secret in the URL
 * is the check. Idempotent — a repeated callback changes nothing.
 */
import { recordJobResult } from "@/lib/analyses";
import { json, requireCallbackSecret } from "@/lib/auth";
import { BadRequest, handleRouteError, isUuid, notFound } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireCallbackSecret(req);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => { throw new BadRequest("Body must be JSON"); });
    const id: unknown = body?.id;
    if (typeof id !== "string") throw new BadRequest("Field 'id' is required");
    if (!isUuid(id)) return notFound("Unknown job id");

    const outcome = await recordJobResult(id, body);
    if (outcome === "unknown_job") return notFound("Unknown job id");
    return json({ ok: true, duplicate: outcome === "duplicate" });
  } catch (err) {
    return handleRouteError(err);
  }
}
