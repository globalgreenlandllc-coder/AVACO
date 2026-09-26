/** POST { analysisId, industry } — spends one credit to open an industry chapter on the signed-in person's own report. 402 when they have none. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { hasFullAccess, unlockIndustry } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { isIndustry } from "@/lib/industries";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    if (!isIndustry(body?.industry)) return json({ error: "bad_request", message: "Unknown industry" }, 400);
    const analysis = typeof body?.analysisId === "string" ? await gateway.getAnalysisFor(user.userId, body.analysisId) : null;
    if (!analysis) return json({ error: "not_found", message: "Report not found" }, 404);
    // The industry chapter builds on the full report, so the report must be open first.
    if (!(await hasFullAccess(user.userId, analysis.id))) return json({ error: "payment_required", message: "Open the full report first" }, 402);
    await unlockIndustry(user.userId, analysis.id, body.industry);
    return json({ unlocked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
