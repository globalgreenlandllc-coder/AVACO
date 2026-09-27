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
import { isPaid, markSeen, matchFor } from "@/lib/matches";
import { matchPriceCents } from "@/lib/match-billing";
import { money } from "@/lib/money";
import { getSettings } from "@/lib/billing";
import { PayMatch } from "@/components/PayMatch";
import { baseUrl } from "@/lib/page";
import { visitorId } from "@/lib/visitor";
import { asUser, confirmCheckout } from "@/lib/billing";
import { RefreshWhile } from "@/components/RefreshWhile";

export const metadata = { robots: { index: false, follow: false } };

export default async function MatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string; paid?: string; session?: string }> }) {
  const [{ id }, { mode, session }, userId, { t, locale }, origin] = await Promise.all([params, searchParams, visitorId(), getDict(), baseUrl()]);
  if (!userId) notFound();
  let match = await matchFor(userId, id);
  if (!match) notFound();
  // Back from Stripe: confirm the payment on this very load, so the link opens now, not whenever the webhook gets round to it.
  let justPaid = false;
  if (!isPaid(match) && typeof session === "string") {
    const outcome = await confirmCheckout(asUser(userId), session).catch(() => null);
    if (outcome?.paid) { justPaid = true; match = (await matchFor(userId, id)) ?? match; }
  }
  if (!isPaid(match)) {
    // Just back from Stripe: the payment is being confirmed, so wait for it. Anywhere else nothing is on its way,
    // so say so and offer to pay, instead of waiting for a payment that was never made (a checkout left half-way).
    const confirming = typeof session === "string";
    const [cents, cfg] = confirming ? [0, null] : await Promise.all([matchPriceCents(), getSettings()]);
    return (
      <div className="theme-match mx-auto max-w-lg space-y-6 pt-10 text-center">
        {confirming && <RefreshWhile />}
        <div className="relative mx-auto grid h-20 w-20 place-items-center"><span className={`${confirming ? "breathe " : ""}absolute inset-0 rounded-full bg-accent`} aria-hidden /><span className="relative h-8 w-8 rounded-full bg-accent" aria-hidden /></div>
        <p className="leading-relaxed text-ink-2">{confirming ? t.match.awaitingPayment : t.match.notPaid.replace("{name}", match.partnerName)}</p>
        {!confirming && cfg && (
          <PayMatch analysisId={match.analysisId} ownerName={match.ownerName} partnerName={match.partnerName} withFamily={match.withFamily} label={t.match.payNow.replace("{price}", money(cents, cfg.currency, locale))} />
        )}
        <Link href={`/reports/${match.analysisId}`} className="block text-sm font-semibold text-accent-text hover:underline">← {t.match.backToReport}</Link>
      </div>
    );
  }
  const state = await matchStatus(match, t, locale);
  if (state.status === "ready" && !match.ownerSeenAt) await markSeen(match); // the notice on every page has done its job
  const m = t.match;
  const link = `${origin}/m/${match.partnerToken}`;
  const fill = (s: string) => s.replace("{name}", match.partnerName);

  // The way the orderer chose in the report: upload the partner's recording themselves, or send the partner a link.
  const uploadFirst = mode === "upload";
  // Both ways in, side by side at the top: the person can change their mind at any time without losing anything.
  const tabs = (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2" role="tablist">
        {([["upload", fill(m.modeUpload)], ["invite", fill(m.modeInvite)]] as const).map(([key, label]) => {
          const on = (key === "upload") === uploadFirst;
          return <Link key={key} href={`/match/${match.id}?mode=${key}`} role="tab" aria-selected={on} className={`rounded-2xl border px-5 py-4 text-center text-sm font-semibold ${on ? "border-[var(--addon)] bg-[var(--addon)] text-[var(--addon-ink)]" : "border-line bg-surface text-ink-2 hover:border-[var(--addon)]"}`}>{label}</Link>;
        })}
      </div>
      <p className="text-center text-xs text-muted">{m.modeHint}</p>
    </div>
  );
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
      <Link href={`/reports/${match.analysisId}`} className="no-print inline-block text-sm font-semibold text-accent-text hover:underline">← {m.backToReport}</Link>
      {justPaid && <p role="status" className="rounded-xl border border-accent px-5 py-4 text-sm">{t.match.paymentConfirmed}</p>}
      <MatchView initial={view} pollUrl={`/api/match/${match.id}`} waiting={<div className="space-y-6">{tabs}{uploadFirst ? upload : invite}</div>} side="owner" t={m} />
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
