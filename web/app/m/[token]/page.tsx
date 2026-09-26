/**
 * The partner's private link. Before recording: who invited them, consent, the recorder. After: their own
 * report, and the couple's report as soon as AVOCO has read their voice.
 */
import Link from "next/link";
import { MatchView } from "@/components/MatchView";
import { Recorder } from "@/components/Recorder";
import { ReportView } from "@/components/ReportView";
import { formatDate, getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { matchByToken } from "@/lib/matches";

export const metadata = { robots: { index: false, follow: false } };

export default async function PartnerLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ again?: string; deleted?: string }> }) {
  const [{ token }, { again, deleted }, { t, locale }] = await Promise.all([params, searchParams, getDict()]);
  const match = await matchByToken(token);
  const m = t.match;
  if (!match) return <p className="card mx-auto mt-10 max-w-lg p-10 text-center text-ink-2">{deleted ? m.partnerDeleted : t.org.record.invalid}</p>;
  const state = await matchStatus(match, t, locale);
  const fill = (s: string) => s.replace("{a}", match.ownerName).replace("{b}", match.partnerName);
  const self = `/m/${token}`;

  if (state.partnerReport && !again) {
    return (
      <div className="space-y-12">
        <MatchView initial={{ status: state.status, partnerName: state.partnerName, ownerName: state.ownerName, report: state.report }} pollUrl={`/api/m/${token}/match`} waiting={null} t={m} />
        <section>
          <h2 className="mb-6 font-display text-4xl font-medium">{m.yourReport}</h2>
          <ReportView
            initial={state.partnerReport}
            recordedOn={formatDate(state.partnerReport.created_at, locale)}
            t={t}
            pollUrl={`/api/m/${token}/report`}
            deleteUrl={`/api/m/${token}/report`}
            afterDeleteHref={`${self}?deleted=1`}
            deleteLabel={m.partnerDelete}
            deleteConfirm={fill(m.partnerDeleteConfirm)}
            back={null}
            lead={<p className="no-print text-sm leading-relaxed text-ink-2"><Link href={`${self}?again=1`} className="font-semibold text-accent-text hover:underline">{m.partnerAgain}</Link></p>}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="addon-badge">{m.eyebrow}</p>
      <h1 className="mt-2 font-display text-5xl font-medium">{fill(m.partnerTitle)}</h1>
      <p className="mt-4 leading-relaxed text-ink-2">{fill(m.partnerText)}</p>
      <div className="mt-8">
        <Recorder t={t.record} uploadUrl={`/api/m/${token}/upload-token`} createUrl={`/api/m/${token}/recordings`} doneUrl={self} consentText={fill(m.partnerConsent)} />
      </div>
    </div>
  );
}
