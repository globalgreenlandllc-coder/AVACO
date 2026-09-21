/**
 * POST /api/v1/analyze
 *
 * Option A — JSON (for files up to 10 MB, uploaded to Blob/S3 first):
 *   { "audio_url": "https://...", "type": "both" | "psytype" | "emostate", "channel": 0 | 1 }
 *
 * Option B — multipart/form-data (small files, under ~4.5 MB on Vercel):
 *   file=<audio>, type=both, channel=0
 */
import { downloadAudio, MAX_AUDIO_BYTES, parseChannel, parseType } from "@/lib/audio";
import { avoco, type AudioInput, type Channel } from "@/lib/avoco";
import { json, requireApiKey } from "@/lib/auth";
import type { AnalysisType } from "@/lib/db/schema";
import { formatEmostate, formatPsytype } from "@/lib/format";
import { BadRequest, handleRouteError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 300; // raise/lower to match your Vercel plan

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const { audio, type, channel } = await parseRequest(req);
    const client = avoco();
    const started = Date.now();

    const [psy, emo] = await Promise.all([
      type !== "emostate" ? client.analyze("psytype", audio, channel) : null,
      type !== "psytype" ? client.analyze("emostate", audio, channel) : null,
    ]);

    return json({
      type,
      psytype: psy ? formatPsytype(psy) : undefined,
      emostate: emo ? formatEmostate(emo) : undefined,
      duration_ms: Date.now() - started,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

async function parseRequest(req: Request): Promise<{ audio: AudioInput; type: AnalysisType; channel?: Channel }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new BadRequest("Field 'file' is required");
    if (file.size > MAX_AUDIO_BYTES) throw new BadRequest("File exceeds 10 MB");
    return {
      audio: { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name || "audio" },
      type: parseType(form.get("type")),
      channel: parseChannel(form.get("channel")),
    };
  }

  const body = await req.json().catch(() => { throw new BadRequest("Body must be JSON or multipart/form-data"); });
  return {
    audio: await downloadAudio(body.audio_url),
    type: parseType(body.type),
    channel: parseChannel(body.channel),
  };
}
