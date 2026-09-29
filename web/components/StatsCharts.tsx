/** Admin → Statistics: a number with its change against the previous period, and the funnel from visitor to paying customer. */
import { Bars, type Bar } from "./AdminCharts";
import { Flash } from "./Flash";

export function KpiDelta({ label, value, previous, sub, format = String }: { label: string; value: number; previous?: number | null; sub?: string; format?: (v: number) => string }) {
  const pct = previous != null && previous > 0 ? Math.round(((value - previous) / previous) * 100) : null;
  const tone = pct == null || pct === 0 ? "text-muted" : pct > 0 ? "text-accent-text" : "text-danger";
  return (
    <div className="card p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-3 flex items-baseline gap-3">
        <Flash value={value} className="font-display text-4xl font-medium tabular-nums">{format(value)}</Flash>
        {pct != null && <span className={`text-sm font-semibold tabular-nums ${tone}`} title="Against the previous period">{pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}%</span>}
        {pct == null && previous === 0 && value > 0 && <span className="text-sm font-semibold text-muted">new</span>}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-2">{sub}</p>}
    </div>
  );
}

export function Funnel({ steps }: { steps: Array<{ label: string; value: number; note?: string }> }) {
  const max = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value ?? 0;
        const rate = i === 0 ? null : prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{s.label}{s.note && <span className="ml-2 text-xs text-muted">{s.note}</span>}</span>
              <span className="tabular-nums"><b>{s.value}</b>{rate != null && <span className="ml-2 text-xs text-muted">{rate}% of the step before</span>}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-r-full bg-track"><div className="h-full rounded-r-full" style={{ width: `${s.value > 0 ? Math.max(1, (s.value / max) * 100) : 0}%`, background: "var(--bar-leading)" }} /></div>
          </li>
        );
      })}
    </ol>
  );
}

/** Views by hour of the day, the busiest hour pointed out. */
export function HourBars({ hours }: { hours: Array<{ hour: number; views: number }> }) {
  const label = (h: number) => (h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`);
  const peak = hours.reduce((a, b) => (b.views > a.views ? b : a), hours[0]);
  const items: Bar[] = hours.map((h) => ({ key: String(h.hour), value: h.views, axis: h.hour % 3 === 0 ? label(h.hour) : "", title: `${label(h.hour)}: ${h.views} views`, strong: h === peak && h.views > 0 }));
  return <Bars items={items} format={String} height={130} ariaLabel={`Views by hour, New York time. Busiest: ${label(peak.hour)} with ${peak.views} views.`} />;
}
