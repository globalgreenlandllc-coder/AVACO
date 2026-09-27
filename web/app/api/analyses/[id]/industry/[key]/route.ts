/** GET — the industry chapter of a person's own report. 402 until the industry is opened, directly or as the best-industry finder's winner (admins and billing-off: always). */
import { errorResponse, json, requireUser } from "@/lib/api";
import { hasBestAccess, hasFullAccess, hasIndustryAccess, industriesByReport, noteIndustryOpened } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { getDict } from "@/lib/i18n";
import { industryMatches, isIndustry } from "@/lib/industries";
import { industryChapter } from "@/lib/industry-chapter";
import { profileFor, samePersonIds } from "@/lib/profile";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; key: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const { id, key } = await ctx.params;
    if (!isIndustry(key)) return json({ error: "not_found", message: "Unknown industry" }, 404);
    const analysis = await gateway.getAnalysisFor(user.userId, id);
    if (!analysis || analysis.status !== "completed" || !analysis.psytype?.length) return json({ error: "not_found", message: "Report not found" }, 404);
    const types = (await profileFor(user.userId, analysis)).psytype ?? analysis.psytype;
    // A chapter opens when it was bought, or when it is the winner of the best-industry finder bought on this report.
    const open = (await hasIndustryAccess(user.userId, analysis.id, key))
      || ((await hasBestAccess(user.userId, analysis.id)) && industryMatches(types)?.[0]?.industry === key)
      // opened on another recording of the same person: the chapter reads the same profile, so it is theirs here too
      || await (async () => { const [ids, byReport] = await Promise.all([samePersonIds(user.userId, analysis.id), industriesByReport(user.userId)]); return ids.some((id) => byReport.get(id)?.includes(key)); })();
    if (!(await hasFullAccess(user.userId, analysis.id)) || !open) return json({ error: "payment_required", message: "Open this industry first" }, 402);
    await noteIndustryOpened(user.userId, analysis.id, key); // listed with this report from now on, whichever way it opened
    const { t, locale } = await getDict();
    const chapter = industryChapter(key, types, t, locale, analysis.emostate);
    return chapter ? json(chapter) : json({ error: "not_found", message: "Report not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
