/**
 * POST /api/upload-token — called by upload() from "@vercel/blob/client" in the browser.
 * The signed-in user's request is forwarded to the gateway, which holds the Blob token and
 * limits uploads to audio of at most 10 MB. The gateway API key stays on the server.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";
import { isOpenVisitor, openLimitReached } from "@/lib/visitor";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    // The free test site stops at its daily limit before anything is uploaded (lib/visitor.ts).
    if (isOpenVisitor(user.userId) && (await openLimitReached())) return json({ error: "limit_reached", message: "Today's limit is reached" }, 429);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
