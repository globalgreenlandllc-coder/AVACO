/**
 * A participant's private link. Before recording: consent and the recorder. After: their own report,
 * always. At a station: a thank-you with a QR code to this same page, and "next person".
 */
import Link from "next/link";
import { Qr } from "@/components/Qr";
import { Recorder } from "@/components/Recorder";
import { ReportView } from "@/components/ReportView";
import { publicReport } from "@/lib/api";
import { formatDate, getDict } from "@/lib/i18n";
import { baseUrl, presetOf } from "@/lib/page";
import { PRESET_RULES } from "@/lib/presets";
import { participantByToken, personAnalyses } from "@/lib/workspaces";

export const metadata = { robots: { index: false, follow: false } };

export default async function ParticipantPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ station?: string; again?: string; deleted?: string }> }) {
  const [{ token }, { station, again, deleted }, { t, locale }, origin] = await Promise.all([params, searchParams, getDict(), baseUrl()]);
  const found = await participantByToken(token);
  const r = t.org.record;
  // Once a person deletes their data the link itself is gone, so "deleted" is all this page can know.
  if (!found) return <p className="card mx-auto mt-10 max-w-lg p-10 text-center text-ink-2">{deleted ? r.deleted : r.invalid}</p>;

  const { participant, ws } = found;
  const [latest] = await personAnalyses(participant.id);
  const company = ws.name;
  const fill = (s: string) => s.replace("{name}", participant.name).replace("{company}", company);
  const self = `/r/${token}`;

  if (latest && station) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center pt-10 text-center">
        <h1 className="font-display text-5xl font-medium">{fill(r.stationDone)}</h1>
        <p className="mt-4 leading-relaxed text-ink-2">{r.stationScan}</p>
        <div className="mt-8"><Qr value={`${origin}${self}`} label={r.yourReport} size={220} /></div>
        <Link href={`/s/${encodeURIComponent(station)}?station=1`} className="btn mt-10">{r.stationNext}</Link>
      </div>
    );
  }

  if (latest && !again) {
    return (
      <ReportView
        initial={publicReport(latest, ws.hideEmotions)}
        recordedOn={formatDate(latest.created_at, locale)}
        t={t}
        pollUrl={`/api/r/${token}/report`}
        deleteUrl={`/api/r/${token}/report`}
        afterDeleteHref={`${self}?deleted=1`}
        deleteLabel={r.deleteMine}
        deleteConfirm={fill(r.deleteMineConfirm)}
        back={null}
        hideEmotions={ws.hideEmotions}
        lead={<p className="text-sm leading-relaxed text-ink-2">{fill(r.hello)}. {r.keepLink}</p>}
      />
    );
  }

  const rules = PRESET_RULES[presetOf(ws.industry)];
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-5xl font-medium">{fill(r.hello)}</h1>
      <p className="mt-4 leading-relaxed text-ink-2">{fill(r.from)} {fill(r.what)}</p>
      <div className="mt-8">
        <Recorder
          t={t.record}
          uploadUrl={`/api/r/${token}/upload-token`}
          createUrl={`/api/r/${token}/recordings`}
          doneUrl={station ? `${self}?station=${encodeURIComponent(station)}` : self}
          consentText={fill(r.consent)}
          extraConsent={rules.minorsConsent ? r.minors : undefined}
          limitText={r.limit}
        />
      </div>
    </div>
  );
}
