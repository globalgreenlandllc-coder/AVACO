/** POST { audioUrl, consent: true } — the partner's own recording through their private link. */
import { errorResponse, json } from "@/lib/api";
import { matchByToken, startPartnerRecording } from "@/lib/matches";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const match = await matchByToken((await ctx.params).token);
    if (!match) return json({ error: "not_found", message: "Not found" }, 404);
    const body = await req.json().catch(() => null);
    return json({ id: await startPartnerRecording(match, { audioUrl: body?.audioUrl, consent: body?.consent }) }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
