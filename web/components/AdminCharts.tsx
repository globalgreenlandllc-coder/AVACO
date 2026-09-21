/** Charts for the admin portal. One hue, thin marks, a fixed baseline; every mark carries its value as a tooltip and the numbers that matter are written out. */

export function DailyBars({ data, format, label }: { data: Array<{ day: string; value: number }>; format: (v: number) => string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const [w, h, gap] = [720, 140, 4];
  const bw = (w - gap * (data.length - 1)) / data.length;
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`${label}, last ${data.length} days. Highest: ${format(peak.value)} on ${peak.day}.`}>
        <line x1="0" x2={w} y1={h} y2={h} stroke="var(--line)" strokeWidth="1" />
        {data.map((d, i) => {
          const bh = d.value === 0 ? 0 : Math.max(2, (d.value / max) * (h - 16));
          return (
            <g key={d.day}>
              <rect x={i * (bw + gap)} y={0} width={bw} height={h} fill="transparent"><title>{`${d.day}: ${format(d.value)}`}</title></rect>
              {bh > 0 && <path d={roundedTop(i * (bw + gap), h - bh, bw, bh, Math.min(4, bw / 2))} fill="var(--bar-leading)"><title>{`${d.day}: ${format(d.value)}`}</title></path>}
              {d === peak && d.value > 0 && <text x={i * (bw + gap) + bw / 2} y={h - bh - 5} textAnchor="middle" fontSize="11" fill="var(--ink-2)">{format(d.value)}</text>}
            </g>
          );
        })}
        <text x="0" y={h + 14} fontSize="10" fill="var(--muted)">{data[0]?.day.slice(5)}</text>
        <text x={w} y={h + 14} fontSize="10" textAnchor="end" fill="var(--muted)">{data.at(-1)?.day.slice(5)}</text>
      </svg>
      <figcaption className="sr-only">{data.map((d) => `${d.day}: ${format(d.value)}`).join("; ")}</figcaption>
    </figure>
  );
}

/** A rectangle square at the baseline and rounded at the data end. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
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
