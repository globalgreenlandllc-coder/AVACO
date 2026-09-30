/** POST /api/analyses { audioUrl, consent: true, person? } — starts an analysis for the signed-in user; `person` names whose voice it is. */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, balance, noteSelfRecording, previewsLeft, welcomeReportWaiting } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { coverWithGift } from "@/lib/gifts";
import { cleanName, setPerson } from "@/lib/people";
import { isOpenVisitor, openLimitReached } from "@/lib/visitor";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const body = await req.json().catch(() => null);
    // The checkbox on the recording page. Without it nothing is sent for analysis.
    if (body?.consent !== true) return json({ error: "bad_request", message: "Consent is required" }, 400);
    if (typeof body.audioUrl !== "string") return json({ error: "bad_request", message: "audioUrl is required" }, 400);
    // The free test site stops at its daily limit (lib/visitor.ts).
    if (isOpenVisitor(user.userId) && (await openLimitReached())) return json({ error: "limit_reached", message: "Today's limit is reached" }, 429);

    // Every recording costs an AVOCO analysis. With billing on, someone who has used their free previews needs a credit to
    // record again, unless their free first report is still waiting: that report must be recordable, whatever came before.
    if ((await previewsLeft(user.userId)) < 1 && (await balance(asUser(user.userId))) < 1 && !(await welcomeReportWaiting(user.userId))) return json({ error: "payment_required", message: "No free previews left" }, 402);

    const created = await gateway.createAnalysis({ audioUrl: body.audioUrl, owner: user.userId });
    await noteSelfRecording(user.userId, created.id);
    // Someone else's voice, named when it was recorded: their reports are read together, never mixed with the account holder's.
    if (cleanName(body.person)) await setPerson(user.userId, created.id, body.person).catch((err) => console.error("Could not name the report", err));
    // Someone holding a gift never meets the paywall: the gift's credit opens this report right away.
    await coverWithGift(user.userId, created.id).catch(() => null);
    return json({ id: created.id }, 202);
  } catch (err) {
    return errorResponse(err);
  }
}
