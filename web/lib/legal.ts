/**
 * Who stands behind the legal pages. The texts live in lib/i18n/legal-*.ts and refer to these values through
 * placeholders ({operator}, {email}, {site}, {law}), so the wording never has to change when the company details do.
 *
 * Set on Vercel:  LEGAL_OPERATOR   the legal name of the company (e.g. "Global Greenland LLC")
 *                 SUPPORT_EMAIL    the mailbox behind "Contact us" (support@avocousa.us unless set)
 *                 LEGAL_EMAIL      the mailbox for privacy requests, if it should differ from support
 *                 LEGAL_ADDRESS    a postal address, optional (shown in the contact section when set)
 *                 LEGAL_LAW        the governing law and courts (e.g. "the State of Delaware, USA")
 */
const support = process.env.SUPPORT_EMAIL?.trim() || "support@avocousa.us";

export const LEGAL = {
  /** Bump the date and version together whenever a text changes in substance. */
  updated: "2026-09-25",
  version: "1.0",
  site: "avocousa.us",
  operator: process.env.LEGAL_OPERATOR?.trim() || "AVOCO USA",
  support,
  email: process.env.LEGAL_EMAIL?.trim() || support,
  address: process.env.LEGAL_ADDRESS?.trim() || "",
  law: process.env.LEGAL_LAW?.trim() || "the United States",
} as const;

/**
 * Anchor ids for the sections, in the order of lib/i18n/legal-en.ts. They live here and not in the dictionary so
 * that a translator never touches them; the tests check that each list is exactly one id per section.
 */
export const LEGAL_SLUGS = {
  privacy: ["who", "data", "purposes", "voice", "sharing", "companies", "retention", "cookies", "rights", "security", "children", "changes", "contact"],
  terms: ["agreement", "service", "account", "recordings", "use", "credits", "companies", "api", "ip", "availability", "termination", "disclaimers", "liability", "law", "changes", "contact"],
} as const;

export type LegalVars = Record<string, string>;

/** Replaces every {name} whose value is known; unknown names stay visible, so a typo is caught by eye and by the tests. */
export function fillLegal(text: string, vars: LegalVars): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (m, key: string) => (key in vars ? vars[key] : m));
}

/** The values every legal text may refer to. `price` and `site` are per request; the rest come from LEGAL. */
export function legalVars(extra: Partial<Record<"price" | "site", string>> = {}): LegalVars {
  return { operator: LEGAL.operator, email: LEGAL.email, law: LEGAL.law, updated: LEGAL.updated, version: LEGAL.version, site: extra.site ?? LEGAL.site, price: extra.price ?? "" };
}
