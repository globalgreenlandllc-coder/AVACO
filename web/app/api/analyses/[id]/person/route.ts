/**
 * PUT /api/analyses/:id/person { name } — whose voice this report is. An empty name gives it back to the account
 * holder. Only ever touches a report of the signed-in visitor. Answers the name as kept (lib/people.ts).
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { setPerson } from "@/lib/people";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const { id } = await ctx.params;
    if (!(await gateway.getAnalysisFor(user.userId, id))) return json({ error: "not_found", message: "Report not found" }, 404);
    const body = await req.json().catch(() => null);
    return json({ name: await setPerson(user.userId, id, body?.name) });
  } catch (err) {
    return errorResponse(err);
  }
}
