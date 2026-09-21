/** GET /api/v1/health — checks your API key and that AVOCO login works. */
import { avoco } from "@/lib/avoco";
import { json, requireApiKey } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  try {
    await avoco().getAccessToken();
    return json({ status: "ok", avoco: "connected" });
  } catch (err) {
    console.error(err);
    return json({ status: "degraded", avoco: "login_failed" }, 502);
  }
}
