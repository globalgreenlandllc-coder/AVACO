/**
 * "Where you can do your best work": a fit score per field of work, calculated by this platform.
 * AVOCO's API has no such score. Each field is tied to the personality types whose official AVOCO
 * descriptions name that kind of work, with a weight; the fit is the weighted average of the person's
 * scores on those types, so it stays on the same 0 to 100 scale as the types themselves.
 */
export const FIELDS = {
  leadership: { driver: 1, organizer: 0.5, catalyst: 0.3 },
  operations: { organizer: 1, skeptic: 0.5 },
  sales: { catalyst: 1, driver: 0.5, performer: 0.5 },
  innovation: { catalyst: 1, analyst: 0.5, driver: 0.3 },
  stage: { performer: 1, catalyst: 0.4 },
  marketing: { performer: 0.7, catalyst: 0.7, analyst: 0.3 },
  people: { harmonizer: 1, mediator: 0.6 },
  research: { analyst: 1, skeptic: 0.4 },
  quality: { skeptic: 1, organizer: 0.5, analyst: 0.3 },
  arts: { mediator: 0.8, analyst: 0.6, performer: 0.4, harmonizer: 0.3 },
  helping: { harmonizer: 0.8, mediator: 0.8 },
} as const satisfies Record<string, Record<string, number>>;

export type FieldKey = keyof typeof FIELDS;
export interface FieldFit {
  key: FieldKey;
  /** 0 to 100, one decimal. */
  score: number;
  /** The types behind the score, strongest contribution first. */
  drivers: Array<{ type: string; value: number }>;
}

/** Every field, best fit first. Returns nothing unless all eight types were scored. */
export function fieldFits(types: Array<{ key: string; value: number }>): FieldFit[] {
  const scores = new Map(types.map((t) => [t.key, t.value]));
  const needed = new Set(Object.values(FIELDS).flatMap((weights) => Object.keys(weights)));
  if ([...needed].some((type) => !scores.has(type))) return [];

  return (Object.entries(FIELDS) as Array<[FieldKey, Record<string, number>]>)
    .map(([key, weights]) => {
      const parts = Object.entries(weights).map(([type, weight]) => ({ type, weight, value: scores.get(type)! }));
      const total = parts.reduce((sum, p) => sum + p.weight, 0);
      const score = parts.reduce((sum, p) => sum + p.weight * p.value, 0) / total;
      const drivers = [...parts].sort((a, b) => b.weight * b.value - a.weight * a.value).map(({ type, value }) => ({ type, value }));
      return { key, score: Math.round(score * 10) / 10, drivers };
    })
    .sort((a, b) => b.score - a.score);
}
