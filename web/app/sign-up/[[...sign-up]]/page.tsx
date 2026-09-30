import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { getDict } from "@/lib/i18n";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";

export default async function Page() {
  const [{ t }, billing] = await Promise.all([getDict(), getSettings().catch(() => DEFAULT_SETTINGS)]);
  const a = t.legal.agree;
  return (
    <div className="flex flex-col items-center gap-5 pt-8">
      {billing.enabled && billing.freeFirstReport && <p className="max-w-sm rounded-2xl border border-accent bg-accent-soft px-5 py-3 text-center text-sm font-semibold">🎁 {t.home.signUpFree}</p>}
      <SignUp />
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
        {a.before} <Link href="/terms" className="text-accent-text hover:underline">{a.terms}</Link> {a.and}{" "}
        <Link href="/privacy" className="text-accent-text hover:underline">{a.privacy}</Link>.
      </p>
    </div>
  );
}
