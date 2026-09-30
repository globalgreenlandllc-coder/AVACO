import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { getDict } from "@/lib/i18n";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { headers } from "next/headers";
import { InAppNotice } from "@/components/InAppNotice";
import { inAppBrowser } from "@/lib/in-app";
import { baseUrl } from "@/lib/page";

/** Inside a social app's browser Google refuses to sign in, so its button and the "or" line under it are left out there. */
const WITHOUT_GOOGLE = { elements: { socialButtonsRoot: { display: "none" }, dividerRow: { display: "none" } } };

export default async function Page() {
  const [{ t }, billing, hdrs, origin] = await Promise.all([getDict(), getSettings().catch(() => DEFAULT_SETTINGS), headers(), baseUrl()]);
  const inApp = inAppBrowser(hdrs.get("user-agent"));
  const a = t.legal.agree;
  return (
    <div className="flex flex-col items-center gap-5 pt-8">
      {billing.enabled && billing.freeFirstReport && <p className="max-w-sm rounded-2xl border border-accent bg-accent-soft px-5 py-3 text-center text-sm font-semibold">🎁 {t.home.signUpFree}</p>}
      {inApp && <InAppNotice inApp={inApp} url={`${origin}/sign-up`} t={t.inApp} kind="signUp" />}
      <SignUp appearance={inApp ? WITHOUT_GOOGLE : undefined} />
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
        {a.before} <Link href="/terms" className="text-accent-text hover:underline">{a.terms}</Link> {a.and}{" "}
        <Link href="/privacy" className="text-accent-text hover:underline">{a.privacy}</Link>.
      </p>
    </div>
  );
}
