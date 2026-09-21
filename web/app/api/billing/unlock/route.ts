/** POST { analysisId } — spends one of the signed-in person's credits to open their own report. 402 when they have none. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { unlock } from "@/lib/billing";
import { gateway } from "@/lib/gateway";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    // Only their own report: the gateway check is what ties an analysis to a person.
    const analysis = typeof body?.analysisId === "string" ? await gateway.getAnalysisFor(user.userId, body.analysisId) : null;
    if (!analysis) return json({ error: "not_found", message: "Report not found" }, 404);
    await unlock(user.userId, analysis.id);
    return json({ unlocked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
