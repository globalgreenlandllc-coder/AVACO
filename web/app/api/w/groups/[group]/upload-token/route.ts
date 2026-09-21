/** Blob upload token for a manager uploading existing recordings into a group. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { requireGroup } from "@/lib/workspaces";

export async function POST(req: Request, ctx: { params: Promise<{ group: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    await requireGroup(user.userId, (await ctx.params).group, "manager");
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
