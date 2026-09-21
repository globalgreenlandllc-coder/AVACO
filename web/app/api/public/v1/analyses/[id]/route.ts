/** Company API: GET one analysis. Only analyses recorded in the key's own workspace are visible. */
import { errorResponse, json } from "@/lib/api";
import { apiAnalysis, workspaceFromRequest } from "@/lib/public-api";
import { workspaceAnalysis } from "@/lib/workspaces";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const ws = await workspaceFromRequest(req);
    if (!ws) return json({ error: "unauthorized", message: "Missing or invalid API key" }, 401);
    const { id } = await ctx.params;
    const found = UUID.test(id) ? await workspaceAnalysis(ws.id, id) : null;
    return found ? json(apiAnalysis(found.analysis, found.participant, ws)) : json({ error: "not_found", message: "Analysis not found" }, 404);
  } catch (err) {
    return errorResponse(err);
  }
}
