import { notFound } from "next/navigation";
import { ReportView, type Report } from "@/components/ReportView";
import { zoneOf } from "@/lib/report";
import { formatDate, getDict } from "@/lib/i18n";

// Sample scores, to look at the report's design without recording. Development only. ?two=1 shows two leading types.
const PSY: Array<[string, number]> = [["catalyst", 78.4], ["driver", 46.2], ["performer", 41], ["harmonizer", 33.5], ["organizer", 27.8], ["mediator", 21], ["skeptic", 17.3], ["analyst", 12.6]];
const EMO: Array<[string, number]> = [["energy_level", 82], ["expressivity", 76], ["ability_to_attract", 71], ["openness_to_new", 66], ["emo_engage", 61], ["emotional_confidence", 58], ["ability_to_assert", 52], ["person_manifestation", 49], ["authority", 44], ["ability_to_set_goals", 40], ["kindness", 37], ["stress_tolerance", 33], ["person_harmonicity", 28], ["self_control", 22]];

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ two?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const [{ two }, { locale, t }] = await Promise.all([searchParams, getDict()]);
  const psy = (two ? PSY.map(([key, value]): [string, number] => (key === "driver" ? [key, 63.1] : [key, value])) : PSY);
  const created = "2026-09-21T10:00:00.000Z";
  const report: Report = {
    id: "preview", status: "completed", created_at: created, error: null,
    psytype: psy.map(([key, value]) => ({ key, label: key, value, zone: zoneOf(value) })),
    emostate: EMO.map(([key, value]) => ({ key, label: key, value })),
  };
  return <ReportView key={locale} initial={report} recordedOn={formatDate(created, locale)} t={t} deleteUrl={null} back={null} />;
}
