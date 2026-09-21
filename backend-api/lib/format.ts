/** Readable output: labels, zones, rounding and the public analysis shape. */
import type { ScaleValue } from "./avoco";
import type { Analysis } from "./db/schema";

export interface PsytypeResult { key: string; label: string; value: number; zone: Zone }
export interface EmostateResult { key: string; label: string; value: number }
export type Zone = "leading" | "active" | "background";

const PSYTYPE_LABELS: Record<string, string> = {
  organizer: "Organizer", driver: "Driver", catalyst: "Catalyst", performer: "Performer",
  harmonizer: "Harmonizer", analyst: "Analyst", skeptic: "Skeptic", mediator: "Mediator",
};
const EMOSTATE_LABELS: Record<string, string> = {
  energy_level: "Cheerfulness", stress_tolerance: "Stability", openness_to_new: "Openness to experience",
  emotional_confidence: "Emotionality", ability_to_assert: "Independence", ability_to_set_goals: "Fulfillment",
  self_control: "Self-control", ability_to_attract: "Attractiveness", person_manifestation: "Demonstrativeness",
  person_harmonicity: "Composure", authority: "Dominance", kindness: "Friendliness",
  expressivity: "Expressiveness", emo_engage: "Inspiration",
};

export function zoneOf(value: number): Zone {
  return value >= 50 ? "leading" : value >= 30 ? "active" : "background";
}

export function formatPsytype(scales: ScaleValue[]): PsytypeResult[] {
  return [...scales].sort((a, b) => b.value - a.value).map((s) => ({
    key: s.name,
    label: PSYTYPE_LABELS[s.name] ?? s.name,
    value: Math.round(s.value * 10) / 10,
    zone: zoneOf(s.value),
  }));
}

export function formatEmostate(scales: ScaleValue[]): EmostateResult[] {
  return [...scales].sort((a, b) => b.value - a.value).map((s) => ({
    key: s.name,
    label: EMOSTATE_LABELS[s.name] ?? s.name,
    value: Math.round(s.value),
  }));
}

/** Keeps only well-formed entries, so an unexpected upstream payload can never crash formatting. */
export function parseScales(input: unknown): ScaleValue[] | null {
  if (!Array.isArray(input)) return null;
  return input.flatMap((item) => {
    const s = item as Partial<ScaleValue> | null;
    if (!s || typeof s.name !== "string" || typeof s.value !== "number" || !Number.isFinite(s.value)) return [];
    return [{ id: typeof s.id === "number" ? s.id : 0, name: s.name, value: s.value }];
  });
}

/** The public shape of a stored analysis. */
export function formatAnalysis(row: Analysis) {
  return {
    id: row.id,
    status: row.status,
    type: row.type,
    external_user_id: row.externalUserId,
    created_at: row.createdAt.toISOString(),
    completed_at: row.completedAt?.toISOString() ?? null,
    psytype: row.psytype ?? null,
    emostate: row.emostate ?? null,
    error: row.error ?? null,
  };
}
