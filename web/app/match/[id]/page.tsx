/** The orderer's view of a match: the tracker, the partner's link or the upload while waiting, then the couple's report and the partner's own report. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { DeleteMatch } from "@/components/DeleteMatch";
import { MatchView } from "@/components/MatchView";
import { Qr } from "@/components/Qr";
import { Recorder } from "@/components/Recorder";
import { ReportView } from "@/components/ReportView";
import { formatDate, getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { markSeen, matchFor } from "@/lib/matches";
import { baseUrl } from "@/lib/page";
import { visitorId } from "@/lib/visitor";

export const metadata = { robots: { index: false, follow: false } };

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const [{ id }, { mode }, userId, { t, locale }, origin] = await Promise.all([params, searchParams, visitorId(), getDict(), baseUrl()]);
  if (!userId) notFound();
  const match = await matchFor(userId, id);
  if (!match) notFound();
  const state = await matchStatus(match, t, locale);
  if (state.status === "ready" && !match.ownerSeenAt) await markSeen(match); // the notice on every page has done its job
  const m = t.match;
  const link = `${origin}/m/${match.partnerToken}`;
  const fill = (s: string) => s.replace("{name}", match.partnerName);

  // The way the orderer chose in the report: upload the partner's recording themselves, or send the partner a link.
  const uploadFirst = mode === "upload";
  const invite = (
    <section className="card p-7 sm:p-10">
      <p className="addon-badge">{m.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">{fill(m.inviteTitle)}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{fill(m.inviteText)}</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <Qr value={link} label={fill(m.inviteTitle)} size={180} />
        <CopyLink value={link} label={m.copy} copied={m.copied} />
      </div>
      {/* What to expect while the partner takes their time, and how the orderer will learn the report is ready. */}
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
        <p className="eyebrow">{m.whatNow.title}</p>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-2">
          {m.whatNow.steps.map((step, i) => <li key={step} className="flex gap-3"><span className="font-display text-xl leading-none text-accent-text">{i + 1}</span><span>{fill(step)}</span></li>)}
        </ol>
        <p className="mt-4 text-sm leading-relaxed">{fill(m.whatNow.close)}</p>
        <p className="mt-2 text-xs text-muted">{m.whatNow.noEmail}</p>
      </div>
      <p className="mt-6 text-sm"><Link href={`/match/${match.id}?mode=upload`} className="font-semibold text-accent-text hover:underline">{fill(m.switchToUpload)}</Link></p>
    </section>
  );
  const upload = (
    <section className="card p-7 sm:p-10">
      <p className="addon-badge">{m.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">{fill(m.uploadTitle)}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{fill(m.haveRecordingText)}</p>
      <div className="mt-6">
        <Recorder t={t.record} uploadUrl={`/api/match/${match.id}/upload-token`} createUrl={`/api/match/${match.id}/recordings`} doneUrl={`/match/${match.id}`} consentText={fill(m.uploadAttest)} />
      </div>
      <p className="mt-6 text-sm"><Link href={`/match/${match.id}?mode=invite`} className="font-semibold text-accent-text hover:underline">{fill(m.switchToInvite)}</Link></p>
    </section>
  );
  const { ownerReport: _o, partnerReport, ...view } = state;

  return (
    <div className="space-y-10">
      <Link href={`/reports/${match.analysisId}`} className="no-print text-sm text-muted hover:text-ink">← {t.report.back}</Link>
      <MatchView initial={view} pollUrl={`/api/match/${match.id}`} waiting={uploadFirst ? upload : invite} side="owner" t={m} />
      {partnerReport?.status === "completed" && (
        <section>
          <h2 className="font-display text-4xl font-medium">{m.otherReport.replace("{name}", match.partnerName)}</h2>
          <p className="mb-6 mt-2 text-sm text-muted">{m.sharedNote}</p>
          <ReportView initial={partnerReport} recordedOn={formatDate(partnerReport.created_at, locale)} t={t} pollUrl={`/api/match/${match.id}`} deleteUrl={null} back={null} />
        </section>
      )}
      <DeleteMatch id={match.id} label={fill(m.deleteMatch)} confirm={fill(m.deleteConfirm)} afterHref={`/reports/${match.analysisId}`} />
    </div>
  );
}
