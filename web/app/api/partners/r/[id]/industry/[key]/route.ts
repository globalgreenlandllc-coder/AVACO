/** GET — an industry chapter on the partner page. Free: the page exists for partners to test the product. */
import { errorResponse, json } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import { isIndustry } from "@/lib/industries";
import { industryChapter } from "@/lib/industry-chapter";
import { partnerAnalysis } from "@/lib/partners";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; key: string }> }) {
  try {
    const { id, key } = await ctx.params;
    if (!isIndustry(key)) return json({ error: "not_found", message: "Unknown industry" }, 404);
    const analysis = await partnerAnalysis(id);
    if (!analysis?.psytype?.length) return json({ error: "not_found", message: "Not found" }, 404);
    const { t, locale } = await getDict();
    const chapter = industryChapter(key, analysis.psytype, t, locale, analysis.emostate);
    return chapter ? json(chapter) : json({ error: "not_found", message: "Not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
