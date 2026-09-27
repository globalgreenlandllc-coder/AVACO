import { RankBars } from "./AdminCharts";
import { CHANNEL_NAMES, type Stats } from "@/lib/visits-math";

const SOURCE_NAMES: Record<string, string> = { direct: "Direct (typed address, saved link, or a link without a tag)" };
const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const th = "px-3 py-2 text-right font-semibold";
const td = "px-3 text-right tabular-nums";

/**
 * Admin → Statistics, "Where people come from": the doors people come in through, each source with what its people
 * went on to do, the tagged links, and the pages elsewhere that sent people here.
 */
export function SourcesReport({ v }: { v: Stats }) {
  const total = v.channels.reduce((n, c) => n + c.visitors, 0);
  return (
    <section className="card p-7">
      <h2 className="mb-1 text-lg font-semibold">Where people come from</h2>
      <p className="mb-6 max-w-3xl text-xs leading-relaxed text-muted">
        Last 30 days. Each visitor is credited to the door they first came in through, and so is whatever they did later: signed up, recorded, paid.
        Sessions count every visit. Links people share from the site (a gift, a partner&apos;s invitation, a company&apos;s link) are doors of their own.
      </p>

      <div className="space-y-8">
        <div className="min-w-0">
          <p className="eyebrow mb-4">By door</p>
          {v.channels.length === 0 ? <p className="text-sm text-muted">No visitors yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted">
                  <tr><th className="py-2 pr-3 font-semibold">Door</th><th className={th}>Visitors</th><th className={th}>Signed up</th><th className={th}>Recorded</th><th className={th}>Paid</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {v.channels.map((c) => (
                    <tr key={c.channel}>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{CHANNEL_NAMES[c.channel]}</span><span className="ml-2 text-xs text-muted">{rate(c.visitors, total)}</span>
                        <span className="mt-1.5 block h-1.5 w-full rounded-full bg-track"><span className="block h-full rounded-full bg-accent" style={{ width: `${total ? Math.round((c.visitors / total) * 100) : 0}%` }} /></span>
                      </td>
                      <td className={td}>{c.visitors}</td><td className={td}>{c.signups}</td><td className={td}>{c.recorded}</td><td className={td}>{c.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="eyebrow mb-4">By source</p>
          {v.sources.length === 0 ? <p className="text-sm text-muted">No sessions yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted">
                  <tr><th className="py-2 pr-3 font-semibold">Source</th><th className={th}>Sessions</th><th className={th}>Visitors</th><th className={th}>Signed up</th><th className={th}>Recorded</th><th className={th}>Paid</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {v.sources.map((s) => (
                    <tr key={s.source}>
                      <td className="py-2.5 pr-3"><span className="font-medium">{SOURCE_NAMES[s.source] ?? s.source}</span><span className="ml-2 text-xs text-muted">{CHANNEL_NAMES[s.channel]}</span></td>
                      <td className={td}>{s.sessions}</td>
                      <td className={td}>{s.visitors}</td>
                      <td className={td}>{s.signups}{s.visitors > 0 && s.signups > 0 && <span className="ml-1 text-xs text-muted">{rate(s.signups, s.visitors)}</span>}</td>
                      <td className={td}>{s.recorded}</td>
                      <td className={td}>{s.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(v.campaigns.length > 0 || v.referrers.length > 0) && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {v.campaigns.length > 0 && (
            <div className="min-w-0">
              <p className="eyebrow mb-4">Tagged links</p>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-3 font-semibold">Campaign</th><th className={th}>Sessions</th><th className={th}>Visitors</th><th className={th}>Signed up</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {v.campaigns.map((c) => (
                    <tr key={`${c.campaign}|${c.source}|${c.medium ?? ""}`}>
                      <td className="py-2.5 pr-3"><span className="font-medium">{c.campaign}</span><span className="ml-2 text-xs text-muted">{c.source}{c.medium ? ` · ${c.medium}` : ""}</span></td>
                      <td className={td}>{c.sessions}</td><td className={td}>{c.visitors}</td><td className={td}>{c.signups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
          {v.referrers.length > 0 && (
            <div className="min-w-0">
              <p className="eyebrow mb-4">Pages that link here</p>
              <RankBars rows={v.referrers.map((r) => ({ label: r.referrer, value: r.sessions, note: `${r.visitors} visitors` }))} empty="" />
            </div>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink-2">To see where an ad, a post or a newsletter brings people, tag its link.</p>
        <p className="mt-1">
          Add <code className="rounded bg-track px-1.5 py-0.5 text-ink break-all">?utm_source=instagram&amp;utm_medium=bio&amp;utm_campaign=launch</code> to the address you share; the source, medium and campaign
          then appear here by name. A link without a tag is credited to the site it was clicked on, and to &quot;direct&quot; when the browser tells nothing, as with most messaging apps and QR codes.
        </p>
      </div>
    </section>
  );
}
