/** POST /api/analyses { audioUrl, consent: true } — starts an analysis for the signed-in user. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, balance, noteSelfRecording, previewsLeft } from "@/lib/billing";
import { gateway } from "@/lib/gateway";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const body = await req.json().catch(() => null);
    // The checkbox on the recording page. Without it nothing is sent for analysis.
    if (body?.consent !== true) return json({ error: "bad_request", message: "Consent is required" }, 400);
    if (typeof body.audioUrl !== "string") return json({ error: "bad_request", message: "audioUrl is required" }, 400);

    // Every recording costs an AVOCO analysis. With billing on, someone who has used their free previews needs a credit to record again.
    if ((await previewsLeft(user.userId)) < 1 && (await balance(asUser(user.userId))) < 1) return json({ error: "payment_required", message: "No free previews left" }, 402);

    const created = await gateway.createAnalysis({ audioUrl: body.audioUrl, owner: user.userId });
    await noteSelfRecording(user.userId, created.id);
    return json({ id: created.id }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
