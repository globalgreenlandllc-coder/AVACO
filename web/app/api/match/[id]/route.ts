/** GET — the match's state and report (the page polls this while the partner records). DELETE — the match and the partner's recordings. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { deleteMatch, matchFor } from "@/lib/matches";

type Context = { params: Promise<{ id: string }> };
const notFound = () => json({ error: "not_found", message: "Not found" }, 404);

export async function GET(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const match = await matchFor(user.userId, (await ctx.params).id);
    if (!match) return notFound();
    const { t, locale } = await getDict();
    return json(await matchStatus(match, t, locale));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Context) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const match = await matchFor(user.userId, (await ctx.params).id);
    if (!match) return notFound();
    await deleteMatch(match);
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
