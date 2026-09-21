/** POST /api/locale { locale } — remembers the visitor's language choice for a year. */
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!isLocale(body?.locale)) return Response.json({ error: "bad_request", message: "Unknown locale" }, { status: 400 });
  (await cookies()).set(LOCALE_COOKIE, body.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return Response.json({ ok: true });
}
