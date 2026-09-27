import { DailyBars, Kpi, RankBars } from "@/components/AdminCharts";
import { Funnel, HourBars, KpiDelta } from "@/components/StatsCharts";
import { statistics } from "@/lib/stats";

export const dynamic = "force-dynamic";

const SITES: Record<string, string> = { main: "Main site (avocousa.us)", partner: "Partner page", open: "Open site (no accounts)" };
const DEVICES: Record<string, string> = { phone: "Phone", tablet: "Tablet", desktop: "Desktop" };
const SOURCES: Record<string, string> = { direct: "Direct (typed, saved link, or an ad without a tracking link)" };

export default async function AdminStats() {
  const s = await statistics();
  const v = s.visits;
  const region = new Intl.DisplayNames(["en"], { type: "region" });
  const language = new Intl.DisplayNames(["en"], { type: "language" });
  const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
  const day = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-10">
      <section className="card border-accent p-7">
        <p className="eyebrow !text-accent-text">What stands out · last 30 days</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {s.insights.map((line) => <li key={line} className="flex gap-2"><span className="text-accent-text" aria-hidden>·</span><span>{line}</span></li>)}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Counted on the site itself, first-party and without addresses or browser details; admins' own visits are left out.
          {s.since ? ` Tracking since ${day(s.since)}.` : " Nothing tracked yet."} Days are UTC; busiest hours are New York time.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiDelta label="Visitors, 30 days" value={v.month.visitors} previous={v.prevMonth.visitors} sub={`${v.week.visitors} in 7 days · ${v.today.visitors} today`} />
        <KpiDelta label="Page views, 30 days" value={v.month.views} previous={v.prevMonth.views} sub={`${v.month.sessions} sessions · ${v.month.sessions ? (v.month.views / v.month.sessions).toFixed(1) : "0"} pages per session`} />
        <KpiDelta label="Sign-ups, 30 days" value={s.users.month} previous={s.users.prevMonth} sub={`${s.users.week} in 7 days${s.users.capped ? " · at least" : ""} · ${s.users.total ?? "?"} accounts in all`} />
        <KpiDelta label="Signed-in visitors, 30 days" value={s.users.active} previous={v.prevMonth.accounts} sub={`${v.week.accounts} in 7 days · accounts that opened the site`} />
        <Kpi label="Came back" value={rate(v.returning.visitors, v.returning.of)} sub={`${v.returning.visitors} of ${v.returning.of} visitors returned on another day`} />
        <Kpi label="Recorder → report" value={rate(v.recording.finished, v.recording.reached)} sub={`${v.recording.finished} of ${v.recording.reached} sessions that opened the recorder reached a report`} />
        <Kpi label="Visitor → sign-up" value={rate(s.funnel.signups, s.funnel.visitors)} sub={`${s.funnel.signups} sign-ups from ${s.funnel.visitors} visitors`} />
        <Kpi label="Sign-up → paid" value={rate(s.funnel.paid, s.funnel.signups)} sub={`${s.funnel.paid} paying customers among ${s.funnel.signups} new accounts`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Visitors per day</h2><DailyBars data={v.series.map((d) => ({ day: d.day, value: d.visitors }))} format={String} label="Visitors per day" /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Sign-ups per day</h2><DailyBars data={s.users.series} format={String} label="Sign-ups per day" /></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7">
          <h2 className="mb-1 text-lg font-semibold">From visitor to customer</h2>
          <p className="mb-5 text-xs text-muted">Last 30 days, each step in people.</p>
          <Funnel steps={[
            { label: "Visitors", value: s.funnel.visitors },
            { label: "Signed up", value: s.funnel.signups, note: s.users.capped ? "at least" : undefined },
            { label: "Recorded", value: s.funnel.recorded, note: "accounts that recorded" },
            { label: "Paid", value: s.funnel.paid, note: "bought credits" },
            { label: "Bought an add-on", value: s.funnel.addons, note: "industry chapter or couple's report" },
          ]} />
        </div>
        <div className="card p-7">
          <h2 className="mb-1 text-lg font-semibold">Where people come from</h2>
          <p className="mb-5 text-xs text-muted">Sessions by source; "recorded" is how many of that source's visitors went on to record with an account.</p>
          <RankBars rows={v.sources.map((r) => ({ label: SOURCES[r.source] ?? r.source, value: r.sessions, note: `${r.visitors} visitors · ${r.recorded} recorded` }))} empty="No sessions yet." />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Most viewed pages</h2><RankBars rows={v.pages.map((r) => ({ label: r.path, value: r.views, note: `${r.visitors} visitors` }))} empty="No views yet." /></div>
        <div className="card p-7">
          <h2 className="mb-1 text-lg font-semibold">Landing pages</h2>
          <p className="mb-5 text-xs text-muted">Where sessions start; "leave at once" is the share that saw only that page.</p>
          <RankBars rows={v.landings.map((r) => ({ label: r.path, value: r.sessions, note: `${Math.round(r.bounce * 100)}% leave at once` }))} empty="No sessions yet." />
        </div>
        <div className="card p-7">
          <h2 className="mb-1 text-lg font-semibold">Devices</h2>
          <p className="mb-5 text-xs text-muted">Visitors; then sessions that opened the recorder, and how many of those reached a report.</p>
          <RankBars rows={v.devices.map((r) => ({ label: DEVICES[r.device] ?? r.device, value: r.visitors, note: `recorder ${r.reached} → report ${r.finished} (${rate(r.finished, r.reached)})` }))} empty="No visitors yet." />
        </div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Countries</h2><RankBars rows={v.countries.map((r) => ({ label: region.of(r.country) ?? r.country, value: r.visitors }))} empty="No location known yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Languages people read in</h2><RankBars rows={v.languages.map((r) => ({ label: language.of(r.locale) ?? r.locale, value: r.visitors }))} empty="No visitors yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Which site</h2><RankBars rows={v.sites.map((r) => ({ label: SITES[r.site] ?? r.site, value: r.views, note: `${r.visitors} visitors` }))} empty="No views yet." /></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Busiest weekdays</h2><RankBars rows={v.weekdays.map((w) => ({ label: w.day, value: w.views }))} empty="No views yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Busiest hours <span className="text-xs font-normal text-muted">New York time</span></h2><HourBars hours={v.hours} /></div>
      </section>

      <section className="card p-7">
        <h2 className="mb-1 text-lg font-semibold">Most active accounts, 30 days</h2>
        <p className="mb-5 text-xs text-muted">Signed-in people by page views. Credits and grants are under People.</p>
        {s.users.top.length === 0 ? <p className="text-sm text-muted">No signed-in visits yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-4 font-semibold">Person</th><th className="px-3 text-right font-semibold">Views</th><th className="px-3 text-right font-semibold">Sessions</th><th className="px-3 text-right font-semibold">Days</th><th className="pl-3 font-semibold">Last seen</th></tr></thead>
              <tbody className="divide-y divide-line">
                {s.users.top.map((u) => (
                  <tr key={u.label}><td className="py-3 pr-4">{u.label}</td><td className="px-3 text-right tabular-nums">{u.views}</td><td className="px-3 text-right tabular-nums">{u.sessions}</td><td className="px-3 text-right tabular-nums">{u.days}</td><td className="pl-3 text-xs text-muted">{day(u.last)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
