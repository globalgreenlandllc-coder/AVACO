/** POST { analysisId, ownerName, partnerName, withFamily } — orders a relationship match from one of the person's reports. 402 without credits. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { createMatch } from "@/lib/matches";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const body = await req.json().catch(() => null);
    const match = await createMatch(user.userId, { analysisId: body?.analysisId, ownerName: body?.ownerName, partnerName: body?.partnerName, withFamily: body?.withFamily === true });
    return json({ id: match.id, token: match.partnerToken }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
