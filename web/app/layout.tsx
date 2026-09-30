import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
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
import { isPartnerHost } from "@/lib/partners";
import { availableLanguages } from "@/lib/translate";
import "./globals.css";

/** Google Tag Manager's container (public: it is in every page's source). Change it with NEXT_PUBLIC_GTM_ID. */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-NJTJ3D4V";

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
  const [{ locale, t }, languages, open, visitor, partner] = await Promise.all([getDict(), availableLanguages(), isOpenHost(), visitorId(), isPartnerHost()]);
  // Google Tag Manager on the main site only: not on the free partner and open test hosts, and not on a development
  // server (which counts as a partner host), so no test run reaches the ad and analytics accounts.
  const gtm = !open && !partner ? GTM_ID : null;
  // Finished couple's reports the person hasn't opened yet: a notice on every page, and a count on "My reports".
  const ready = visitor ? await unseenReadyMatches(visitor).catch(() => []) : [];
  const page = (
      <html lang={locale} dir={directionOf(locale)} className={`${body.variable} ${display.variable}`}>
        <body className="flex flex-col">
          {gtm && (
            <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
          )}
          {/* Google Tag Manager: beforeInteractive puts it at the top of <head>, ahead of the site's own scripts. */}
          {gtm && (
            <Script id="gtm" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');` }} />
          )}
          <VisitBeacon />
          <Header locale={locale} t={t} alerts={ready.length} />
          <MatchReadyNotice matches={ready} t={t.match} kinds={t.content.match.kinds} />
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
                <Link href="/technology" className="transition-colors hover:text-ink">{t.technology.footerLink}</Link>
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
