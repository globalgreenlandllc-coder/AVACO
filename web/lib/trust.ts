/**
 * Trust and reliability, read from the balance of the eight types: whether a promise made is a promise kept, how
 * seriously the person takes things, whether they say what they mean, and whether they stay. AVOCO scores the types;
 * the weights here say how much each type carries of each facet. A tendency read from the profile, never a verdict.
 * The words are in lib/i18n/trust-*.ts; tested in tests/trust.test.ts.
 */
export const TRUST_TYPES = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"] as const;
export type TrustType = (typeof TRUST_TYPES)[number];
export const FACETS = ["promises", "seriousness", "candor", "loyalty"] as const;
export type Facet = (typeof FACETS)[number];
export type TrustBand = "high" | "mid" | "low";

/** How much of each facet a type carries (0..1). */
const WEIGHTS: Record<Facet, Record<TrustType, number>> = {
  promises:    { organizer: 1.0, analyst: 0.85, skeptic: 0.75, harmonizer: 0.65, driver: 0.6, mediator: 0.35, performer: 0.15, catalyst: 0.15 },
  seriousness: { analyst: 1.0, organizer: 0.9, skeptic: 0.9, driver: 0.7, harmonizer: 0.5, mediator: 0.4, catalyst: 0.15, performer: 0.1 },
  candor:      { driver: 1.0, skeptic: 0.9, analyst: 0.7, organizer: 0.6, catalyst: 0.5, performer: 0.45, harmonizer: 0.3, mediator: 0.15 },
  loyalty:     { harmonizer: 1.0, organizer: 0.8, mediator: 0.75, skeptic: 0.6, driver: 0.5, analyst: 0.5, performer: 0.3, catalyst: 0.2 },
};
// The weighted mean sits between about 0.2 (all mass on the lightest types) and 0.8; stretched to 0..100.
const FLOOR = 0.2, SPAN = 0.6;

export const trustBand = (score: number): TrustBand => (score >= 65 ? "high" : score >= 40 ? "mid" : "low");

export interface FacetReading { key: Facet; score: number; band: TrustBand; /** The two types that carry most of this facet's score. */ from: TrustType[] }
export interface TrustReading { overall: number; band: TrustBand; facets: FacetReading[]; leading: TrustType }

/** Null unless all eight types were scored. */
export function trustReading(types: Array<{ key: string; value: number }>): TrustReading | null {
  const score = new Map(types.map((t) => [t.key, Math.max(0, t.value)]));
  if (!TRUST_TYPES.every((k) => score.has(k))) return null;
  const mass = TRUST_TYPES.reduce((sum, k) => sum + score.get(k)!, 0);
  if (mass <= 0) return null;
  const facets = FACETS.map((key) => {
    const parts = TRUST_TYPES.map((type) => ({ type, part: WEIGHTS[key][type] * score.get(type)! }));
    const mean = parts.reduce((sum, p) => sum + p.part, 0) / mass;
    const s = Math.round(Math.min(1, Math.max(0, (mean - FLOOR) / SPAN)) * 100);
    return { key, score: s, band: trustBand(s), from: [...parts].sort((a, b) => b.part - a.part).slice(0, 2).map((p) => p.type) };
  });
  const overall = Math.round(facets.reduce((sum, f) => sum + f.score, 0) / facets.length);
  const leading = [...TRUST_TYPES].sort((a, b) => score.get(b)! - score.get(a)!)[0];
  return { overall, band: trustBand(overall), facets, leading };
}
