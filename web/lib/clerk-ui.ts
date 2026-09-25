import { arSA, bgBG, csCZ, daDK, deDE, elGR, enUS, esES, fiFI, frFR, heIL, huHU, idID, itIT, jaJP, koKR, nbNO, nlNL, plPL, ptBR, roRO, ruRU, skSK, svSE, thTH, trTR, ukUA, viVN, zhCN } from "@clerk/localizations";
import type { Dict } from "./i18n";

/** Clerk's own translation for each language the menu can offer (lib/i18n/languages.ts); the rest fall back to English. */
const CLERK_LOCALES: Record<string, typeof enUS> = {
  en: enUS, ru: ruRU, es: esES, de: deDE, fr: frFR, it: itIT, pt: ptBR, nl: nlNL, pl: plPL, uk: ukUA, tr: trTR, ar: arSA, zh: zhCN, ja: jaJP,
  ko: koKR, id: idID, cs: csCZ, da: daDK, el: elGR, fi: fiFI, hu: huHU, ro: roRO, sv: svSE, nb: nbNO, sk: skSK, bg: bgBG, he: heIL, vi: viVN, th: thTH,
};

/** Clerk's translation for the language, with AVOCO's own titles on the sign-in and sign-up cards (the defaults say "Sign in to {{applicationName}}"). */
export function clerkLocalization(locale: string, t: Dict): typeof enUS {
  const base = CLERK_LOCALES[locale] ?? enUS;
  const a = t.auth;
  return {
    ...base,
    signIn: { ...base.signIn, start: { ...base.signIn?.start, title: a.signInTitle, subtitle: a.signInSubtitle, titleCombined: a.signInTitle, subtitleCombined: a.signInSubtitle } },
    signUp: { ...base.signUp, start: { ...base.signUp?.start, title: a.signUpTitle, subtitle: a.signUpSubtitle, titleCombined: a.signUpTitle, subtitleCombined: a.signUpSubtitle } },
  };
}

/**
 * How Clerk's cards look: AVOCO gold, the application logo above the card, links to the legal pages.
 * The Google button shows; it works once the production instance carries its own Google OAuth client
 * (Clerk dashboard → SSO connections → Google → custom credentials). Clerk's shared keys are development-only.
 */
export const clerkAppearance = {
  variables: { colorPrimary: "#b4730f", borderRadius: "12px" },
  // The logo itself is set on the Clerk application (dashboard: Customization → Branding); public/avoco-logo.* are the files used there.
  layout: { logoPlacement: "outside" as const, logoLinkUrl: "/", termsPageUrl: "/terms", privacyPageUrl: "/privacy" },
};
