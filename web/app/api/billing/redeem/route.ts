/** POST { code, workspaceId? } — a promo code, for the signed-in person or (admins only) for a workspace. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, asWorkspace, redeem } from "@/lib/billing";
import { requireMember } from "@/lib/workspaces";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : null;
    if (workspaceId) await requireMember(user.userId, workspaceId, "admin");
    return json({ credits: await redeem(workspaceId ? asWorkspace(workspaceId) : asUser(user.userId), body?.code) });
  } catch (err) {
    return errorResponse(err);
  }
}
