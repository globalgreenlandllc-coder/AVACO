import { notFound } from "next/navigation";
import { PayWall } from "@/components/PayWall";
import { ReportView, type Report } from "@/components/ReportView";
import { teaserOf, zoneOf } from "@/lib/report";
import { formatDate, getDict } from "@/lib/i18n";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";

// Sample scores, to look at the report's design without recording. Development only. ?two=1 shows two leading types,
// ?locked=1 the free preview as a client sees it before paying (?takes=1 adds the recordings behind the profile).
const PSY: Array<[string, number]> = [["catalyst", 78.4], ["driver", 46.2], ["performer", 41], ["harmonizer", 33.5], ["organizer", 27.8], ["mediator", 21], ["skeptic", 17.3], ["analyst", 12.6]];
const EMO: Array<[string, number]> = [["energy_level", 82], ["expressivity", 76], ["ability_to_attract", 71], ["openness_to_new", 66], ["emo_engage", 61], ["emotional_confidence", 58], ["ability_to_assert", 52], ["person_manifestation", 49], ["authority", 44], ["ability_to_set_goals", 40], ["kindness", 37], ["stress_tolerance", 33], ["person_harmonicity", 28], ["self_control", 22]];

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ two?: string; locked?: string; takes?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const [{ two, locked, takes }, { locale, t }] = await Promise.all([searchParams, getDict()]);
  const psy = (two ? PSY.map(([key, value]): [string, number] => (key === "driver" ? [key, 63.1] : [key, value])) : PSY);
  const created = "2026-09-21T10:00:00.000Z";
  const report: Report = {
    id: "preview", status: "completed", created_at: created, error: null,
    psytype: psy.map(([key, value]) => ({ key, label: key, value, zone: zoneOf(value) })),
    emostate: EMO.map(([key, value]) => ({ key, label: key, value })),
  };
  // The industry add-on as a paying client sees it (the chapter itself needs a real report; here only the strip and the picker show).
  const industry = { industries: industryNames(t), chapterUrl: "/api/preview/industry/{key}", unlockUrl: "/api/preview/unlock", price: "1 credit · $9", teaser: industryTeaser("it", report.psytype ?? [], t) };
  if (locked) {
    const preview: Report = { ...report, psytype: null, emostate: null, locked: true, teaser: teaserOf(report.psytype, report.emostate) };
    const dates = ["2026-09-14", "2026-09-18", created].map((d, i) => ({ id: String(i), date: formatDate(d, locale).split(/,| at | в /)[0], current: i === 2 }));
    return <ReportView key={`${locale}-locked`} initial={preview} recordedOn={formatDate(created, locale)} t={t} deleteUrl={null} back={null} previewTakes={takes ? { n: 3, band: "medium", pct: 67, dates } : undefined} locked={<PayWall analysisId="preview" credits={0} fromPrice="$9.00" t={t.billing} />} />;
  }
  // The relationship-match add-on, with one couple's report under way and one finished.
  const match = { price: "$14.90 · or 2 credits", freeLabel: t.match.free, credits: 0, needed: 2, canOrder: true, existing: [{ id: "preview-1", partnerName: "Daniel", stage: "invited" as const }, { id: "preview-2", partnerName: "Anna", stage: "ready" as const }] };
  return <ReportView key={locale} initial={report} recordedOn={formatDate(created, locale)} t={t} deleteUrl={null} back={null} industry={industry} match={match} />;
}
