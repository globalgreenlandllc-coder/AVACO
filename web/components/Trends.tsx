import type { Analysis } from "@/lib/gateway";

interface Series { key: string; name: string; values: number[] }

/**
 * Small multiples: one sparkline per scale, oldest to newest, with the first and last value written out.
 * Twenty-two lines on one chart would be unreadable; twenty-two small charts on one scale are comparable.
 */
export function Trends({ analyses, names, title, lead }: { analyses: Analysis[]; names: (key: string, fallback: string) => string; title: string; lead: string }) {
  const done = analyses.filter((a) => a.status === "completed").reverse(); // oldest first
  if (done.length < 2) return null;

  const collect = (pick: (a: Analysis) => Array<{ key: string; label: string; value: number }> | null): Series[] => {
    const first = pick(done[0]) ?? [];
    return first.map((item) => ({
      key: item.key,
      name: names(item.key, item.label),
      values: done.map((a) => pick(a)?.find((x) => x.key === item.key)?.value).filter((v): v is number => typeof v === "number"),
    })).filter((s) => s.values.length === done.length);
  };
  const series = [...collect((a) => a.psytype), ...collect((a) => a.emostate)];
  if (series.length === 0) return null;

  return (
    <section className="card p-8 sm:p-12">
      <h2 className="font-display text-3xl font-medium">{title}</h2>
      <p className="mt-2 text-sm text-ink-2">{lead}</p>
      <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => <li key={s.key} className="break-inside-avoid-page"><Spark series={s} /></li>)}
      </ul>
    </section>
  );
}

function Spark({ series }: { series: Series }) {
  const [w, h, pad] = [240, 40, 4];
  const { values } = series;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v: number) => h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - 2 * pad); // fixed 0 to 100, so charts compare
  const first = values[0];
  const last = values[values.length - 1];
  const delta = Math.round((last - first) * 10) / 10;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{series.name}</span>
        <span className="tabular-nums text-ink-2">{first} → <span className="font-semibold text-ink">{last}</span> <span className="text-xs text-muted">({delta > 0 ? "+" : ""}{delta})</span></span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 w-full" role="img" aria-label={`${series.name}: ${values.join(", ")}`}>
        <line x1="0" x2={w} y1={y(50)} y2={y(50)} stroke="var(--line)" strokeWidth="1" />
        <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="3" fill="var(--accent)" />
      </svg>
    </div>
  );
}
