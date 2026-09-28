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
  /**
   * Every sentence of the couple's wording that reads differently for this kind, whole, by its path in t.match
   * ("notPaid", "whatNow.steps[2]"). Generated from the swaps for English and Russian (scripts/match-kind-words.mts)
   * and translated whole into every other language, so the kind's wording holds in all of them.
   */
  words: Record<string, string>;
  /** Areas that read differently for this kind. */
  categories: Partial<Record<Category, { name: string; blurb: string; tip: string }>>;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One string of the couple's wording, said for this kind. A phrase only matches whole words: "your partner" leaves "your partnership" alone. */
export function swapWords(text: string, words: KindWords): string {
  let out = text;
  for (const [from, to] of words.swap) out = out.replace(new RegExp(`(?<!\\p{L})${escape(from)}(?!\\p{L})`, "gu"), to);
  return out;
}

/** Sets a value at a flat path ("whatNow.steps[2]") inside a nested object of strings, arrays and objects. */
function setPath(root: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split(/\.|\[|\]/).filter(Boolean);
  let node: unknown = root;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!node || typeof node !== "object") return;
    node = (node as Record<string, unknown>)[keys[i]];
  }
  if (node && typeof node === "object") (node as Record<string, unknown>)[keys[keys.length - 1]] = value;
}

/**
 * The whole set of match words (t.match), said for this kind: every string swapped (English and Russian), then every
 * whole sentence of the kind set in (every language), then the explicit ones.
 */
export function matchWords<T extends Record<string, unknown>>(ui: T, kind: MatchKind, kinds: Record<MatchKind, KindWords>): T {
  if (kind === "couple") return ui;
  const words = kinds[kind];
  const walk = (v: unknown): unknown => (typeof v === "string" ? swapWords(v, words) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  const out = walk(ui) as Record<string, unknown>;
  for (const [path, text] of Object.entries(words.words ?? {})) setPath(out, path, text);
  Object.assign(out, { title: words.title, lead: words.lead, eyebrow: words.eyebrow, categoriesTitle: words.areasTitle, partnerFallback: words.who, partnerName: words.partnerName });
  return out as T;
}
