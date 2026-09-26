/** GET — the industry chapter of a person's own report. 402 until the industry is opened (admins and billing-off: always). */
import { errorResponse, json, requireUser } from "@/lib/api";
import { hasFullAccess, hasIndustryAccess } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { getDict } from "@/lib/i18n";
import { isIndustry } from "@/lib/industries";
import { industryChapter } from "@/lib/industry-chapter";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; key: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const { id, key } = await ctx.params;
    if (!isIndustry(key)) return json({ error: "not_found", message: "Unknown industry" }, 404);
    const analysis = await gateway.getAnalysisFor(user.userId, id);
    if (!analysis || analysis.status !== "completed" || !analysis.psytype?.length) return json({ error: "not_found", message: "Report not found" }, 404);
    if (!(await hasFullAccess(user.userId, analysis.id)) || !(await hasIndustryAccess(user.userId, analysis.id, key))) return json({ error: "payment_required", message: "Open this industry first" }, 402);
    const { t, locale } = await getDict();
    const chapter = industryChapter(key, analysis.psytype, t, locale, analysis.emostate);
    return chapter ? json(chapter) : json({ error: "not_found", message: "Report not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
