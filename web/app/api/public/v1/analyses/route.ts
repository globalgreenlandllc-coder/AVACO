/**
 * Company API. POST multipart/form-data: file=<audio, up to 4 MB>, name=<who it is>, consent=true
 * -> 202 {"id","status":"processing"}. Poll GET /api/public/v1/analyses/:id for the result.
 * Auth: Authorization: Bearer avk_… (a workspace API key).
 */
import { errorResponse, json } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { workspaceFromRequest } from "@/lib/public-api";
import { addApiRecording } from "@/lib/workspaces";

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024; // Vercel's request body limit is about 4.5 MB

export async function POST(req: Request) {
  try {
    const ws = await workspaceFromRequest(req);
    if (!ws) return json({ error: "unauthorized", message: "Missing or invalid API key" }, 401);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return json({ error: "bad_request", message: "Field 'file' is required (multipart/form-data)" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "bad_request", message: "File exceeds 4 MB. Send 16 kHz mono WAV, or a compressed format such as m4a or mp3" }, 400);
    if (form!.get("consent") !== "true") return json({ error: "bad_request", message: "Field 'consent' must be true: the recorded person has to agree to the analysis" }, 400);

    // Refuse before storing anything: a recording without consent must not leave a file behind.
    const audioUrl = await gateway.storeAudio(file);
    const { analysisId } = await addApiRecording(ws, { name: form!.get("name") || file.name || "API recording", audioUrl, consent: true });
    return json({ id: analysisId, status: "processing" }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
