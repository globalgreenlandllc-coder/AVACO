/** The orderer's view of a match: the partner's link while waiting, then the couple's report. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { DeleteMatch } from "@/components/DeleteMatch";
import { MatchView } from "@/components/MatchView";
import { Qr } from "@/components/Qr";
import { Recorder } from "@/components/Recorder";
import { getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { matchFor } from "@/lib/matches";
import { baseUrl } from "@/lib/page";
import { visitorId } from "@/lib/visitor";

export const metadata = { robots: { index: false, follow: false } };

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, userId, { t, locale }, origin] = await Promise.all([params, visitorId(), getDict(), baseUrl()]);
  if (!userId) notFound();
  const match = await matchFor(userId, id);
  if (!match) notFound();
  const state = await matchStatus(match, t, locale);
  const m = t.match;
  const link = `${origin}/m/${match.partnerToken}`;
  const fill = (s: string) => s.replace("{name}", match.partnerName);

  const waiting = (
    <div className="space-y-8">
      <section className="card p-7 sm:p-10">
        <p className="addon-badge">{m.eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">{fill(m.inviteTitle)}</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{fill(m.inviteText)}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <Qr value={link} label={fill(m.inviteTitle)} size={180} />
          <CopyLink value={link} label={m.copy} copied={m.copied} />
        </div>
      </section>
      <section className="card p-7 sm:p-10">
        <p className="eyebrow">{fill(m.orUpload)}</p>
        <div className="mt-4">
          <Recorder t={t.record} uploadUrl={`/api/match/${match.id}/upload-token`} createUrl={`/api/match/${match.id}/recordings`} doneUrl={`/match/${match.id}`} consentText={fill(m.uploadAttest)} extraConsent={fill(m.uploadAttest)} />
        </div>
      </section>
    </div>
  );

  return (
    <div className="space-y-8">
      <Link href={`/reports/${match.analysisId}`} className="no-print text-sm text-muted hover:text-ink">← {t.report.back}</Link>
      <MatchView initial={{ status: state.status, partnerName: state.partnerName, ownerName: state.ownerName, report: state.report }} pollUrl={`/api/match/${match.id}`} waiting={waiting} t={m} />
      <DeleteMatch id={match.id} label={fill(m.deleteMatch)} confirm={fill(m.deleteConfirm)} afterHref={`/reports/${match.analysisId}`} />
    </div>
  );
}
