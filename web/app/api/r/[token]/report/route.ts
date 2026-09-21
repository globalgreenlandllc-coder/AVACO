/**
 * GET    — the participant's own latest report (their page polls this while AVOCO works).
 * DELETE — the participant erases their recordings and reports; the company loses them too.
 */
import { errorResponse, json, publicReport } from "@/lib/api";
import { eraseParticipant, participantByToken, personAnalyses } from "@/lib/workspaces";

type Context = { params: Promise<{ token: string }> };
const notFound = () => json({ error: "not_found", message: "Not found" }, 404);

export async function GET(_req: Request, ctx: Context) {
  try {
    const found = await participantByToken((await ctx.params).token);
    if (!found) return notFound();
    const [latest] = await personAnalyses(found.participant.id);
    return latest ? json(publicReport(latest, found.ws.hideEmotions)) : notFound();
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Context) {
  try {
    const found = await participantByToken((await ctx.params).token);
    if (!found) return notFound();
    await eraseParticipant(found.participant.id);
    return json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
