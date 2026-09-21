"use client";

import { useState } from "react";
import type { ScaleRow } from "@/lib/report";

/** AVOCO's own order of the types. A fixed order keeps the shape comparable between two reports. */
const ORDER = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];
const W = 520, H = 400, CX = W / 2, CY = H / 2, R = 128;

const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);

/**
 * The eight type scores as one shape, drawn for the dark cover. It gives the profile at a glance;
 * the bars further down carry the exact reading, so this needs no table of its own.
 */
export function Radar({ rows, help }: { rows: ScaleRow[]; help: string }) {
  const [active, setActive] = useState<string | null>(null);
  const axes = [...rows].sort((a, b) => rank(a.key) - rank(b.key));
  if (axes.length < 3) return null;

  const point = (i: number, value: number) => {
    const angle = (i / axes.length) * 2 * Math.PI - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * R;
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), cos: Math.cos(angle), sin: Math.sin(angle) };
  };
  const ring = (value: number) => axes.map((_, i) => point(i, value)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const shape = axes.map((row, i) => point(i, row.value)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const hovered = axes.find((row) => row.key === active);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={axes.map((row) => `${row.name} ${row.value}`).join(", ")}>
        <defs>
          <radialGradient id="radar-fill">
            <stop offset="0%" stopColor="var(--cover-gold)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--cover-gold)" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        <polygon points={ring(100)} fill="none" stroke="var(--cover-muted)" strokeOpacity="0.35" />
        {[30, 50].map((mark) => <polygon key={mark} points={ring(mark)} fill="none" stroke="var(--cover-muted)" strokeOpacity="0.45" strokeDasharray="3 5" />)}
        {axes.map((row, i) => {
          const edge = point(i, 100);
          return <line key={row.key} x1={CX} y1={CY} x2={edge.x} y2={edge.y} stroke="var(--cover-muted)" strokeOpacity="0.2" />;
        })}
        {[30, 50].map((mark) => <text key={mark} x={CX + 4} y={CY - (mark / 100) * R - 3} fontSize="9" fill="var(--cover-muted)">{mark}</text>)}

        <polygon className="radar-shape" style={{ transformOrigin: `${CX}px ${CY}px` }} points={shape} fill="url(#radar-fill)" stroke="var(--cover-gold)" strokeWidth="2" strokeLinejoin="round" />

        {axes.map((row, i) => {
          const at = point(i, row.value);
          const label = point(i, 100);
          const anchor = Math.abs(label.cos) < 0.3 ? "middle" : label.cos > 0 ? "start" : "end";
          const lx = label.x + label.cos * 14;
          const ly = label.y + label.sin * 14 + (label.sin > 0.3 ? 10 : label.sin < -0.3 ? -12 : 0);
          const on = active === row.key;
          return (
            <g key={row.key} tabIndex={0} className="cursor-default outline-none" onMouseEnter={() => setActive(row.key)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(row.key)} onBlur={() => setActive(null)}>
              <circle cx={at.x} cy={at.y} r="18" fill="transparent" />
              <circle className="radar-dot" style={{ animationDelay: `${1.1 + i * 0.06}s` }} cx={at.x} cy={at.y} r={on ? 7 : 4.5} fill="var(--cover-gold)" stroke="var(--cover-bg)" strokeWidth="2" />
              <text x={lx} y={ly} textAnchor={anchor} fontSize="13" fontWeight={on || row.zone === "leading" ? 700 : 500} fill={on || row.zone === "leading" ? "var(--cover-ink)" : "var(--cover-muted)"}>{row.name}</text>
              <text x={lx} y={ly + 15} textAnchor={anchor} fontSize="12" fontWeight="600" fill="var(--cover-ink)" style={{ fontVariantNumeric: "tabular-nums" }}>{row.value}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 min-h-10 text-center text-xs leading-relaxed" style={{ color: "var(--cover-muted)" }} aria-live="polite">
        {hovered ? <><span className="font-semibold" style={{ color: "var(--cover-ink)" }}>{hovered.name} · {hovered.value}</span>{hovered.tag ? ` · ${hovered.tag}` : ""}</> : help}
      </figcaption>
    </figure>
  );
}
