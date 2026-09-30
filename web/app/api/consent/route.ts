/** POST { analytics, ads } — saves the visitor's cookie choices; turning analytics off also forgets their visit cookie. */
import { NextResponse } from "next/server";
import { CONSENT_COOKIE, formatConsent } from "@/lib/consent";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const choice = { analytics: body?.analytics === true, ads: body?.ads === true };
  const res = NextResponse.json({ ok: true, ...choice });
  res.cookies.set(CONSENT_COOKIE, formatConsent(choice), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: true });
  if (!choice.analytics) res.cookies.set("avoco_vid", "", { path: "/", maxAge: 0 });
  return res;
}
