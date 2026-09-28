/**
 * What kind of pair a match is. The reading is the same voice reading of two types; what changes is which areas of a
 * shared life are read (romance for a couple, money and goals for business partners, fun and loyalty for friends),
 * and how the pages speak of the two people. Pure, client-safe; the words are in lib/i18n/match-*.ts.
 */
import type { Category } from "./match";

export const MATCH_KINDS = ["couple", "business", "colleagues", "family", "friends"] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];
export const isMatchKind = (v: unknown): v is MatchKind => typeof v === "string" && (MATCH_KINDS as readonly string[]).includes(v);

/** The areas read for each kind; a couple adds "family" when the order asks for it. */
export const CATEGORY_SETS: Record<MatchKind, Category[]> = {
  couple: ["romance", "warmth", "communication", "home", "providing", "ambition", "fun", "loyalty"],
  business: ["communication", "providing", "ambition", "loyalty", "warmth", "fun"],
  colleagues: ["communication", "warmth", "ambition", "loyalty", "fun"],
  family: ["warmth", "communication", "home", "providing", "loyalty", "fun"],
  friends: ["warmth", "communication", "fun", "loyalty", "ambition"],
};

/** The pairs of people who work rather than live together: their closest area is read from AVOCO's business texts. */
export const isWorkKind = (kind: MatchKind) => kind === "business" || kind === "colleagues";

export interface KindWords {
  /** In the order form: "Business partners", and a line under it. */
  label: string; hint: string;
  /** "your partner" → "your business partner": the words that stand in for the other person before a name is typed. */
  who: string;
  title: string; lead: string; eyebrow: string; areasTitle: string; partnerName: string;
  /** Phrases of the couple's wording, and what they become for this kind: [from, to], longest first, applied in order. */
  swap: string[][];
  /** Areas that read differently for this kind. */
  categories: Partial<Record<Category, { name: string; blurb: string; tip: string }>>;
}

/** One string of the couple's wording, said for this kind. */
export function swapWords(text: string, words: KindWords): string {
  let out = text;
  for (const [from, to] of words.swap) out = out.split(from).join(to);
  return out;
}

/** The whole set of match words (t.match), said for this kind: every string swapped, then the explicit ones set. */
export function matchWords<T extends Record<string, unknown>>(ui: T, kind: MatchKind, kinds: Record<MatchKind, KindWords>): T {
  if (kind === "couple") return ui;
  const words = kinds[kind];
  const walk = (v: unknown): unknown => (typeof v === "string" ? swapWords(v, words) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  const out = walk(ui) as Record<string, unknown>;
  Object.assign(out, { title: words.title, lead: words.lead, eyebrow: words.eyebrow, categoriesTitle: words.areasTitle, partnerFallback: words.who, partnerName: words.partnerName });
  return out as T;
}
