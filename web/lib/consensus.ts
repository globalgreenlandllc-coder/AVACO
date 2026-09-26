/**
 * A person's type profile across all their recordings.
 *
 * AVOCO's type result is, in practice, a classification: one leading type with a real score, a runner-up fixed
 * at 45, six low scores. A borderline voice therefore flips between two or three types from one recording to
 * the next, and three bought reports could name three different types. Averaging every completed recording
 * gives a profile that settles as recordings accumulate; the agreement says how settled it is. Pure, tested.
 */
export interface Take { id: string; created_at: string; psytype: Array<{ key: string; label: string; value: number }> }
export interface ConsensusScore { key: string; label: string; value: number; zone: "leading" | "active" | "background" }
export interface Consensus {
  n: number;
  /** Averaged scores, best first, on AVOCO's 0 to 100 scale. */
  scores: ConsensusScore[];
  leader: string;
  /** Share of recordings in which the consensus leader also led on its own, 0 to 1. */
  agreement: number;
  /** Each recording's own leading type, newest first. */
  recordings: Array<{ id: string; created_at: string; key: string; value: number }>;
}

const zoneOf = (v: number) => (v >= 50 ? "leading" : v >= 30 ? "active" : "background") as ConsensusScore["zone"];
const round = (n: number) => Math.round(n * 10) / 10;
const leaderOf = (t: Take) => [...t.psytype].sort((a, b) => b.value - a.value)[0];

/** Null with fewer than two usable recordings: then the single recording is the profile. */
export function consensus(takes: Take[]): Consensus | null {
  const usable = takes.filter((t) => t.psytype?.length >= 8);
  if (usable.length < 2) return null;
  const sums = new Map<string, { label: string; total: number; n: number }>();
  for (const t of usable) for (const p of t.psytype) {
    const s = sums.get(p.key) ?? { label: p.label, total: 0, n: 0 };
    s.total += p.value; s.n++; sums.set(p.key, s);
  }
  const scores = [...sums.entries()].map(([key, s]) => { const value = round(s.total / s.n); return { key, label: s.label, value, zone: zoneOf(value) }; }).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  const leader = scores[0].key;
  const recordings = usable.map((t) => { const l = leaderOf(t); return { id: t.id, created_at: t.created_at, key: l.key, value: l.value }; }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const agreement = recordings.filter((r) => r.key === leader).length / recordings.length;
  return { n: usable.length, scores, leader, agreement, recordings };
}

/** high: the leader led at least three quarters of the time; medium: at least half; low: less. */
export const agreementBand = (a: number): "high" | "medium" | "low" => (a >= 0.75 ? "high" : a >= 0.5 ? "medium" : "low");
