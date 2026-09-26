/** GET — the partner's own latest report (their page polls this). DELETE — the partner erases everything they recorded. */
import { errorResponse, json, publicReport } from "@/lib/api";
import { erasePartner, markReady, matchByToken, partnerAnalyses } from "@/lib/matches";

type Context = { params: Promise<{ token: string }> };
const notFound = () => json({ error: "not_found", message: "Not found" }, 404);

export async function GET(_req: Request, ctx: Context) {
  try {
    const match = await matchByToken((await ctx.params).token);
    if (!match) return notFound();
    const [latest] = await partnerAnalyses(match);
    if (latest?.status === "completed") await markReady(match); // the orderer's side was analysed before the match could be ordered
    return latest ? json(publicReport(latest)) : notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Context) {
  try {
    const match = await matchByToken((await ctx.params).token);
    if (!match) return notFound();
    await erasePartner(match);
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
