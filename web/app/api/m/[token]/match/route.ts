/** GET — the match's state and report as the partner sees it. */
import { errorResponse, json } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { matchByToken } from "@/lib/matches";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const match = await matchByToken((await ctx.params).token);
    if (!match) return json({ error: "not_found", message: "Not found" }, 404);
    const { t, locale } = await getDict();
    return json(await matchStatus(match, t, locale));
  } catch (err) {
    return errorResponse(err);
  }
}
