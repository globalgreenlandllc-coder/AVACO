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
import { isPartnerHost } from "@/lib/partners";
import { cookies, headers } from "next/headers";
import { ConsentBanner, PrivacyChoicesLink } from "@/components/ConsentBanner";
import { CONSENT_COOKIE, consentFor, consentModeScript, parseConsent } from "@/lib/consent";
import { PostHogInit } from "@/components/PostHogInit";
import { ConversionEvents } from "@/components/ConversionEvents";
import { MetaPixelEvents } from "@/components/MetaPixelEvents";
import { META_PIXEL_ID, metaPixelScript } from "@/lib/meta-pixel";
import { isAdminUser } from "@/lib/admin";
import { posthogConfig } from "@/lib/posthog";
import { shortKey } from "@/lib/visits-math";
import { availableLanguages } from "@/lib/translate";
import "./globals.css";

/** Google Tag Manager's container (public: it is in every page's source). Change it with NEXT_PUBLIC_GTM_ID. */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-NJTJ3D4V";
/** Meta's domain verification code (Business settings → Brand safety → Domains → avocousa.us, meta-tag method). Public by design. */
const META_DOMAIN_VERIFICATION = process.env.META_DOMAIN_VERIFICATION || "9ykx8z67izwsg3csg44xbh3k7bprc8";

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
  // Cookie choices: a saved one, else the country's rule (a yes first in the EEA, UK and Switzerland); GPC refuses ads.
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  const privacy = consentFor({ saved: parseConsent(jar.get(CONSENT_COOKIE)?.value), country: hdrs.get("x-vercel-ip-country"), gpc: hdrs.get("sec-gpc") === "1" });
  // PostHog session replays (lib/posthog.ts): the main site only, with analytics consent, never an admin's browser.
  const posthog = gtm ? posthogConfig() : null;
  const adminBrowser = visitor?.startsWith("user_") ? await isAdminUser(visitor) : false;
  // Meta's pixel (lib/meta-pixel.ts): the main site, never an admin's browser; it runs only with advertising consent.
  const pixelId = gtm && !adminBrowser ? process.env.NEXT_PUBLIC_META_PIXEL_ID || META_PIXEL_ID : null;
  const metaPixel = pixelId && privacy.consent.ads ? pixelId : null;
  const vid = jar.get("avoco_vid")?.value ?? null;
  // Finished couple's reports the person hasn't opened yet: a notice on every page, and a count on "My reports".
  const ready = visitor ? await unseenReadyMatches(visitor).catch(() => []) : [];
  const page = (
      <html lang={locale} dir={directionOf(locale)} className={`${body.variable} ${display.variable}`}>
        <head>
          {/* Meta checks for this tag in the server's HTML <head>, not in anything added by script. */}
          <meta name="facebook-domain-verification" content={META_DOMAIN_VERIFICATION} />
          {/* Meta's pixel, in the server's HTML like Meta's own snippet, so even a visit that ends in a second counts. */}
          {metaPixel && <script id="meta-pixel" dangerouslySetInnerHTML={{ __html: metaPixelScript(metaPixel) }} />}
          {/* Google Tag Manager, as high in <head> as the page allows (Google's instructions): in the server's HTML, run as the page is read. */}
          {gtm && <script id="gtm" dangerouslySetInnerHTML={{ __html: `${consentModeScript(privacy.consent)}(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');` }} />}
        </head>
        <body className="flex flex-col">
          {gtm && (
            <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
          )}
          {metaPixel && <noscript><img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${metaPixel}&ev=PageView&noscript=1`} /></noscript>}
          <MetaPixelEvents pixelId={pixelId} enabled={Boolean(metaPixel)} />
          <VisitBeacon enabled={privacy.consent.analytics} />
          {gtm && <ConversionEvents off={adminBrowser} />}
          {posthog && <PostHogInit apiKey={posthog.key} host={posthog.host} enabled={privacy.consent.analytics && !adminBrowser} visitor={vid ? shortKey(vid) : null} />}
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
                <PrivacyChoicesLink />
                <a href={`mailto:${LEGAL.support}`} className="transition-colors hover:text-ink">{LEGAL.support}</a>
              </nav>
              <div className="sm:justify-self-end"><LanguageSwitch locale={locale} label={t.language} languages={languages.map(({ code, name, flag }) => ({ code, name, flag }))} openUp /></div>
            </div>
          </footer>
          <ConsentBanner initial={privacy.consent} ask={privacy.ask} gpc={privacy.gpc} />
        </body>
      </html>
  );
  // The open host runs without Clerk at all (lib/visitor.ts); no Clerk component is rendered there.
  return open ? page : <ClerkProvider localization={clerkLocalization(locale, t)} appearance={clerkAppearance}>{page}</ClerkProvider>;
}
