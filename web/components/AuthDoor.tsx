/**
 * The one way in, for new and returning people alike (Clerk's sign-in-or-sign-up flow): type an email, and Clerk signs
 * the person in if the account exists or creates it if not. Served at /sign-in and /sign-up and wherever a page that
 * needs an account sends someone, so nobody meets "Couldn't find your account" or "That email address is taken".
 * The free-report offer sits above it, and inside a social app's browser the Google button is left out (lib/in-app.ts).
 */
import Link from "next/link";
import { headers } from "next/headers";
import { SignIn } from "@clerk/nextjs";
import { InAppNotice } from "./InAppNotice";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { getDict } from "@/lib/i18n";
import { inAppBrowser } from "@/lib/in-app";
import { baseUrl } from "@/lib/page";

/** Inside a social app's browser Google refuses to sign in, so its button and the "or" line under it are left out there. */
const WITHOUT_GOOGLE = { elements: { socialButtonsRoot: { display: "none" }, dividerRow: { display: "none" } } };

export async function AuthDoor({ path }: { path: "/sign-in" | "/sign-up" }) {
  const [{ t }, billing, hdrs, origin] = await Promise.all([getDict(), getSettings().catch(() => DEFAULT_SETTINGS), headers(), baseUrl()]);
  const inApp = inAppBrowser(hdrs.get("user-agent"));
  const a = t.legal.agree;
  return (
    <div className="flex flex-col items-center gap-5 pt-8">
      {billing.enabled && billing.freeFirstReport && <p className="max-w-sm rounded-2xl border border-accent bg-accent-soft px-5 py-3 text-center text-sm font-semibold">🎁 {t.home.signUpFree}</p>}
      {inApp && <InAppNotice inApp={inApp} url={`${origin}${path}`} t={t.inApp} />}
      <SignIn routing="path" path={path} withSignUp fallbackRedirectUrl="/record" signUpFallbackRedirectUrl="/record" appearance={inApp ? WITHOUT_GOOGLE : undefined} />
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
        {a.before} <Link href="/terms" className="text-accent-text hover:underline">{a.terms}</Link> {a.and}{" "}
        <Link href="/privacy" className="text-accent-text hover:underline">{a.privacy}</Link>.
      </p>
    </div>
  );
}
