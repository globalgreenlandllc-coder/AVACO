/** POST { name, audioUrl, attest: true } — one uploaded recording becomes one person in the group. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { addUploadedRecording } from "@/lib/workspaces";

export async function POST(req: Request, ctx: { params: Promise<{ group: string }> }) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    const { participant } = await addUploadedRecording(user.userId, (await ctx.params).group, { name: body?.name, audioUrl: body?.audioUrl, attest: body?.attest });
    return json({ id: participant.id }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
