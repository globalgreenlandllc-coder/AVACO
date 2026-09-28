import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MatchReadyNotice } from "@/components/MatchReadyNotice";
import { VisitBeacon } from "@/components/VisitBeacon";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-ui";
import { getDict } from "@/lib/i18n";
import { directionOf } from "@/lib/i18n/languages";
import { LEGAL } from "@/lib/legal";
import { baseUrl } from "@/lib/page";
import { unseenReadyMatches } from "@/lib/matches";
import { isOpenHost, visitorId } from "@/lib/visitor";
import { availableLanguages } from "@/lib/translate";
import "./globals.css";

// Both families ship Cyrillic, so English and Russian look the same.
const body = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-body" });
const display = Cormorant_Garamond({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], variable: "--font-display" });

export async function generateMetadata(): Promise<Metadata> {
  const [{ t }, origin] = await Promise.all([getDict(), baseUrl()]);
  // metadataBase makes link-preview images absolute on whichever host served the page (www.avocousa.us, the partner host).
  return { metadataBase: new URL(origin), title: `${t.brand} · ${t.home.eyebrow}`, description: t.home.lead };
}

/** The browser's own chrome takes the page's colour: cream by day, the dark cream at night. */
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf5ea" }, { media: "(prefers-color-scheme: dark)", color: "#14100a" }] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, languages, open, visitor] = await Promise.all([getDict(), availableLanguages(), isOpenHost(), visitorId()]);
  // Finished couple's reports the person hasn't opened yet: a notice on every page, and a count on "My reports".
  const ready = visitor ? await unseenReadyMatches(visitor).catch(() => []) : [];
  const page = (
      <html lang={locale} dir={directionOf(locale)} className={`${body.variable} ${display.variable}`}>
        <body className="flex flex-col">
          <VisitBeacon />
          <Header locale={locale} t={t} alerts={ready.length} />
          <MatchReadyNotice matches={ready} t={t.match} />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 pt-8 sm:px-8">{children}</main>
          <footer className="no-print border-t border-line px-5 py-10 text-xs text-muted sm:px-8">
            <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-[1fr_auto_auto] sm:items-start">
              <div className="max-w-sm">
                <p className="font-display text-xl font-semibold tracking-[0.14em] text-ink">{t.brand}</p>
                <p className="mt-2 leading-relaxed">{t.home.lead}</p>
                <p className="mt-4">© {new Date().getFullYear()} {LEGAL.operator}. {t.footer}</p>
              </div>
              <nav className="flex flex-col gap-2" aria-label={t.legal.nav.privacy}>
                <Link href="/privacy" className="transition-colors hover:text-ink">{t.legal.nav.privacy}</Link>
                <Link href="/terms" className="transition-colors hover:text-ink">{t.legal.nav.terms}</Link>
                <Link href="/docs/api" className="transition-colors hover:text-ink">{t.legal.nav.api}</Link>
                <a href={`mailto:${LEGAL.support}`} className="transition-colors hover:text-ink">{LEGAL.support}</a>
              </nav>
              <div className="sm:justify-self-end"><LanguageSwitch locale={locale} label={t.language} languages={languages.map(({ code, name, flag }) => ({ code, name, flag }))} openUp /></div>
            </div>
          </footer>
        </body>
      </html>
  );
  // The open host runs without Clerk at all (lib/visitor.ts); no Clerk component is rendered there.
  return open ? page : <ClerkProvider localization={clerkLocalization(locale, t)} appearance={clerkAppearance}>{page}</ClerkProvider>;
}
