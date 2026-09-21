/**
 * "Where you can do your best work": a fit score per field of work, calculated by this platform.
 * AVOCO's API has no such score; this uses everything the API does return.
 *
 *  - Personality (the 8 type scores) is the main signal. Each field lists the types whose official AVOCO
 *    descriptions name that kind of work, with weights.
 *  - Emotional state (the 14 scales) is the second signal: the scales that kind of work leans on, e.g.
 *    composure and self-control for customer service, dominance and goal-setting for leadership.
 *    It counts for a quarter of the score, because it describes today, not the person in general.
 *
 * Both parts are weighted averages on the API's own 0 to 100 scale, so the result stays on that scale.
 * The weights are a judgement; this file is the one place to tune them.
 */
export const STATE_SHARE = 0.25;

export const SECTORS = ["business", "market", "people", "tech", "creative", "practical"] as const;
export type Sector = (typeof SECTORS)[number];

interface FieldRule { sector: Sector; types: Record<string, number>; scales: Record<string, number> }

export const FIELDS = {
  // business and management
  leadership: { sector: "business", types: { driver: 1, organizer: 0.5, catalyst: 0.3 }, scales: { authority: 1, ability_to_set_goals: 1, ability_to_assert: 0.7, stress_tolerance: 0.7 } },
  entrepreneurship: { sector: "business", types: { catalyst: 1, driver: 0.8, analyst: 0.3 }, scales: { energy_level: 1, openness_to_new: 1, ability_to_set_goals: 0.7, ability_to_assert: 0.7 } },
  operations: { sector: "business", types: { organizer: 1, skeptic: 0.5 }, scales: { self_control: 1, stress_tolerance: 1, ability_to_set_goals: 0.6 } },
  projects: { sector: "business", types: { organizer: 1, driver: 0.4, catalyst: 0.3 }, scales: { ability_to_set_goals: 1, stress_tolerance: 0.8, self_control: 0.6 } },
  finance: { sector: "business", types: { skeptic: 1, organizer: 0.7, analyst: 0.4 }, scales: { self_control: 1, person_harmonicity: 0.7, stress_tolerance: 0.7 } },
  consulting: { sector: "business", types: { driver: 0.7, analyst: 0.7, catalyst: 0.5 }, scales: { ability_to_attract: 1, authority: 0.7, openness_to_new: 0.7 } },
  // sales and communication
  sales: { sector: "market", types: { catalyst: 1, driver: 0.5, performer: 0.5 }, scales: { ability_to_attract: 1, expressivity: 0.8, energy_level: 0.8, emo_engage: 0.6 } },
  service: { sector: "market", types: { harmonizer: 1, mediator: 0.4, organizer: 0.3 }, scales: { kindness: 1, self_control: 0.9, stress_tolerance: 0.9, person_harmonicity: 0.6 } },
  marketing: { sector: "market", types: { performer: 0.7, catalyst: 0.7, analyst: 0.3 }, scales: { expressivity: 1, openness_to_new: 0.8, emo_engage: 0.8 } },
  stage: { sector: "market", types: { performer: 1, catalyst: 0.4 }, scales: { expressivity: 1, person_manifestation: 0.9, ability_to_attract: 0.8, energy_level: 0.6 } },
  // people
  hr: { sector: "people", types: { harmonizer: 1, mediator: 0.5, organizer: 0.3 }, scales: { kindness: 1, person_harmonicity: 0.7, ability_to_attract: 0.6 } },
  teaching: { sector: "people", types: { harmonizer: 0.8, mediator: 0.6, performer: 0.5 }, scales: { kindness: 1, expressivity: 0.8, emo_engage: 0.8, self_control: 0.5 } },
  counselling: { sector: "people", types: { mediator: 1, harmonizer: 0.8 }, scales: { kindness: 1, person_harmonicity: 0.9, self_control: 0.7 } },
  healthcare: { sector: "people", types: { harmonizer: 0.8, skeptic: 0.7, organizer: 0.4 }, scales: { stress_tolerance: 1, kindness: 0.9, self_control: 0.8 } },
  social: { sector: "people", types: { mediator: 1, harmonizer: 0.7 }, scales: { kindness: 1, emo_engage: 0.8 } },
  // technical and analytical
  research: { sector: "tech", types: { analyst: 1, skeptic: 0.4, mediator: 0.2 }, scales: { openness_to_new: 1, ability_to_assert: 0.7, self_control: 0.6 } },
  it: { sector: "tech", types: { analyst: 1, skeptic: 0.5, organizer: 0.3 }, scales: { self_control: 1, openness_to_new: 0.8, person_harmonicity: 0.6 } },
  data: { sector: "tech", types: { analyst: 0.8, skeptic: 0.8 }, scales: { self_control: 1, person_harmonicity: 0.8 } },
  quality: { sector: "tech", types: { skeptic: 1, organizer: 0.5, analyst: 0.3 }, scales: { self_control: 1, stress_tolerance: 0.8 } },
  law: { sector: "tech", types: { skeptic: 0.8, organizer: 0.7, driver: 0.4 }, scales: { ability_to_assert: 1, self_control: 0.9, authority: 0.6 } },
  // creative
  arts: { sector: "creative", types: { mediator: 0.8, analyst: 0.6, performer: 0.4, harmonizer: 0.3 }, scales: { emotional_confidence: 1, expressivity: 0.9, openness_to_new: 0.8, emo_engage: 0.7 } },
  design: { sector: "creative", types: { analyst: 0.8, performer: 0.6, harmonizer: 0.5 }, scales: { openness_to_new: 1, expressivity: 0.7 } },
  // practical and service
  admin: { sector: "practical", types: { organizer: 1, skeptic: 0.6, harmonizer: 0.2 }, scales: { self_control: 1, stress_tolerance: 0.8 } },
  hospitality: { sector: "practical", types: { performer: 0.7, harmonizer: 0.7, catalyst: 0.5 }, scales: { kindness: 1, energy_level: 0.8, ability_to_attract: 0.8 } },
  safety: { sector: "practical", types: { organizer: 0.8, driver: 0.6, skeptic: 0.4 }, scales: { stress_tolerance: 1, self_control: 0.9, authority: 0.6 } },
} as const satisfies Record<string, FieldRule>;

