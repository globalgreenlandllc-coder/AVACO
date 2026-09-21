import { clerkMiddleware } from "@clerk/nextjs/server";

// Recording, reports and the API need a signed-in user. The landing page and sign-in are public.
const PROTECTED = ["/record", "/reports", "/api/upload-token", "/api/analyses"];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
