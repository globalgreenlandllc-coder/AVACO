/**
 * POST /api/v1/audio — multipart/form-data, field "file": stores a small audio file (up to 4 MB) in Blob
 * and returns its URL, ready to be used as audio_url in POST /api/v1/analyses.
 * For server-to-server use, where the browser client-upload flow (/api/v1/uploads) doesn't apply.
 */
import { put } from "@vercel/blob";
import { json, requireApiKey } from "@/lib/auth";
import { BadRequest, handleRouteError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is about 4.5 MB
const EXTENSIONS = ["wav", "mp3", "ogg", "m4a", "opus", "mp4", "webm"];

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const form = await req.formData().catch(() => { throw new BadRequest("Body must be multipart/form-data"); });
    const file = form.get("file");
    if (!(file instanceof File)) throw new BadRequest("Field 'file' is required");
    if (file.size === 0) throw new BadRequest("File is empty");
    if (file.size > MAX_BYTES) throw new BadRequest("File exceeds 4 MB");

    const extension = (file.name.split(".").pop() ?? "").toLowerCase();
    const isAudio = file.type.startsWith("audio/") || EXTENSIONS.includes(extension);
    if (!isAudio) throw new BadRequest("File must be audio: wav, mp3, ogg, m4a or opus");

    const stored = await put(`audio-${Date.now()}.${EXTENSIONS.includes(extension) ? extension : "wav"}`, file, { access: "public", addRandomSuffix: true, contentType: file.type || undefined });
    return json({ url: stored.url }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
