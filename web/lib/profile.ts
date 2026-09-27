/**
 * What a person's report is about: their profile across recordings (lib/consensus.ts) when they have several,
 * otherwise this one recording. Only the recordings of the same person count (lib/people.ts): someone else recorded
 * on the account is never averaged in. Used by the report page, the polling route and the industry route alike, so
 * every view of a report agrees. Server only.
 */
import "server-only";
import { consensus, type Consensus } from "./consensus";
import { gateway, type Analysis } from "./gateway";
import { namesFor, personKey, reportsOf } from "./people";

/** `person`: whose voice this report is; null for the account holder's own. */
export interface Profile { psytype: Analysis["psytype"]; consensus: Consensus | null; person: string | null }

/** The consensus across every completed recording of the same person filed under `owner`, applied to `analysis`. */
export async function profileFor(owner: string, analysis: Analysis): Promise<Profile> {
  const names = await namesFor(owner);
  const person = names.get(analysis.id) ?? null;
  if (analysis.status !== "completed" || !analysis.psytype?.length) return { psytype: analysis.psytype, consensus: null, person };
  const all = await gateway.listAllFor(owner).catch(() => [] as Analysis[]);
  const takes = reportsOf(all, names, personKey(person)).filter((a) => a.status === "completed" && a.psytype?.length).map((a) => ({ id: a.id, created_at: a.created_at, psytype: a.psytype! }));
  if (!takes.some((t) => t.id === analysis.id)) takes.push({ id: analysis.id, created_at: analysis.created_at, psytype: analysis.psytype });
  const c = consensus(takes);
  if (!c) return { psytype: analysis.psytype, consensus: null, person };
  return { psytype: c.scores.map((s) => ({ key: s.key, label: s.label, value: s.value, zone: s.zone })), consensus: c, person };
}
