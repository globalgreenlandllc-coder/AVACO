/**
 * The sample couple, Alex and Sam: the sample profile (lib/sample.ts) with a warm partner, read by the real
 * couple's-report code with all nine areas. The couples page's card and the sample couple's report show the same couple.
 */
import type { Dict } from "./i18n";
import { matchFit } from "./match";
import { matchReport, type MatchReport } from "./match-report";
import { SAMPLE_EMO, SAMPLE_PSY } from "./sample";

export const SAMPLE_COUPLE = { a: "Alex", b: "Sam" };
const PARTNER: Array<[string, number]> = [["harmonizer", 64], ["mediator", 45], ["organizer", 22.6], ["analyst", 18.4], ["skeptic", 15.2], ["driver", 13.1], ["catalyst", 11.8], ["performer", 10.4]];
const scores = (list: Array<[string, number]>) => list.map(([key, value]) => ({ key, value }));

export function sampleCouple(t: Dict, locale: string): { report: MatchReport; partnerLeading: { key: string; value: number }; ownerLeading: { key: string; value: number } } | null {
  const fit = matchFit(scores(SAMPLE_PSY), scores(PARTNER), { scalesA: scores(SAMPLE_EMO), withFamily: true, kind: "couple" });
  if (!fit) return null;
  return { report: matchReport(fit, SAMPLE_COUPLE, t, locale, "couple"), ownerLeading: { key: SAMPLE_PSY[0][0], value: SAMPLE_PSY[0][1] }, partnerLeading: { key: PARTNER[0][0], value: PARTNER[0][1] } };
}
