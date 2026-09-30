/**
 * Cookie consent. Necessary cookies are always on; analytics (our visit statistics, Google Analytics) and advertising
 * (Google Ads, Meta, TikTok, X measurement through Google Tag Manager) follow the visitor's choice. Where the law asks
 * for a yes first (the EEA, the UK, Switzerland) both stay off until given; elsewhere they are on until refused.
 * A browser's Global Privacy Control signal always refuses advertising. Client-safe; tested in tests/consent.test.ts.
 */
export interface Consent { analytics: boolean; ads: boolean }
export const CONSENT_COOKIE = "avoco_consent";

/** Where analytics and advertising cookies wait for a yes: the European Economic Area, the United Kingdom and Switzerland. */
export const OPT_IN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH",
]);

export function parseConsent(raw: string | null | undefined): Consent | null {
  const m = /^a([01])\.m([01])$/.exec(raw ?? "");
  return m ? { analytics: m[1] === "1", ads: m[2] === "1" } : null;
}
export const formatConsent = (c: Consent) => `a${c.analytics ? 1 : 0}.m${c.ads ? 1 : 0}`;

/** What applies to this visit, and whether to ask: a saved choice wins, then the country's rule; GPC always refuses ads. */
export function consentFor({ saved, country, gpc }: { saved: Consent | null; country: string | null | undefined; gpc: boolean }): { consent: Consent; ask: boolean; gpc: boolean } {
  const optIn = OPT_IN_COUNTRIES.has((country ?? "").toUpperCase());
  const base = saved ?? { analytics: !optIn, ads: !optIn };
  return { consent: { analytics: base.analytics, ads: base.ads && !gpc }, ask: optIn && !saved, gpc };
}

/** Google Consent Mode v2, before Google Tag Manager starts: tags that respect consent wait for these. */
export function consentModeScript(c: Consent): string {
  const ads = c.ads ? "granted" : "denied", analytics = c.analytics ? "granted" : "denied";
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{ad_storage:'${ads}',ad_user_data:'${ads}',ad_personalization:'${ads}',analytics_storage:'${analytics}',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});dataLayer.push({event:'avoco_consent',avoco_analytics:${c.analytics},avoco_ads:${c.ads}});`;
}
