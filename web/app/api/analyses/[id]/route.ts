/**
 * GET    /api/analyses/:id — the report page polls this while the analysis is processing.
 * DELETE /api/analyses/:id — deletes the report and its audio.
 * Both only ever touch an analysis that belongs to the signed-in user.
 */
import { errorResponse, json, previewReport, publicReport, requireUser } from "@/lib/api";
import { forgetReport, hasFullAccess } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { stillProcessing } from "@/lib/gateway-db";
import { forgetPeople } from "@/lib/people";
import { profileFor } from "@/lib/profile";

type Context = { params: Promise<{ id: string }> };
const notFound = () => json({ error: "not_found", message: "Report not found" }, 404);

export async function GET(req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const { id } = await ctx.params;
    // The report page's poll while AVOCO works (?wait=1): "still processing" comes from the shared database in one query,
    // not from a call to the gateway that reads the same row. Anything else goes the full way (lib/gateway-db.ts says why).
    if (new URL(req.url).searchParams.has("wait") && (await stillProcessing(user.userId, id))) return json({ id, status: "processing", pending: true });
    const single = await gateway.getAnalysisFor(user.userId, id);
    if (!single) return notFound();
    const analysis = { ...single, psytype: (await profileFor(user.userId, single)).psytype }; // the same profile the page shows
    return json((await hasFullAccess(user.userId, analysis.id)) ? publicReport(analysis) : previewReport(analysis));
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
    await forgetReport(id);
    await forgetPeople([id]).catch((err) => console.error("Could not remove the report's name", err));
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
