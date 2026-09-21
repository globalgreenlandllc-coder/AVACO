/**
 * POST /api/upload-token — called by upload() from "@vercel/blob/client" in the browser.
 * The signed-in user's request is forwarded to the gateway, which holds the Blob token and
 * limits uploads to audio of at most 10 MB. The gateway API key stays on the server.
 */
import { errorResponse, json, requireUser } from "@/lib/api";
import { gateway } from "@/lib/gateway";

export async function POST(req: Request) {
  const user = await requireUser();
  if ("denied" in user) return user.denied;

  try {
    const body = await req.json().catch(() => null);
    if (body?.type !== "blob.generate-client-token") return json({ error: "bad_request", message: "Unsupported upload event" }, 400);
    return json(await gateway.uploadToken(body));
  } catch (err) {
    return errorResponse(err);
  }
}
