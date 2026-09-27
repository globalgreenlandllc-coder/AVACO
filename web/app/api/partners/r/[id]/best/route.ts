/**
 * The best-match industry finder on the partner page, free like everything there: POST opens it (nothing to charge),
 * GET returns the result (lib/industry-chapter.ts bestIndustry).
 */
import { errorResponse, json } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import { bestIndustry } from "@/lib/industry-chapter";
import { partnerAnalysis } from "@/lib/partners";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Context) {
  try {
    const analysis = await partnerAnalysis((await ctx.params).id);
    if (!analysis?.psytype?.length) return json({ error: "not_found", message: "Not found" }, 404);
    const { t, locale } = await getDict();
    const result = bestIndustry(analysis.psytype, t, locale);
    return result ? json(result) : json({ error: "not_found", message: "Not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(_req: Request, ctx: Context) {
  try {
    const analysis = await partnerAnalysis((await ctx.params).id);
    if (!analysis?.psytype?.length) return json({ error: "not_found", message: "Not found" }, 404);
    return json({ unlocked: true });
  } catch (err) {
    return errorResponse(err);
  }
}
