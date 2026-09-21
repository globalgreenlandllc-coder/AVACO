/**
 * GET    /api/analyses/:id — the report page polls this while the analysis is processing.
 * DELETE /api/analyses/:id — deletes the report and its audio.
 * Both only ever touch an analysis that belongs to the signed-in user.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";

type Context = { params: Promise<{ id: string }> };
const notFound = () => json({ error: "not_found", message: "Report not found" }, 404);

export async function GET(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const analysis = await gateway.getAnalysisFor(user.userId, (await ctx.params).id);
    if (!analysis) return notFound();
    const { external_user_id: _owner, ...report } = analysis;
    return json(report);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const { id } = await ctx.params;
    if (!(await gateway.getAnalysisFor(user.userId, id))) return notFound();
    await gateway.deleteAnalysis(id);
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
