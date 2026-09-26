/** POST — the partner pressed record or chose a file; the orderer's tracker shows "recording now". */
import { errorResponse, json } from "@/lib/api";
import { matchByToken, notePartnerStarted } from "@/lib/matches";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const match = await matchByToken((await ctx.params).token);
    if (!match) return json({ error: "not_found", message: "Not found" }, 404);
    await notePartnerStarted(match);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
