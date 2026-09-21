/** Blob upload token for a participant. Their private link token is the credential. */
import { errorResponse, json } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { participantByToken } from "@/lib/workspaces";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    if (!(await participantByToken((await ctx.params).token))) return json({ error: "not_found", message: "Not found" }, 404);
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
