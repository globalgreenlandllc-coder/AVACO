/**
 * GET ?session= — for the purchase event (lib/track.ts): what the signed-in person just paid for, once Stripe has
 * confirmed it. Only their own purchase; { pending: true } while the payment is still being confirmed.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { asUser, confirmCheckout } from "@/lib/billing";
import { purchaseItem } from "@/lib/track";

export async function GET(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;
  try {
    const session = new URL(req.url).searchParams.get("session") ?? "";
    if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(session)) return json({ error: "bad_request" }, 400);
    const outcome = await confirmCheckout(asUser(user.userId), session);
    if (!outcome) return json({ error: "not_found" }, 404);
    if (!outcome.paid) return json({ pending: true });
    const p = outcome.purchase;
    return json({ id: p.id, value: p.amountCents / 100, currency: p.currency.toUpperCase(), item: purchaseItem(p), credits: p.credits });
  } catch (err) {
    return errorResponse(err);
  }
}
