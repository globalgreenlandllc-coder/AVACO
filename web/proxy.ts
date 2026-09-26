import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Recording, reports and the API need a signed-in user. The landing page and sign-in are public.
// Participant links (/r, /s), their APIs and the company API carry their own credentials, so they stay public.
const PROTECTED = ["/record", "/reports", "/match", "/w", "/join", "/credits", "/admin", "/api/upload-token", "/api/analyses", "/api/match", "/api/w", "/api/billing", "/api/admin"];

// The partner page lives on its own free Vercel hosts (the same list as lib/partners.ts, which the edge runtime
// can't import). There, "/" is the partner page; anywhere else, the partner paths send the visitor to the first
// of those hosts, so the main domain never shows them.
const PARTNER_HOSTS = (process.env.PARTNER_HOSTS ?? process.env.PARTNER_HOST ?? "avoco-partners.vercel.app,avaco-web-git-main-gutters.vercel.app").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const isPartnerPath = (p: string) => p === "/partners" || p.startsWith("/partners/") || p.startsWith("/api/partners/");

// The "open" hosts (lib/visitor.ts) show the original site with no accounts and no payments: nothing is protected,
// the visitor is a cookie, and the account and billing pages send them back to the start.
const OPEN_HOSTS = (process.env.OPEN_HOSTS ?? "avaco-web.vercel.app").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const OPEN_COOKIE = "avoco_visitor";
const CLOSED_ON_OPEN_HOST = ["/sign-in", "/sign-up", "/credits", "/w", "/join", "/admin", "/api/billing", "/api/admin", "/api/w"];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const onPartnerHost = PARTNER_HOSTS.includes(host) || host.startsWith("localhost");
  if (onPartnerHost && pathname === "/") return NextResponse.rewrite(new URL("/partners", req.url));
  if (!onPartnerHost && isPartnerPath(pathname)) return NextResponse.redirect(`https://${PARTNER_HOSTS[0]}${pathname === "/partners" ? "/" : pathname}`, 308);
  if (OPEN_HOSTS.includes(host)) {
    if (CLOSED_ON_OPEN_HOST.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return NextResponse.redirect(new URL("/", req.url));
    const res = NextResponse.next();
    if (!req.cookies.get(OPEN_COOKIE)) res.cookies.set(OPEN_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }
  if (PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)", "/__clerk/:path*"],
};
