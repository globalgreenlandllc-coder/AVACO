/**
 * POST /api/v1/uploads — Vercel Blob client-upload token handler.
 * The uploader asks here for a short-lived token, then sends the file straight to Blob,
 * which is how recordings up to 10 MB get past Vercel's ~4.5 MB request body limit.
 * Use it with upload() from "@vercel/blob/client":
 *   upload(name, file, { access: "public", handleUploadUrl: ".../api/v1/uploads", headers: { "x-api-key": KEY } })
 */
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_AUDIO_BYTES } from "@/lib/audio";
import { json, requireApiKey } from "@/lib/auth";
import { BadRequest, handleRouteError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  try {
    const body = (await req.json().catch(() => { throw new BadRequest("Body must be JSON"); })) as HandleUploadBody;
    if (body?.type !== "blob.generate-client-token") throw new BadRequest("Unsupported upload event");

    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*"],
        maximumSizeInBytes: MAX_AUDIO_BYTES,
        addRandomSuffix: true, // unguessable URLs, and two recordings with one name never collide
      }),
    });
    return json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
