import { DailyBars, Kpi, RankBars } from "@/components/AdminCharts";
import { overview } from "@/lib/admin";
import { getSettings } from "@/lib/billing";
import { en } from "@/lib/i18n/en";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

const SOURCES: Record<string, string> = { self: "Own account", invite: "Personal invite", open_link: "Group link", station: "Station", upload: "Uploaded file", api: "Company API" };

export default async function AdminOverview() {
  const [o, cfg] = await Promise.all([overview(), getSettings()]);
  const $ = (cents: number) => money(cents, o.currency, "en");
  const rate = o.conversion.recorded ? Math.round((o.conversion.opened / o.conversion.recorded) * 100) : 0;
  const typeName = (k: string) => (en.psytypes as Record<string, { name: string }>)[k]?.name ?? k;
  const fieldName = (k: string) => (en.deep.fit.fields as Record<string, { name: string }>)[k]?.name ?? k;
  const presetName = (k: string) => (en.org.presets as Record<string, { name: string }>)[k]?.name ?? k;

  return (
    <div className="space-y-10">
      {!cfg.enabled && <p className="rounded-xl border border-line px-5 py-4 text-sm text-ink-2">Billing is <b>off</b>: every report is free. Switch it on under Pricing and settings when you are ready to charge.</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue, 30 days" value={$(o.revenue.month)} sub={`Today ${$(o.revenue.today)} · 7 days ${$(o.revenue.week)} · all time ${$(o.revenue.all)}`} />
        <Kpi label="Reports, 30 days" value={String(o.reports.month)} sub={`All time ${o.reports.all}: ${o.reports.self} own, ${o.reports.company} for companies`} />
        <Kpi label="Preview → paid, 30 days" value={`${rate}%`} sub={`${o.conversion.opened} of ${o.conversion.recorded} own recordings were opened with a credit`} />
        <Kpi label="Paying customers" value={String(o.payingCustomers)} sub={`${o.users ?? "?"} accounts · ${o.companies} companies · ${o.people} invited people`} />
        <Kpi label="Reports paid for, 30 days" value={String(o.opened.month)} sub={`All time ${o.opened.all}`} />
        <Kpi label="Credits outstanding" value={String(o.creditsOutstanding)} sub="Bought or granted, not yet used: reports you still owe" />
        <Kpi label="Revenue per paying customer" value={o.payingCustomers ? $(Math.round(o.revenue.all / o.payingCustomers)) : $(0)} sub="All time" />
        <Kpi label="Revenue per report" value={o.reports.all ? $(Math.round(o.revenue.all / o.reports.all)) : $(0)} sub="All time, free previews included" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Reports per day</h2><DailyBars data={o.series.map((d) => ({ day: d.day, value: d.reports }))} format={String} label="Reports per day" /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Revenue per day</h2><DailyBars data={o.series.map((d) => ({ day: d.day, value: d.revenue }))} format={$} label="Revenue per day" /></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Leading types people get</h2><RankBars rows={o.leadingTypes.map((r) => ({ label: typeName(r.key), value: r.n }))} empty="No finished reports yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Most common best-fit field</h2><RankBars rows={o.topFields.map((r) => ({ label: fieldName(r.key), value: r.n }))} empty="No finished reports yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">How recordings come in</h2><RankBars rows={o.sources.map((r) => ({ label: SOURCES[r.key] ?? r.key, value: r.n }))} empty="No recordings yet." /></div>
        <div className="card p-7"><h2 className="mb-5 text-lg font-semibold">Industries</h2><RankBars rows={o.industries.map((r) => ({ label: presetName(r.key), value: r.recordings, note: `${r.companies} ${r.companies === 1 ? "company" : "companies"}` }))} empty="No companies yet." /></div>
      </section>
    </div>
  );
}
