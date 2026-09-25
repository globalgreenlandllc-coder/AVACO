/** POST { audioUrl, consent: true } — starts an analysis for the partner page. Nothing is charged. */
import { errorResponse, json } from "@/lib/api";
import { PartnerInvalid, startPartnerAnalysis } from "@/lib/partners";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = await startPartnerAnalysis({ audioUrl: body?.audioUrl, consent: body?.consent });
    return json({ id }, 202);
  } catch (err) {
    if (err instanceof PartnerInvalid) return json({ error: "bad_request", message: err.message }, 400);
    return errorResponse(err);
  }
}
