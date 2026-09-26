/**
 * The relationship match: two type profiles read against each other. AVOCO's API has no such thing; this is
 * the platform's reading, built on AVOCO's type descriptions and, for the Catalyst, its official compatibility
 * table. Language-free rules here; every word is in lib/i18n/match-*.ts. Pure, tested.
 *
 * Profiles are AVOCO's eight scores (in practice a leader, a runner-up at 45 and six low ones), so a partner's
 * "presence" in a category is a soft OR over their types: any strong type covers it, two cover it more.
 */
export type TypeKey = "organizer" | "driver" | "catalyst" | "performer" | "harmonizer" | "analyst" | "skeptic" | "mediator";
export const TYPE_KEYS: TypeKey[] = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];
type Scores = Array<{ key: string; value: number }>;
type W = Partial<Record<TypeKey, number>>;

/** Pair key, order-free: "catalyst|driver". */
export const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/**
 * Hearts, 1 to 5, for every pair of leading types. The Catalyst row is AVOCO's official table; the rest is this
 * platform's reading of AVOCO's descriptions (marked as such in the report). Symmetric.
 */
const HEARTS: Record<string, number> = {
  "organizer|organizer": 4, "driver|organizer": 4, "catalyst|organizer": 2, "organizer|performer": 3, "harmonizer|organizer": 4, "analyst|organizer": 3, "organizer|skeptic": 5, "mediator|organizer": 3,
  "driver|driver": 3, "catalyst|driver": 4, "driver|performer": 4, "driver|harmonizer": 5, "analyst|driver": 3, "driver|skeptic": 3, "driver|mediator": 3,
  "catalyst|catalyst": 5, "catalyst|performer": 5, "catalyst|harmonizer": 5, "analyst|catalyst": 2, "catalyst|skeptic": 3, "catalyst|mediator": 3,
  "performer|performer": 3, "harmonizer|performer": 5, "analyst|performer": 3, "performer|skeptic": 2, "mediator|performer": 4,
  "harmonizer|harmonizer": 4, "analyst|harmonizer": 4, "harmonizer|skeptic": 4, "harmonizer|mediator": 5,
  "analyst|analyst": 3, "analyst|skeptic": 4, "analyst|mediator": 4,
  "skeptic|skeptic": 3, "mediator|skeptic": 4,
  "mediator|mediator": 3,
};
export const hearts = (a: TypeKey, b: TypeKey) => HEARTS[pairKey(a, b)];

export const CATEGORIES = ["romance", "warmth", "communication", "home", "providing", "ambition", "fun", "loyalty", "family"] as const;
export type Category = (typeof CATEGORIES)[number];

