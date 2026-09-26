/**
 * The partner's private link. First: who invited them, the tracker showing the orderer's voice is done, consent
 * and the recorder. After recording: the couple's report (once AVOCO is done), their own report, the orderer's report.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { MatchRecorder } from "@/components/MatchRecorder";
import { MatchView } from "@/components/MatchView";
import { ReportView } from "@/components/ReportView";
import { formatDate, getDict } from "@/lib/i18n";
import { matchStatus } from "@/lib/match-status";
import { matchByToken, notePartnerOpened } from "@/lib/matches";
import { ogLine } from "@/lib/og";

/** What the link shows before it is opened: who is inviting, and to what, with the picture from opengraph-image.tsx. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const [{ token }, { t }] = await Promise.all([params, getDict()]);
  const match = await matchByToken(token).catch(() => null);
  const title = match ? `♥ ${t.match.partnerTitle.replace("{a}", match.ownerName)}` : `${t.brand} · ${t.match.title}`;
  const description = ogLine(match ? t.match.partnerIntro.replace("{a}", match.ownerName) : t.match.lead, 160);
  return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, siteName: t.brand, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function PartnerLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ again?: string; deleted?: string }> }) {
  const [{ token }, { again, deleted }, { t, locale }] = await Promise.all([params, searchParams, getDict()]);
  const match = await matchByToken(token);
  const m = t.match;
  if (!match) return <p className="card mx-auto mt-10 max-w-lg p-10 text-center text-ink-2">{deleted ? m.partnerDeleted : t.org.record.invalid}</p>;
  await notePartnerOpened(match).catch(() => {}); // the orderer's tracker: "opened the link"
  match.partnerOpenedAt ??= new Date(); // this very render must not still say "not opened"
  const state = await matchStatus(match, t, locale);
  const fill = (s: string) => s.replaceAll("{a}", match.ownerName).replaceAll("{b}", match.partnerName);
  const self = `/m/${token}`;
  const { ownerReport, partnerReport, ...view } = state;
  const others = ownerReport && (
    <section>
      <h2 className="font-display text-4xl font-medium">{m.otherReport.replace("{name}", match.ownerName)}</h2>
      <p className="mb-6 mt-2 text-sm text-muted">{m.sharedNote}</p>
      <ReportView initial={ownerReport} recordedOn={formatDate(ownerReport.created_at, locale)} t={t} pollUrl={`/api/m/${token}/match`} deleteUrl={null} back={null} />
    </section>
  );

  if (partnerReport && !again) {
    return (
      <div className="space-y-12">
        <MatchView initial={view} pollUrl={`/api/m/${token}/match`} waiting={null} side="partner" t={m} />
        <section>
          <h2 className="mb-6 font-display text-4xl font-medium">{m.yourReport}</h2>
          <ReportView
            initial={partnerReport}
            recordedOn={formatDate(partnerReport.created_at, locale)}
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
        {others}
      </div>
    );
  }

  const recorder = (
    <section className="card p-7 sm:p-10">
      <p className="addon-badge">{m.eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">{fill(m.partnerTitle)}</h1>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{fill(m.partnerIntro)}</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{fill(m.partnerText)}</p>
      <p className="eyebrow mt-8">{m.partnerYourTurn}</p>
      <div className="mt-4">
        <MatchRecorder t={t.record} uploadUrl={`/api/m/${token}/upload-token`} createUrl={`/api/m/${token}/recordings`} doneUrl={self} consentText={fill(m.partnerConsent)} startedUrl={`/api/m/${token}/started`} />
      </div>
    </section>
  );
  return (
    <div className="space-y-10">
      <MatchView initial={view} pollUrl={`/api/m/${token}/match`} waiting={recorder} side="partner" t={m} />
    </div>
  );
}
