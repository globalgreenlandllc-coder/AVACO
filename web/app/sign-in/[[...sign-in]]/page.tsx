import { SignIn } from "@clerk/nextjs";
import { getDict } from "@/lib/i18n";
import { headers } from "next/headers";
import { InAppNotice } from "@/components/InAppNotice";
import { inAppBrowser } from "@/lib/in-app";
import { baseUrl } from "@/lib/page";

/** Inside a social app's browser Google refuses to sign in, so its button and the "or" line under it are left out there. */
const WITHOUT_GOOGLE = { elements: { socialButtonsRoot: { display: "none" }, dividerRow: { display: "none" } } };

export default async function Page() {
  const [{ t }, hdrs, origin] = await Promise.all([getDict(), headers(), baseUrl()]);
  const inApp = inAppBrowser(hdrs.get("user-agent"));
  return (
    <div className="flex flex-col items-center gap-5 pt-8">
      {inApp && <InAppNotice inApp={inApp} url={`${origin}/sign-in`} t={t.inApp} kind="signIn" />}
      <SignIn appearance={inApp ? WITHOUT_GOOGLE : undefined} />
    </div>
  );
}
