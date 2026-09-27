/**
 * GET  /api/analyses/:id/best — the best-industry finder for a person's own report: every industry compared, the winner
 *      explained (lib/industry-chapter.ts bestIndustry). 402 until it is opened.
 * POST /api/analyses/:id/best — opens it: free while charging is off, on the open host and for admins, otherwise the
 *      finder's credits (402 when there are too few; the page then offers the card).
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { hasBestAccess, hasFullAccess, unlockBest } from "@/lib/billing";
import { bestCredits } from "@/lib/best-billing";
import { gateway } from "@/lib/gateway";
import { getDict } from "@/lib/i18n";
import { bestIndustry } from "@/lib/industry-chapter";
import { profileFor } from "@/lib/profile";

type Context = { params: Promise<{ id: string }> };
const notFound = () => json({ error: "not_found", message: "Report not found" }, 404);

async function ownReport(userId: string, ctx: Context) {
  const analysis = await gateway.getAnalysisFor(userId, (await ctx.params).id);
  return analysis?.status === "completed" && analysis.psytype?.length ? analysis : null;
}

export async function GET(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const analysis = await ownReport(user.userId, ctx);
    if (!analysis) return notFound();
    if (!(await hasFullAccess(user.userId, analysis.id)) || !(await hasBestAccess(user.userId, analysis.id))) return json({ error: "payment_required", message: "Open the finder first" }, 402);
    const [{ t, locale }, profile] = await Promise.all([getDict(), profileFor(user.userId, analysis)]);
    // The same profile the report shows: this person's type across their recordings.
    const result = bestIndustry(profile.psytype ?? analysis.psytype!, t, locale);
    return result ? json(result) : notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const analysis = await ownReport(user.userId, ctx);
    if (!analysis) return notFound();
    // The finder builds on the full report, so the report must be open first.
    if (!(await hasFullAccess(user.userId, analysis.id))) return json({ error: "payment_required", message: "Open the full report first" }, 402);
    await unlockBest(user.userId, analysis.id, await bestCredits());
    return json({ unlocked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
