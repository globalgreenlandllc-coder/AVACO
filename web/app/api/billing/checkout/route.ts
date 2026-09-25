/**
 * POST { pack, workspaceId?, unlock? } — starts a Stripe Checkout for a credit pack and returns its URL.
 * For a person, or (workspaceId, admins only) for a company. `unlock` is a report to open once the payment lands.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, asWorkspace, attachStripeSession, getSettings, startPurchase } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { baseUrl } from "@/lib/page";
import { createCheckout, stripeReady } from "@/lib/stripe";
import { requireMember } from "@/lib/workspaces";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    if (!(await stripeReady())) return json({ error: "not_available", message: "Card payments are not set up yet" }, 503);
    const body = await req.json().catch(() => null);
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : null;
    if (workspaceId) await requireMember(user.userId, workspaceId, "admin");

    const unlockId = !workspaceId && typeof body?.unlock === "string" && (await gateway.getAnalysisFor(user.userId, body.unlock)) ? body.unlock : null;
    const purchase = await startPurchase(workspaceId ? asWorkspace(workspaceId) : asUser(user.userId), String(body?.pack ?? ""), unlockId);

    const origin = await baseUrl();
    const back = workspaceId ? `/w/${workspaceId}` : unlockId ? `/reports/${unlockId}` : "/credits";
    const session = await createCheckout({
      purchaseId: purchase.id,
      name: `AVOCO voice reports × ${purchase.credits}`,
      amountCents: purchase.amountCents,
      currency: (await getSettings()).currency,
      successUrl: `${origin}${back}?paid=1`,
      cancelUrl: `${origin}${back}`,
    });
    await attachStripeSession(purchase.id, session.id);
    return json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
