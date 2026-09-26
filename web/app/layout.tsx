import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-ui";
import { getDict } from "@/lib/i18n";
import { directionOf } from "@/lib/i18n/languages";
import { LEGAL } from "@/lib/legal";
import { isOpenHost } from "@/lib/visitor";
import { availableLanguages } from "@/lib/translate";
import "./globals.css";

// Both families ship Cyrillic, so English and Russian look the same.
const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Cormorant_Garamond({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], variable: "--font-display" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.brand} · ${t.home.eyebrow}`, description: t.home.lead };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, languages, open] = await Promise.all([getDict(), availableLanguages(), isOpenHost()]);
  const page = (
      <html lang={locale} dir={directionOf(locale)} className={`${body.variable} ${display.variable}`}>
        <body className="flex flex-col">
          <Header locale={locale} t={t} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 pt-8 sm:px-8">{children}</main>
          <footer className="no-print border-t border-line px-5 py-8 text-xs text-muted">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <p>© {new Date().getFullYear()} {LEGAL.operator}. {t.footer}</p>
              <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1">
                <Link href="/privacy" className="hover:text-ink">{t.legal.nav.privacy}</Link>
                <Link href="/terms" className="hover:text-ink">{t.legal.nav.terms}</Link>
                <Link href="/docs/api" className="hover:text-ink">{t.legal.nav.api}</Link>
                <a href={`mailto:${LEGAL.support}`} className="hover:text-ink">{LEGAL.support}</a>
              </nav>
              <LanguageSwitch locale={locale} label={t.language} languages={languages.map(({ code, name, flag }) => ({ code, name, flag }))} openUp />
            </div>
          </footer>
        </body>
      </html>
  );
  // The open host runs without Clerk at all (lib/visitor.ts); no Clerk component is rendered there.
  return open ? page : <ClerkProvider localization={clerkLocalization(locale, t)} appearance={clerkAppearance}>{page}</ClerkProvider>;
}
