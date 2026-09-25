/** GET — a partner-page report (the page polls this while AVOCO works). DELETE — removes it and its audio. */
import { errorResponse, json, publicReport } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { partnerAnalysis } from "@/lib/partners";

type Context = { params: Promise<{ id: string }> };
const notFound = () => json({ error: "not_found", message: "Not found" }, 404);

export async function GET(_req: Request, ctx: Context) {
  try {
    const analysis = await partnerAnalysis((await ctx.params).id);
    return analysis ? json(publicReport(analysis)) : notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Context) {
  try {
    const analysis = await partnerAnalysis((await ctx.params).id);
    if (!analysis) return notFound();
    await gateway.deleteAnalysis(analysis.id);
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
