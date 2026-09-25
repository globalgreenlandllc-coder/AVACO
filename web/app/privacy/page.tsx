import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { LegalDoc } from "@/components/LegalDoc";
import { getDict } from "@/lib/i18n";
import { fillLegal, legalVars } from "@/lib/legal";
import { baseUrl } from "@/lib/page";

/** Public, like the landing page: proxy.ts protects only the listed prefixes. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.legal.privacy.title} · ${t.brand}`, description: fillLegal(t.legal.privacy.lead, legalVars()) };
}

export default async function PrivacyPage() {
  const [{ locale, t }, { userId }, origin] = await Promise.all([getDict(), auth(), baseUrl()]);
  return <LegalDoc kind="privacy" t={t} locale={locale} vars={legalVars({ site: new URL(origin).host })} signedIn={!!userId} />;
}
