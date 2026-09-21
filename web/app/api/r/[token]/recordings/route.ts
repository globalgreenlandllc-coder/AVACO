/** POST { audioUrl, consent: true, extraConsent? } — a participant's recording, through their private link. */
import { errorResponse, json } from "@/lib/api";
import { isPreset, PRESET_RULES } from "@/lib/presets";
import { addRecording, participantByToken } from "@/lib/workspaces";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const found = await participantByToken((await ctx.params).token);
    if (!found) return json({ error: "not_found", message: "Not found" }, 404);

    const body = await req.json().catch(() => null);
    const rules = PRESET_RULES[isPreset(found.ws.industry) ? found.ws.industry : "general"];
    if (rules.minorsConsent && body?.extraConsent !== true) return json({ error: "bad_request", message: "Age or guardian consent is required" }, 400);

    const recording = await addRecording(found.participant, found.ws.id, { audioUrl: body?.audioUrl, consent: body?.consent });
    return json({ id: recording.analysisId }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
