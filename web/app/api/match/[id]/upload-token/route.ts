/** Blob upload token for the orderer uploading a recording of their partner. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { matchFor } from "@/lib/matches";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    if (!(await matchFor(user.userId, (await ctx.params).id))) return json({ error: "not_found", message: "Not found" }, 404);
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
