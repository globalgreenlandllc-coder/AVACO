/** POST /api/analyses { audioUrl, consent: true } — starts an analysis for the signed-in user. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const body = await req.json().catch(() => null);
    // The checkbox on the recording page. Without it nothing is sent for analysis.
    if (body?.consent !== true) return json({ error: "bad_request", message: "Consent is required" }, 400);
    if (typeof body.audioUrl !== "string") return json({ error: "bad_request", message: "audioUrl is required" }, 400);

    const created = await gateway.createAnalysis({ audioUrl: body.audioUrl, owner: user.userId });
    return json({ id: created.id }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
