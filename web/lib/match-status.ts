/** What a match page or poll answers: waiting for the partner, AVOCO still working, or the finished report. Server only. */
import "server-only";
import { publicReport } from "./api";
import type { Dict } from "./i18n";
import type { MatchReport } from "./match-report";
import { buildMatch, partnerAnalyses, type Match } from "./matches";

export interface MatchStatus { status: "waiting" | "processing" | "ready"; partnerName: string; ownerName: string; report: MatchReport | null; partnerReport: ReturnType<typeof publicReport> | null }

export async function matchStatus(match: Match, t: Dict, locale: string): Promise<MatchStatus> {
  const partner = await partnerAnalyses(match);
  const latest = partner[0] ?? null;
  const report = await buildMatch(match, t, locale);
  const status = report ? "ready" : latest ? "processing" : "waiting";
  return { status, partnerName: match.partnerName, ownerName: match.ownerName, report, partnerReport: latest ? publicReport(latest) : null };
}
