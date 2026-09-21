/**
 * POST /api/v1/analyses — analyse a recording and store the result.
 *   { "audio_url": "https://...", "type": "both" | "psytype" | "emostate", "channel": 0 | 1,
 *     "external_user_id": "...", "mode": "async" | "sync", "consent": true }
 *
 * GET /api/v1/analyses?external_user_id=&limit=20&cursor= — history, newest first.
 */
import { createAnalysis, callbackUrl, decodeCursor, listAnalyses, runJobsNow, submitJobs } from "@/lib/analyses";
import { downloadAudio, parseAudioUrl, parseChannel, parseType } from "@/lib/audio";
import { json, requireApiKey } from "@/lib/auth";
import { formatAnalysis } from "@/lib/format";
import { BadRequest, handleRouteError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 300; // sync mode waits for AVOCO; raise/lower to match your Vercel plan

const MAX_LIMIT = 100;

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  let analysisId: string | undefined;
  try {
    const body = await req.json().catch(() => { throw new BadRequest("Body must be JSON"); });
    if (typeof body !== "object" || body === null) throw new BadRequest("Body must be a JSON object");

    // The person recorded must have agreed to the analysis. Only a literal true counts.
    if (body.consent !== true) throw new BadRequest("'consent' must be true: the recorded person has to agree to the analysis");

    const audioUrl = parseAudioUrl(body.audio_url).toString();
    const type = parseType(body.type);
    const channel = parseChannel(body.channel);
    const mode = parseMode(body.mode);
    const externalUserId = parseExternalUserId(body.external_user_id);
    if (mode === "async") callbackUrl(); // fail before storing anything if the webhook isn't configured

    const audio = await downloadAudio(audioUrl);
    const { analysis, jobs } = await createAnalysis({ audioUrl, type, channel, externalUserId });
    analysisId = analysis.id;

    if (mode === "sync") return json(formatAnalysis(await runJobsNow(analysis.id, jobs, audio, channel)));

    await submitJobs(analysis.id, jobs, audio, channel);
    return json({ id: analysis.id, status: "processing" }, 202);
  } catch (err) {
    // If the row exists it is already marked failed; its id lets the caller look it up.
    return handleRouteError(err, analysisId ? { analysis_id: analysisId } : {});
  }
}

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const params = new URL(req.url).searchParams;
    const externalUserId = params.get("external_user_id") || undefined;

    const limit = Number(params.get("limit") ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new BadRequest(`'limit' must be an integer from 1 to ${MAX_LIMIT}`);

    const rawCursor = params.get("cursor");
    const cursor = rawCursor ? decodeCursor(rawCursor) : undefined;
    if (cursor === null) throw new BadRequest("'cursor' is not valid");

    const { page, nextCursor } = await listAnalyses({ externalUserId, limit, cursor });
    return json({ data: page.map(formatAnalysis), next_cursor: nextCursor });
  } catch (err) {
    return handleRouteError(err);
  }
}

function parseMode(v: unknown): "async" | "sync" {
  if (v === undefined || v === null || v === "") return "async";
  if (v !== "async" && v !== "sync") throw new BadRequest("'mode' must be async or sync");
  return v;
}

function parseExternalUserId(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string" || v.length > 200) throw new BadRequest("'external_user_id' must be a string of at most 200 characters");
  return v;
}
