/** A partner-page report: the same report view as everywhere else, with no account behind it. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerRemember } from "@/components/PartnerHistory";
import { ReportView } from "@/components/ReportView";
import { publicReport } from "@/lib/api";
import { formatDate, getDict } from "@/lib/i18n";
import { industryNames } from "@/lib/industry-chapter";
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
        industry={{ industries: industryNames(locale), chapterUrl: `/api/partners/r/${analysis.id}/industry/{key}` }}
        lead={<p className="no-print text-sm leading-relaxed text-ink-2">{p.note} <Link href="/partners" className="font-semibold text-accent-text hover:underline">{p.another}</Link></p>}
      />
    </>
  );
}
