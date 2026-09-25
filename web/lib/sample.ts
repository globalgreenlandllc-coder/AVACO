import type { Report } from "@/components/ReportView";
import { zoneOf } from "./report";

/**
 * The public sample report (/sample, and the landing page's teaser): a leading Analyst with an active
 * Mediator, the profile Dima picked to show visitors what a report contains. Real-looking scores, no
 * real person. Everything else (texts, best-fit fields, compatibility) is computed from these numbers
 * exactly as for a real recording.
 */
export const SAMPLE_RECORDED_AT = "2026-09-24T09:30:00.000Z";

export const SAMPLE_PSY: Array<[string, number]> = [
  ["analyst", 64.2], ["mediator", 47.5], ["skeptic", 38.6], ["harmonizer", 31.2],
  ["organizer", 27.9], ["catalyst", 23.4], ["driver", 17.8], ["performer", 12.1],
];

export const SAMPLE_EMO: Array<[string, number]> = [
  ["openness_to_new", 74], ["self_control", 68], ["person_harmonicity", 63], ["stress_tolerance", 61],
  ["kindness", 58], ["emotional_confidence", 55], ["ability_to_set_goals", 52], ["energy_level", 47],
  ["expressivity", 41], ["emo_engage", 39], ["ability_to_assert", 36], ["person_manifestation", 34],
  ["authority", 31], ["ability_to_attract", 29],
];

export function sampleReport(): Report {
  return {
    id: "sample", status: "completed", created_at: SAMPLE_RECORDED_AT, error: null,
    psytype: SAMPLE_PSY.map(([key, value]) => ({ key, label: key, value, zone: zoneOf(value) })),
    emostate: SAMPLE_EMO.map(([key, value]) => ({ key, label: key, value })),
  };
}