export type FieldKey = keyof typeof FIELDS;
interface Part { key: string; value: number }

export interface FieldFit {
  key: FieldKey;
  sector: Sector;
  /** The overall fit, 0 to 100, one decimal. */
  score: number;
  /** The personality part alone. */
  typeScore: number;
  /** The emotional-state part alone; null when emotional scales weren't available (or a workspace hides them). */
  stateScore: number | null;
  /** What produced each part, strongest contribution first. */
  types: Part[];
  scales: Part[];
}

const round = (n: number) => Math.round(n * 10) / 10;

function weighted(weights: Record<string, number>, scores: Map<string, number>): { score: number; parts: Part[] } | null {
  const parts = Object.entries(weights).map(([key, weight]) => ({ key, weight, value: scores.get(key) }));
  if (parts.some((p) => p.value === undefined)) return null;
  const known = parts as Array<{ key: string; weight: number; value: number }>;
  const total = known.reduce((sum, p) => sum + p.weight, 0);
  return {
    score: known.reduce((sum, p) => sum + p.weight * p.value, 0) / total,
    parts: [...known].sort((a, b) => b.weight * b.value - a.weight * a.value).map(({ key, value }) => ({ key, value })),
  };
}

/**
 * Every field, best fit first. Returns nothing unless all eight types were scored.
 * Pass the emotional scales to include the state part; without them the score is personality alone.
 */
export function fieldFits(types: Part[], scales: Part[] | null = null): FieldFit[] {
  const typeScores = new Map(types.map((t) => [t.key, t.value]));
  const scaleScores = new Map((scales ?? []).map((s) => [s.key, s.value]));

  const fits: FieldFit[] = [];
  for (const [key, rule] of Object.entries(FIELDS) as Array<[FieldKey, FieldRule]>) {
    const personality = weighted(rule.types, typeScores);
    if (!personality) return [];
    const state = scaleScores.size > 0 ? weighted(rule.scales, scaleScores) : null;
    const score = state ? (1 - STATE_SHARE) * personality.score + STATE_SHARE * state.score : personality.score;
    fits.push({ key, sector: rule.sector, score: round(score), typeScore: round(personality.score), stateScore: state ? round(state.score) : null, types: personality.parts, scales: state?.parts ?? [] });
  }
  return fits.sort((a, b) => b.score - a.score || b.typeScore - a.typeScore);
}
