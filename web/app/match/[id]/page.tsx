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

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const [{ id }, { mode }, userId, { t, locale }, origin] = await Promise.all([params, searchParams, visitorId(), getDict(), baseUrl()]);
  if (!userId) notFound();
  const match = await matchFor(userId, id);
  if (!match) notFound();
  const state = await matchStatus(match, t, locale);
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
  const waiting = uploadFirst ? upload : invite;

  return (
    <div className="space-y-8">
      <Link href={`/reports/${match.analysisId}`} className="no-print text-sm text-muted hover:text-ink">← {t.report.back}</Link>
      <MatchView initial={{ status: state.status, partnerName: state.partnerName, ownerName: state.ownerName, report: state.report }} pollUrl={`/api/match/${match.id}`} waiting={waiting} t={m} />
      <DeleteMatch id={match.id} label={fill(m.deleteMatch)} confirm={fill(m.deleteConfirm)} afterHref={`/reports/${match.analysisId}`} />
    </div>
  );
}
