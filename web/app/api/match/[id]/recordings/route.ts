/** POST { audioUrl, consent: true, extraConsent: true } — the orderer uploads a recording of their partner, attesting the partner agreed. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { matchFor, startPartnerRecording } from "@/lib/matches";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const match = await matchFor(user.userId, (await ctx.params).id);
    if (!match) return json({ error: "not_found", message: "Not found" }, 404);
    const body = await req.json().catch(() => null);
    if (body?.extraConsent !== true) return json({ error: "bad_request", message: "The partner's agreement must be confirmed" }, 400);
    return json({ id: await startPartnerRecording(match, { audioUrl: body?.audioUrl, consent: body?.consent }) }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
