/** Charts for the admin portal: real text for every number, one hue, a fixed baseline, and the numbers that matter written out under each chart. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-09-27" → "27 Sep". */
export const dayLabel = (day: string) => { const [, m, d] = day.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m}`; };

/** The smallest of 1, 2, 5 × 10ⁿ at or above x: the step between gridlines. */
function niceStep(x: number): number {
  if (x <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 5, 10]) if (m * pow >= x) return m * pow;
  return 10 * pow;
}

export interface Bar { key: string; value: number; /** Written under the bar, when this one carries a tick. */ axis?: string; title: string; /** The bar to point out (the peak): full colour and always labelled. */ strong?: boolean; /** Always labelled, even in a crowded chart (the latest day). */ labelled?: boolean }

/** Bars with real text: a scale on the left, the value on every bar while there is room, ticks along the bottom. */
export function Bars({ items, format, height = 170, ariaLabel }: { items: Bar[]; format: (v: number) => string; height?: number; ariaLabel: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  const step = niceStep(max / 4);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = Array.from({ length: Math.round(top / step) }, (_, i) => (i + 1) * step);
  const labelled = items.filter((i) => i.value > 0).length <= 16;
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="relative" style={{ height: height + 24 }}>
        <div className="absolute inset-x-0 top-6 bottom-0">
          {ticks.map((t) => (
            <div key={t} className="absolute right-0 left-10 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -top-2 right-full mr-2 text-[11px] tabular-nums text-muted">{format(t)}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 right-0 left-10 flex items-end gap-[3px]">
            {items.map((i) => (
              <div key={i.key} className="relative flex h-full flex-1 items-end" title={i.title}>
                <div
                  className={`relative w-full rounded-t-[3px] ${i.value > 0 ? "" : "bg-track"}`}
                  style={{ height: i.value > 0 ? `${Math.max(1.5, (i.value / top) * 100)}%` : 2, background: i.value > 0 ? (i.strong ? "var(--bar-leading)" : "color-mix(in oklab, var(--bar-leading) 72%, var(--surface))") : undefined }}
                >
                  {i.value > 0 && (labelled || i.strong || i.labelled) && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold tabular-nums whitespace-nowrap">{format(i.value)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex gap-[3px] pl-10">
        {items.map((i) => <div key={i.key} className="relative h-4 flex-1">{i.axis && <span className="absolute left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted">{i.axis}</span>}</div>)}
      </div>
    </div>
  );
}

/** One bar per day, the peak pointed out, and under it the total, the best day and the daily average (`decimals` of them). */
export function DailyBars({ data, format, label, decimals = 1 }: { data: Array<{ day: string; value: number }>; format: (v: number) => string; label: string; decimals?: number }) {
  if (data.length === 0) return null;
  const n = data.length;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  const avg = Math.round((total / n) * 10 ** decimals) / 10 ** decimals;
  const items: Bar[] = data.map((d, i) => ({ key: d.day, value: d.value, axis: (n - 1 - i) % 7 === 0 ? dayLabel(d.day) : "", title: `${dayLabel(d.day)}: ${format(d.value)}`, strong: d === peak && d.value > 0, labelled: i === n - 1 }));
  return (
    <figure>
      <Bars items={items} format={format} ariaLabel={`${label}, last ${n} days. Highest: ${format(peak.value)} on ${dayLabel(peak.day)}.`} />
      <figcaption className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-2">
        <span>{n} days: <b className="text-ink">{format(total)}</b></span>
        {peak.value > 0 && <span>Best day: <b className="text-ink">{dayLabel(peak.day)}, {format(peak.value)}</b></span>}
        <span>Average: <b className="text-ink">{format(avg)}</b> a day</span>
      </figcaption>
    </figure>
  );
}

export function RankBars({ rows, empty }: { rows: Array<{ label: string; value: number; note?: string }>; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span>{r.label}{r.note && <span className="ml-2 text-xs text-muted">{r.note}</span>}</span><span className="font-semibold tabular-nums">{r.value}</span></div>
          <div className="mt-1.5 h-2 rounded-r-full bg-track"><div className="h-full rounded-r-full" style={{ width: `${(r.value / max) * 100}%`, background: "var(--bar-leading)" }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-3 font-display text-4xl font-medium tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-2">{sub}</p>}
    </div>
  );
}
