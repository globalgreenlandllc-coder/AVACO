/** GET ?a=<analysisId> — a member's view of one of a person's reports (polled while it is processing). */
import { errorResponse, json, publicReport, requireUser } from "@/lib/api";
import { personAnalyses, requireParticipant } from "@/lib/workspaces";

export async function GET(req: Request, ctx: { params: Promise<{ person: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const { participant, ws } = await requireParticipant(user.userId, (await ctx.params).person);
    const wanted = new URL(req.url).searchParams.get("a");
    const analyses = await personAnalyses(participant.id);
    const analysis = wanted ? analyses.find((a) => a.id === wanted) : analyses[0];
    return analysis ? json(publicReport(analysis, ws.hideEmotions)) : json({ error: "not_found", message: "Not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