/** How much each type brings to a category (0 to 1), and adjustments for pairs that clash or click there (points). */
const RULES: Record<Category, { types: W; pairs: Record<string, number> }> = {
  romance: { types: { performer: 1, catalyst: 0.9, harmonizer: 0.7, driver: 0.5, mediator: 0.5 }, pairs: { "catalyst|performer": 8, "skeptic|skeptic": -8, "organizer|skeptic": -6, "analyst|analyst": -6 } },
  warmth: { types: { harmonizer: 1, mediator: 0.9, performer: 0.4, catalyst: 0.3, organizer: 0.2 }, pairs: { "driver|driver": -8, "harmonizer|mediator": 6, "analyst|skeptic": -6 } },
  communication: { types: { harmonizer: 0.8, mediator: 0.8, organizer: 0.5, analyst: 0.4, catalyst: 0.4, skeptic: 0.3 }, pairs: { "driver|driver": -12, "catalyst|skeptic": -8, "catalyst|organizer": -8, "driver|harmonizer": 6, "catalyst|driver": 4, "driver|performer": -6 } },
  home: { types: { organizer: 1, harmonizer: 0.8, skeptic: 0.7, mediator: 0.4, analyst: 0.2 }, pairs: { "catalyst|catalyst": -10, "performer|performer": -8, "organizer|skeptic": 6, "catalyst|performer": -6 } },
  providing: { types: { driver: 1, organizer: 0.8, skeptic: 0.7, catalyst: 0.5, analyst: 0.3 }, pairs: { "catalyst|catalyst": -10, "catalyst|performer": -8, "organizer|skeptic": 6, "driver|organizer": 6, "mediator|mediator": -8 } },
  ambition: { types: { driver: 1, catalyst: 0.7, organizer: 0.6, analyst: 0.5, performer: 0.5 }, pairs: { "driver|driver": 4, "mediator|mediator": -8, "harmonizer|mediator": -6, "catalyst|driver": 6 } },
  fun: { types: { catalyst: 1, performer: 0.9, driver: 0.5, harmonizer: 0.3, mediator: 0.2 }, pairs: { "skeptic|skeptic": -10, "organizer|skeptic": -8, "catalyst|performer": 6, "organizer|organizer": -6 } },
  loyalty: { types: { skeptic: 1, mediator: 0.9, organizer: 0.8, harmonizer: 0.7, analyst: 0.5, driver: 0.3 }, pairs: { "catalyst|catalyst": -10, "catalyst|performer": -8, "mediator|skeptic": 6, "organizer|skeptic": 4 } },
  family: { types: { harmonizer: 1, organizer: 0.8, mediator: 0.6, skeptic: 0.5, driver: 0.4, performer: 0.3 }, pairs: { "catalyst|performer": -6, "harmonizer|organizer": 6, "driver|harmonizer": 4 } },
};

/** Every "category:a|b" the rules adjust; the content files must have a line for each (tested). */
export const adjustedPairKeys = (): string[] => CATEGORIES.flatMap((c) => Object.keys(RULES[c].pairs).map((p) => `${c}:${p}`));

export const ROLES = ["engine", "anchor", "peacemaker", "planner", "treasurer"] as const;
export type Role = (typeof ROLES)[number];
const ROLE_TYPES: Record<Role, W> = {
  engine: { driver: 1, catalyst: 0.8, performer: 0.5 },
  anchor: { organizer: 1, skeptic: 0.8, harmonizer: 0.5, mediator: 0.3 },
  peacemaker: { harmonizer: 1, mediator: 0.9, organizer: 0.2 },
  planner: { organizer: 1, analyst: 0.6, skeptic: 0.6, driver: 0.3 },
  treasurer: { skeptic: 1, organizer: 0.8, analyst: 0.5 },
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n * 10) / 10;

/** Soft OR over a partner's types: 0 to 100. */
function presence(weights: W, scores: Map<string, number>): number {
  let miss = 1;
  for (const [type, w] of Object.entries(weights) as Array<[TypeKey, number]>) miss *= 1 - w * (scores.get(type) ?? 0) / 100;
  return 100 * (1 - miss);
}
/** The type that does most of the work for this partner in this category. */
function strongest(weights: W, scores: Map<string, number>): TypeKey {
  return (Object.entries(weights) as Array<[TypeKey, number]>).sort((x, y) => y[1] * (scores.get(y[0]) ?? 0) - x[1] * (scores.get(x[0]) ?? 0))[0][0];
}
/** Leader and runner-up with weights summing to 1. */
function topTwo(scores: Map<string, number>): Array<[TypeKey, number]> {
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2) as Array<[TypeKey, number]>;
  const total = sorted.reduce((s, [, v]) => s + v, 0) || 1;
  return sorted.map(([k, v]) => [k, v / total]);
}

