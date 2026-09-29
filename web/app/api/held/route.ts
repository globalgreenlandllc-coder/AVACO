/** GET /api/held?url= — has a recording kept at the paywall been bought and analysed already? { report: id | null } */
import { errorResponse, json, requireUser } from "@/lib/api";
import { heldRecordingReport } from "@/lib/billing";

export async function GET(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const url = new URL(req.url).searchParams.get("url") ?? "";
    return json({ report: url ? await heldRecordingReport(user.userId, url) : null });
  } catch (err) {
    return errorResponse(err);
  }
}
