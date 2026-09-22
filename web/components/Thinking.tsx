"use client";

import { useEffect, useState } from "react";

/**
 * A "mind at work": nodes on three orbits turning at different speeds, linked by pulsing edges, around a
 * breathing core, with a line of thought that changes every second or so. Pure CSS/SVG animation,
 * so it costs nothing while the real work happens elsewhere.
 */
const ORBITS = [
  { r: 30, n: 5, seconds: 9, dir: 1 },
  { r: 54, n: 8, seconds: 16, dir: -1 },
  { r: 80, n: 12, seconds: 26, dir: 1 },
];

// Coordinates are rounded so the server and the browser produce the same markup, digit for digit.
const px = (v: number) => Math.round(v * 100) / 100;

export function Thinking({ thoughts, size = 220, label }: { thoughts: string[]; size?: number; label: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1300);
    return () => clearInterval(id);
  }, []);
  const thought = thoughts.length ? thoughts[tick % thoughts.length] : "";

  return (
    <div className="flex flex-col items-center" role="img" aria-label={label}>
      <svg viewBox="-100 -100 200 200" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id="core"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></radialGradient>
        </defs>
        {ORBITS.map((o) => <circle key={o.r} r={o.r} fill="none" stroke="var(--line)" strokeWidth="0.6" strokeDasharray="2 3" />)}
        {/* edges between neighbouring orbits, pulsing */}
        {ORBITS.slice(0, -1).map((o, oi) => Array.from({ length: o.n }, (_, i) => {
          const a = (i / o.n) * Math.PI * 2, b = ((i + 0.5) / ORBITS[oi + 1].n) * Math.PI * 2, r2 = ORBITS[oi + 1].r;
          return <line key={`${oi}-${i}`} className="edge" x1={px(Math.cos(a) * o.r)} y1={px(Math.sin(a) * o.r)} x2={px(Math.cos(b) * r2)} y2={px(Math.sin(b) * r2)} stroke="var(--accent)" strokeWidth="0.7" style={{ animationDelay: `${(i * 0.37 + oi) % 3}s` }} />;
        }))}
        {ORBITS.map((o, oi) => (
          <g key={o.r} className="orbit" style={{ animationDuration: `${o.seconds}s`, animationDirection: o.dir > 0 ? "normal" : "reverse" }}>
            {Array.from({ length: o.n }, (_, i) => {
              const a = (i / o.n) * Math.PI * 2;
              return <circle key={i} className="node" cx={px(Math.cos(a) * o.r)} cy={px(Math.sin(a) * o.r)} r={oi === 0 ? 3.2 : oi === 1 ? 2.6 : 2} fill="var(--accent)" style={{ animationDelay: `${(i * 0.23 + oi * 0.5) % 2}s` }} />;
            })}
          </g>
        ))}
        <circle className="core" r="22" fill="url(#core)" />
        <circle className="core-dot" r="9" fill="var(--accent)" />
      </svg>
      <p key={tick} className="thought mt-2 h-6 text-center text-sm text-ink-2" aria-live="polite">{thought}</p>
    </div>
  );
}