export interface CategoryFit { key: Category; score: number; a: { presence: number; type: TypeKey }; b: { presence: number; type: TypeKey }; adjust: number; pair: string }
export interface MatchFit {
  /** 0 to 100. */
  score: number;
  band: "natural" | "strong" | "complementary" | "challenging";
  /** AVOCO-style hearts for the two leading types, and the soft blend over leaders and runners-up as 0 to 100. */
  hearts: number;
  heartsBlend: number;
  leaders: [TypeKey, TypeKey];
  leaderScores: [number, number];
  categories: CategoryFit[];
  /** Who holds each role, or null when neither partner has it. */
  roles: Array<{ role: Role; who: "a" | "b" | null; a: number; b: number }>;
  /** Today's tone per partner from the emotional scales, or null without them. */
  today: { a: Today | null; b: Today | null };
}
export interface Today { calm: number; warmth: number }

function today(scales: Scores | null | undefined): Today | null {
  if (!scales?.length) return null;
  const m = new Map(scales.map((s) => [s.key, s.value]));
  const avg = (...keys: string[]) => { const v = keys.map((k) => m.get(k)).filter((x): x is number => x !== undefined); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN; };
  const calm = avg("stress_tolerance", "self_control", "person_harmonicity"), warmth = avg("kindness", "emo_engage");
  return Number.isNaN(calm) || Number.isNaN(warmth) ? null : { calm: round(calm), warmth: round(warmth) };
}

export const bandOf = (score: number): MatchFit["band"] => (score >= 78 ? "natural" : score >= 63 ? "strong" : score >= 48 ? "complementary" : "challenging");

/** Reads two profiles against each other. Null unless both have all eight types. `withFamily` includes the parenting category. */
export function matchFit(a: Scores, b: Scores, opts: { scalesA?: Scores | null; scalesB?: Scores | null; withFamily?: boolean } = {}): MatchFit | null {
  const sa = new Map(a.map((s) => [s.key, s.value])), sb = new Map(b.map((s) => [s.key, s.value]));
  if (TYPE_KEYS.some((t) => !sa.has(t) || !sb.has(t))) return null;
  const leaders: [TypeKey, TypeKey] = [topTwo(sa)[0][0], topTwo(sb)[0][0]];
  const heartsBlend = topTwo(sa).reduce((s, [ta, wa]) => s + topTwo(sb).reduce((s2, [tb, wb]) => s2 + wa * wb * hearts(ta, tb), 0), 0);

  const categories: CategoryFit[] = CATEGORIES.filter((c) => c !== "family" || opts.withFamily).map((key) => {
    const rule = RULES[key];
    const pa = presence(rule.types, sa), pb = presence(rule.types, sb);
    const either = 100 * (1 - (1 - pa / 100) * (1 - pb / 100));
    const pair = pairKey(leaders[0], leaders[1]);
    const adjust = rule.pairs[pair] ?? 0;
    return { key, score: round(clamp(0.5 * either + 0.5 * (pa + pb) / 2 + adjust, 4, 98)), a: { presence: round(pa), type: strongest(rule.types, sa) }, b: { presence: round(pb), type: strongest(rule.types, sb) }, adjust, pair };
  });

  const roles = ROLES.map((role) => {
    const pa = round(presence(ROLE_TYPES[role], sa)), pb = round(presence(ROLE_TYPES[role], sb));
    const who = Math.max(pa, pb) < 25 ? null : pa >= pb ? "a" as const : "b" as const;
    return { role, who, a: pa, b: pb };
  });

  const catMean = categories.reduce((s, c) => s + c.score, 0) / categories.length;
  const coverage = categories.reduce((s, c) => s + Math.max(c.a.presence, c.b.presence), 0) / categories.length;
  const score = round(clamp(0.4 * ((heartsBlend - 1) / 4) * 100 + 0.45 * catMean + 0.15 * coverage));
  return { score, band: bandOf(score), hearts: hearts(leaders[0], leaders[1]), heartsBlend: round(heartsBlend), leaders, leaderScores: [sa.get(leaders[0])!, sb.get(leaders[1])!], categories, roles, today: { a: today(opts.scalesA), b: today(opts.scalesB) } };
}
