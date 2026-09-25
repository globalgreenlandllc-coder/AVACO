/** Blob upload token for the partner page. No credential: the page itself is only served on the partner host. */
import { errorResponse, json } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { dailyLimit, usageToday } from "@/lib/partners";

export async function POST(req: Request) {
  try {
    if ((await usageToday()) >= dailyLimit()) return json({ error: "limit_reached", message: "Daily limit reached" }, 429);
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
