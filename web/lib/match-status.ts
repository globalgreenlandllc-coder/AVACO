/**
 * Everything a match page or poll needs, both for the orderer and for the partner: the stage the partner is at,
 * both people's own reports, and the couple's report once it exists. Strings pre-localized. Server only.
 */
import "server-only";
import { publicReport } from "./api";
import { consensus } from "./consensus";
import { gateway } from "./gateway";
import { formatDate, type Dict } from "./i18n";
import type { MatchReport } from "./match-report";
import { stageOf, type Stage } from "./match-stage";
import { buildMatch, partnerAnalyses, type Match } from "./matches";
import { profileFor } from "./profile";

export interface Side { name: string; leading: { name: string; value: number } | null; recordedAt: string | null }
export interface MatchStatus {
  status: "waiting" | "processing" | "ready";
  stage: Stage;
  owner: Side;
  partner: Side & { openedAt: string | null; startedAt: string | null };
  partnerName: string;
  ownerName: string;
  report: MatchReport | null;
  /** Each person's own report, for the other one to read. Null until it exists. */
  ownerReport: ReturnType<typeof publicReport> | null;
  partnerReport: ReturnType<typeof publicReport> | null;
}

export async function matchStatus(match: Match, t: Dict, locale: string): Promise<MatchStatus> {
  const [own, partner, report] = await Promise.all([gateway.getAnalysis(match.analysisId), partnerAnalyses(match), buildMatch(match, t, locale)]);
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const leadingOf = (psytype: Array<{ key: string; value: number }> | null | undefined) => { const l = psytype?.length ? [...psytype].sort((a, b) => b.value - a.value)[0] : null; return l ? { name: typeName(l.key), value: l.value } : null; };
  const when = (d: Date | string | null | undefined) => (d ? formatDate(typeof d === "string" ? d : d.toISOString(), locale) : null);

  const ownerProfile = own ? (await profileFor(match.ownerId, own)).psytype : null;
  const ownerReport = own ? publicReport({ ...own, psytype: ownerProfile ?? own.psytype }) : null;
  const done = partner.filter((a) => a.status === "completed" && a.psytype?.length);
  const partnerProfile = done.length ? (consensus(done.map((a) => ({ id: a.id, created_at: a.created_at, psytype: a.psytype! })))?.scores ?? done[0].psytype) : null;
  const latest = partner[0] ?? null;
  const partnerReport = latest ? publicReport({ ...latest, psytype: latest.status === "completed" ? (partnerProfile ?? latest.psytype) : latest.psytype }) : null;
  const stage = stageOf({ openedAt: match.partnerOpenedAt, startedAt: match.partnerStartedAt, analyses: partner });

  return {
    status: report ? "ready" : latest ? "processing" : "waiting",
    stage,
    owner: { name: match.ownerName, leading: leadingOf(ownerProfile), recordedAt: when(own?.created_at) },
    partner: { name: match.partnerName, leading: leadingOf(partnerProfile), recordedAt: when(latest?.created_at), openedAt: when(match.partnerOpenedAt), startedAt: when(match.partnerStartedAt) },
    partnerName: match.partnerName, ownerName: match.ownerName,
    report, ownerReport, partnerReport,
  };
}
