import type { ScaleRow, Zone } from "@/lib/report";

const FILL: Record<Zone, string> = { leading: "var(--bar-leading)", active: "var(--bar-active)", background: "var(--bar-background)" };

/**
 * Horizontal bars on a 0 to 100 scale. One hue; the zone sets the step, and is always written out
 * as text too, so nothing depends on colour alone. Hovering or focusing a row reveals what the scale means.
 */
export function Bars({ rows, zoneLabels, markers = false }: { rows: ScaleRow[]; zoneLabels?: Record<Zone, string>; markers?: boolean }) {
  return (
    <ul className="space-y-1">
      {rows.map((row, i) => (
        <li key={row.key} tabIndex={row.text ? 0 : undefined} className="group -mx-3 rounded-xl px-3 py-2.5 outline-offset-0 transition-colors hover:bg-track/50 focus-visible:bg-track/50">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{row.name}</span>
            <span className="flex items-baseline gap-3">
              {zoneLabels && row.zone && <span className="text-xs text-muted">{zoneLabels[row.zone]}</span>}
              <span className="w-10 text-right font-semibold tabular-nums">{row.value}</span>
            </span>
          </div>
          <div className="relative mt-2 h-2 rounded-r-full bg-track" role="img" aria-label={`${row.name}: ${row.value} / 100`}>
            <div className="bar-fill h-full rounded-r-full" style={{ width: `${Math.max(0, Math.min(100, row.value))}%`, background: FILL[row.zone ?? "leading"], animationDelay: `${i * 50}ms` }} />
            {markers && [30, 50].map((mark) => <span key={mark} className="absolute -top-1 h-4 w-px bg-ink-2/40" style={{ left: `${mark}%` }} aria-hidden />)}
          </div>
          {row.text && (
            <p className="grid grid-rows-[0fr] text-sm leading-relaxed text-ink-2 opacity-0 transition-all duration-200 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100 print:grid-rows-[1fr] print:opacity-100">
              <span className="overflow-hidden"><span className="block pt-2">{row.text}</span></span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
