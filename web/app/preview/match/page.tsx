import { notFound } from "next/navigation";
import { MatchView, type MatchState } from "@/components/MatchView";
import { getDict } from "@/lib/i18n";
import { matchFit } from "@/lib/match";
import { matchReport } from "@/lib/match-report";
import { SAMPLE_EMO, SAMPLE_PSY } from "@/lib/sample";

// A finished couple's report from two sample voices, to look at its design without two recordings. Development only.
const PARTNER: Array<[string, number]> = [["catalyst", 71.2], ["performer", 52.4], ["driver", 44.8], ["harmonizer", 36.1], ["organizer", 24.5], ["mediator", 19.3], ["skeptic", 14.2], ["analyst", 11.7]];

export default async function MatchPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale, t } = await getDict();
  const scores = (list: Array<[string, number]>) => list.map(([key, value]) => ({ key, value }));
  const fit = matchFit(scores(SAMPLE_PSY), scores(PARTNER), { scalesA: scores(SAMPLE_EMO), withFamily: true });
  if (!fit) notFound();
  const name = (key: string) => t.psytypes[key as keyof typeof t.psytypes].name;
  const state: MatchState = {
    status: "ready", stage: "ready", ownerName: "Alex", partnerName: "Sam",
    owner: { name: "Alex", leading: { name: name(SAMPLE_PSY[0][0]), value: SAMPLE_PSY[0][1] }, recordedAt: "24 Sep" },
    partner: { name: "Sam", leading: { name: name(PARTNER[0][0]), value: PARTNER[0][1] }, recordedAt: "25 Sep", openedAt: "2026-09-25T09:00:00.000Z", startedAt: "2026-09-25T09:02:00.000Z" },
    report: matchReport(fit, { a: "Alex", b: "Sam" }, t, locale),
  };
  return <MatchView key={locale} initial={state} pollUrl="/api/preview/none" waiting={null} side="owner" t={t.match} />;
}
