/**
 * A partner-page report: the same report view as everywhere else, with no account behind it. Here the add-ons come right
 * under the cover, since showing them is the point: the industries (Career Fit, Best-Fit Industry) and a couple's report
 * from a second voice (app/partners/couple), all free.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerCoupleCard } from "@/components/PartnerCoupleCard";
import { PartnerRemember } from "@/components/PartnerHistory";
import { ReportView } from "@/components/ReportView";
import { publicReport } from "@/lib/api";
import { formatDate, getDict } from "@/lib/i18n";
import { INDUSTRY_KEYS } from "@/lib/industries";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";
import { MATCH_KINDS } from "@/lib/match-kind";
import { partnerAnalysis } from "@/lib/partners";

export const metadata = { robots: { index: false, follow: false } };

export default async function PartnerReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { t, locale }] = await Promise.all([params, getDict()]);
  const analysis = await partnerAnalysis(id);
  if (!analysis) notFound();
  const p = t.partners;
  return (
    <>
      <PartnerRemember id={analysis.id} />
      <ReportView
        key={locale}
        initial={publicReport(analysis)}
        recordedOn={formatDate(analysis.created_at, locale)}
        t={t}
        pollUrl={`/api/partners/r/${analysis.id}`}
        deleteUrl={`/api/partners/r/${analysis.id}`}
        afterDeleteHref={`/partners?forget=${encodeURIComponent(analysis.id)}`}
        back={{ href: "/partners", label: p.back }}
        industry={{
          industries: industryNames(t), chapterUrl: `/api/partners/r/${analysis.id}/industry/{key}`, teaser: industryTeaser("it", analysis.psytype ?? [], t),
          // The best-match finder too, free like the chapters here, and still asked for with a click so it never appears unasked.
          best: { url: `/api/partners/r/${analysis.id}/best`, open: false, total: INDUSTRY_KEYS.length, needed: 0, free: true, admin: false, price: t.finder.offer.free, payLabel: "" },
        }}
        lead={<p className="no-print text-sm leading-relaxed text-ink-2">{p.note} <Link href="/partners" className="font-semibold text-accent-text hover:underline">{p.another}</Link></p>}
        addonsFirst
        addonsHead={{ title: p.couple.addonsTitle, lead: p.couple.addonsLead }}
        addonsExtra={analysis.status === "completed" ? <PartnerCoupleCard t={p.couple} kinds={MATCH_KINDS.map((k) => t.content.match.kinds[k].label)} href={`/partners/couple?a=${analysis.id}`} /> : null}
      />
    </>
  );
}
