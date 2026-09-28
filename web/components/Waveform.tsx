/**
 * The shape of a recording as gold bars, mirrored around the middle. `progress` (0..1) lights the bars up to that
 * point; `scan` runs a light across it while work is going on. Plain SVG, so it renders the same everywhere.
 */
export function Waveform({ peaks, progress = 1, scan = false, height = 56, label, className = "" }: { peaks: number[]; progress?: number; scan?: boolean; height?: number; label: string; className?: string }) {
  const n = Math.max(1, peaks.length);
  const lit = Math.round(Math.max(0, Math.min(1, progress)) * n);
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={label} style={{ height }}>
      <svg viewBox={`0 0 ${n * 3} 100`} preserveAspectRatio="none" className="block h-full w-full" aria-hidden>
        {peaks.map((p, i) => {
          const h = Math.max(4, Math.min(1, p) * 96);
          return <rect key={i} x={i * 3} y={50 - h / 2} width="2" height={h} rx="1" fill={i < lit ? "var(--bar-leading)" : "color-mix(in oklab, var(--bar-leading) 28%, transparent)"} />;
        })}
      </svg>
      {scan && <span className="scan-line pointer-events-none absolute inset-y-0 w-[12%]" aria-hidden />}
    </div>
  );
}
