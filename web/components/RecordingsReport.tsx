import { Bars, DailyBars, Kpi, RankBars, type Bar } from "./AdminCharts";
import { Funnel } from "./StatsCharts";
import { KIND_SHORT, OUTCOME_NAMES, sourceLabel, type RecordingRow, type RecordingStats } from "@/lib/recording-math";
import { platformColor, ZONE } from "@/lib/visits-math";

const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const th = "px-3 py-2 text-right font-semibold";
const td = "px-3 text-right tabular-nums";
const when = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const hourLabel = (h: number) => (h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);
const DEVICES: Record<string, string> = { phone: "📱 Phone", tablet: "📲 Tablet", desktop: "💻 Computer", unknown: "Not known" };
const OUTCOME_TONE: Record<string, string> = { free: "text-accent-text", paid: "text-accent-text", failed: "text-danger", preview: "text-muted" };

/**
 * Admin → Statistics, "Recordings": the voice recordings of the last 30 days on their own: how many were analysed and
 * reached a report, what kind they were and what type they found, where their people came from and on which ad, and
 * when. From lib/recording-stats.ts.
 */
export function RecordingsReport({ r }: { r: RecordingStats & { leftOut: number } }) {
  const opened = r.opened.free + r.opened.paid + r.opened.other;
  const peakHour = r.hours.reduce((a, b) => (b.views > a.views ? b : a), r.hours[0]);
  const hourBars: Bar[] = r.hours.map((h) => ({ key: String(h.hour), value: h.views, axis: h.hour % 3 === 0 ? hourLabel(h.hour) : "", title: `${hourLabel(h.hour)}: ${h.views} recordings`, strong: h === peakHour && h.views > 0 }));
  return (
    <section className="card space-y-8 p-7" aria-labelledby="recordings-title">
      <div>
        <h2 id="recordings-title" className="text-lg font-semibold">Recordings</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Every voice recording of the last 30 days, all sites: what became of it, what kind it was and what it found, and where its person came from,
          credited to their account&apos;s first tracked visit (an invited partner, to the person who invited them).
          {r.leftOut > 0 ? ` ${r.leftOut} recording${r.leftOut === 1 ? "" : "s"} by admins, and their partners, left out.` : " Admins' own recordings are left out."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Recorded" value={String(r.total)} sub="voices sent for analysis" />
        <Kpi label="Analysed" value={String(r.analysed)} sub={`${rate(r.analysed, r.total)} of the recordings${r.waiting ? ` · ${r.waiting} still analysing` : ""}`} />
        <Kpi label="Full report opened" value={String(opened)} sub={`${r.opened.free} free first · ${r.opened.paid} paid · ${r.opened.other} included or other`} />
        <Kpi label="Preview only" value={String(r.previewOnly)} sub="analysed, the full report not opened" />
        <Kpi label="Failed" value={String(r.failed)} sub={`${rate(r.failed, r.total)} of the recordings`} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-4">Recorded → analysed → report</p>
          <Funnel steps={[
            { label: "Recorded", value: r.total },
            { label: "Analysed", value: r.analysed },
            { label: "Full report opened", value: opened, note: `${r.opened.free} free · ${r.opened.paid} paid` },
            { label: "Paid", value: r.opened.paid },
          ]} />
        </div>
        <div>
          <p className="eyebrow mb-4">What became of each recording</p>
          <RankBars rows={r.outcomes.map((o) => ({ label: o.label, value: o.n }))} empty="No recordings yet." />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div><p className="eyebrow mb-4">Recordings per day</p><DailyBars data={r.series} format={String} label="Recordings per day" /></div>
        <div>
          <p className="eyebrow mb-4">Hour of the day · New York time</p>
          <Bars items={hourBars} format={String} height={130} ariaLabel={`Recordings by hour, New York time. Busiest: ${hourLabel(peakHour.hour)}.`} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div><p className="eyebrow mb-4">What kind</p><RankBars rows={r.kinds.map((k) => ({ label: k.label, value: k.recorded, note: `${k.analysed} analysed` }))} empty="No recordings yet." /></div>
        <div><p className="eyebrow mb-4">The type it found</p><RankBars rows={r.types.map((t) => ({ label: t.label, value: t.n }))} empty="Nothing analysed yet." /></div>
        <div>
          <p className="eyebrow mb-4">Where they are</p>
          <RankBars rows={r.places.map((p) => ({ label: p.label, value: p.n }))} empty="No places known yet." />
          <p className="eyebrow mb-3 mt-6">Device</p>
          <RankBars rows={r.devices.map((d) => ({ label: DEVICES[d.device] ?? d.device, value: d.n }))} empty="–" />
        </div>
      </div>

      <div className="space-y-8">
        <div className="min-w-0">
          <p className="eyebrow mb-4">Where they came from</p>
          {r.sources.length === 0 ? <p className="text-sm text-muted">No recordings yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-3 font-semibold">Source</th><th className={th}>Recorded</th><th className={th}>From ads</th><th className={th}>Analysed</th><th className={th}>Opened</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.sources.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2.5 pr-3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: platformColor(s.source) }} aria-hidden /><span className="font-medium">{s.label}</span></span></td>
                      <td className={td}>{s.recorded}</td><td className={td}>{s.fromAds}</td><td className={td}>{s.analysed}</td><td className={td}>{s.opened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="eyebrow mb-4">Which ad</p>
          {r.ads.length === 0 ? <p className="text-sm leading-relaxed text-muted">No recording came from an ad yet. Once one does, its campaign, ad and placement show here (from the ad link&apos;s URL parameters).</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-3 font-semibold">Campaign · ad · placement</th><th className={th}>Recorded</th><th className={th}>Analysed</th><th className={th}>Opened</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {r.ads.map((a) => (
                    <tr key={`${a.source}|${a.campaign}|${a.ad}|${a.placement ?? ""}`}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{a.campaign}</span>
                        <span className="block break-all text-xs text-muted">{sourceLabel(a.source)} · ad {a.ad}{a.placement ? ` · ${a.placement.replace(/_/g, " ")}` : ""}</span>
                      </td>
                      <td className={td}>{a.recorded}</td><td className={td}>{a.analysed}</td><td className={td}>{a.opened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="eyebrow mb-4">The latest recordings</p>
        {r.recent.length === 0 ? <p className="text-sm text-muted">No recordings in the last 30 days.</p> : (
          <>
            <RecentTable rows={r.recent.slice(0, 10)} />
            {r.recent.length > 10 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-accent-text">Show {r.recent.length - 10} more</summary>
                <div className="mt-3"><RecentTable rows={r.recent.slice(10)} /></div>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function RecentTable({ rows }: { rows: RecordingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-widest text-muted">
          <tr><th className="py-2 pr-3 font-semibold">When (NY)</th><th className="px-3 py-2 font-semibold">Kind · who</th><th className="px-3 py-2 font-semibold">Result</th><th className="px-3 py-2 font-semibold">Report</th><th className="px-3 py-2 font-semibold">Came from</th><th className="px-3 py-2 font-semibold">Where</th></tr>
        </thead>
        <tbody className="divide-y divide-line align-top">{rows.map((x) => <RecentRow key={x.id} x={x} />)}</tbody>
      </table>
    </div>
  );
}

function RecentRow({ x }: { x: RecordingRow }) {
  const d = x.door;
  return (
    <tr>
      <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-ink-2">{when.format(x.at)}</td>
      <td className="px-3 py-2.5">
        <span className="font-medium">{KIND_SHORT[x.kind]}{x.matchKind ? ` · ${x.matchKind}` : ""}</span>
        {x.who && <span className="block max-w-[16rem] truncate text-xs text-muted" title={x.who}>{x.who}</span>}
      </td>
      <td className="px-3 py-2.5">{x.leader ? <><span className="font-medium">{x.leader.label}</span> <span className="tabular-nums text-muted">{x.leader.value.toFixed(1)}</span></> : <span className="text-muted">–</span>}</td>
      <td className={`px-3 py-2.5 ${OUTCOME_TONE[x.outcome] ?? ""}`} title={x.error ?? undefined}>{OUTCOME_NAMES[x.outcome]}</td>
      <td className="px-3 py-2.5">
        {d ? (
          <>
            <span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: platformColor(d.source) }} aria-hidden />{sourceLabel(d.source)}{d.paid ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">ad</span> : null}</span>
            {(d.campaign || d.content || d.term) && <span className="block max-w-[18rem] break-all text-xs text-muted">{[d.campaign, d.content && `ad ${d.content}`, d.term?.replace(/_/g, " ")].filter(Boolean).join(" · ")}</span>}
          </>
        ) : <span className="text-muted">{x.kind === "company" ? "Company link" : x.kind === "partner-page" || x.kind === "open" ? "Free test site" : "Not tracked"}</span>}
      </td>
      <td className="px-3 py-2.5 text-ink-2">{d ? [d.city, d.country === "US" ? d.region : d.country].filter(Boolean).join(", ") || "–" : "–"}{d?.device ? <span className="ml-1.5" aria-label={d.device}>{d.device === "phone" ? "📱" : d.device === "tablet" ? "📲" : "💻"}</span> : null}</td>
    </tr>
  );
}
