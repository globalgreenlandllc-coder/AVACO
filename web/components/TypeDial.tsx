"use client";
/**
 * The eight personality types as an instrument: a bezel of ticks like a watch face, the eight types around it, a sweep
 * hand that reads each type in turn (a caption below says what the hand is on), and the voice signature drawn inside.
 *
 *   rows       the eight scores: the signature, labels with values, the caption cycling through the types
 *   rows null  scanning: the analysing screen, the hand comparing the voice with each type, no scores yet
 *   revealId   on the report's cover: if the analysing screen of this report was just shown (sessionStorage), the hand
 *              scans fast, slows, stops on the leading type and the signature draws in: the result, revealed
 *
 * Moves on requestAnimationFrame through refs (no re-render per frame), stands still for reduced motion, and pauses on
 * a type that is tapped or hovered. Colours follow the surface: the dark gold cover, or a light card.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { dialEn } from "@/lib/i18n/dial-en";

const ORDER = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];
const R = 132, BEZEL = 150, LABEL = 172;
const REVEAL_KEY = (id: string) => `avoco-reveal:${id}`;

export interface DialRow { key: string; name: string; value: number; zone?: string; tag?: string; text?: string | null }
export interface DialText { legend: string; comparing: string; reading: string; yourType: string; hint: string }

const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
const at = (deg: number, r: number) => ({ x: Math.cos(rad(deg)) * r, y: Math.sin(rad(deg)) * r });
const f = (n: number) => Math.round(n * 10) / 10;

/** Call on the analysing screen: the report that follows will reveal its type. */
export function markReveal(id: string) { try { sessionStorage.setItem(REVEAL_KEY(id), "1"); } catch { /* no reveal, still shown */ } }

export function TypeDial({ rows, names, t = dialEn, tone = "cover", compact = false, revealId, caption }: {
  rows: DialRow[] | null;
  /** The eight types' names, for the labels when there are no scores yet. */
  names?: Record<string, string>;
  /** The words; the compact dial shows none, so it may go without. */
  t?: DialText;
  tone?: "cover" | "card";
  /** Small, inside the analysing console: no labels or caption. */
  compact?: boolean;
  revealId?: string;
  /** A line under the caption (the landing page's "the sample profile…"). */
  caption?: string;
}) {
  const c = tone === "cover"
    ? { ink: "var(--cover-ink)", muted: "var(--cover-muted)", gold: "var(--cover-gold)", bg: "var(--cover-bg)" }
    : { ink: "var(--ink)", muted: "var(--muted)", gold: "var(--accent)", bg: "var(--surface)" };
  const axes: DialRow[] = useMemo(() => ORDER.map((key) => rows?.find((r) => r.key === key) ?? { key, name: names?.[key] ?? key, value: 0 }), [rows, names]);
  const scored = Boolean(rows && rows.length >= 8);
  const leaderIndex = scored ? axes.reduce((best, r, i) => (r.value > axes[best].value ? i : best), 0) : 0;

  const hand = useRef<SVGGElement>(null);
  const labels = useRef<Array<SVGGElement | null>>([]);
  const [current, setCurrent] = useState(leaderIndex);
  const [pinned, setPinned] = useState<number | null>(null);
  const [phase, setPhase] = useState<"scan" | "settle" | "shown" | "sweep">(scored ? "sweep" : "scan");
  const pinnedRef = useRef<number | null>(null);
  pinnedRef.current = pinned;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let reveal = false;
    if (scored && revealId) { try { reveal = sessionStorage.getItem(REVEAL_KEY(revealId)) === "1"; sessionStorage.removeItem(REVEAL_KEY(revealId)); } catch { reveal = false; } }
    const setAngle = (deg: number) => hand.current?.setAttribute("transform", `rotate(${f(deg)})`);
    const light = (i: number) => labels.current.forEach((el, j) => el?.setAttribute("data-lit", j === i ? "1" : "0"));
    if (reduced) { setAngle(leaderIndex * 45); light(leaderIndex); setCurrent(leaderIndex); setPhase(scored ? "shown" : "scan"); return; }

    let angle = 0, last = performance.now(), frame = 0, lastIndex = -1;
    let mode: "scan" | "settle" | "hold" | "sweep" = reveal || !scored ? "scan" : "sweep";
    if (reveal) setPhase("scan");
    let settleFrom = 0, settleTo = 0, settleStart = 0, holdUntil = 0;
    const scanUntil = reveal ? last + 2600 : Infinity;
    const SETTLE_MS = 1700;

    const step = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      const pin = pinnedRef.current;
      if (pin !== null) {
        angle += Math.max(-6, Math.min(6, ((pin * 45 - (angle % 360) + 540) % 360) - 180)); // turn to the tapped type
      } else if (mode === "scan") {
        angle += dt * (360 / (scored ? 1100 : 2600));
        if (now > scanUntil) { mode = "settle"; settleFrom = angle; settleTo = Math.ceil((angle + 300) / 360) * 360 + leaderIndex * 45; settleStart = now; setPhase("settle"); }
      } else if (mode === "settle") {
        const k = Math.min(1, (now - settleStart) / SETTLE_MS), e = 1 - (1 - k) ** 3;
        angle = settleFrom + (settleTo - settleFrom) * e;
        if (k >= 1) { mode = "hold"; holdUntil = now + 4200; setPhase("shown"); }
      } else if (mode === "hold") {
        if (now > holdUntil) { mode = "sweep"; setPhase("sweep"); }
      } else {
        angle += dt * (360 / 9000); // the calm sweep: one turn in nine seconds
      }
      setAngle(angle);
      const index = Math.round((((angle % 360) + 360) % 360) / 45) % 8;
      if (index !== lastIndex) { lastIndex = index; light(index); setCurrent(index); }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [scored, revealId, leaderIndex]);

  const shape = axes.map((r, i) => at(i * 45, (Math.max(0, Math.min(100, r.value)) / 100) * R));
  const octagon = (r: number) => ORDER.map((_, i) => at(i * 45, r)).map((p) => `${f(p.x)},${f(p.y)}`).join(" ");
  const shown = scored && phase !== "scan" && phase !== "settle";
  const focus = axes[pinned ?? current];
  const size = compact ? "-170 -170 340 340" : "-292 -228 584 456";

  return (
    <figure className="select-none">
      <svg viewBox={size} className="w-full" role="img" aria-label={scored ? axes.map((r) => `${r.name} ${r.value}`).join(", ") : t.reading}>
        <defs>
          <radialGradient id={`dial-fill-${tone}`}><stop offset="0%" stopColor={c.gold} stopOpacity="0.12" /><stop offset="100%" stopColor={c.gold} stopOpacity="0.45" /></radialGradient>
          <radialGradient id={`dial-core-${tone}`}><stop offset="0%" stopColor={c.gold} stopOpacity="0.9" /><stop offset="100%" stopColor={c.gold} stopOpacity="0" /></radialGradient>
        </defs>

        {/* The bezel: an outer ring of dots turning slowly, ticks every 5°, a long tick on each type. */}
        <g className="orbit" style={{ animationDuration: "120s" }}>
          {Array.from({ length: 120 }, (_, i) => { const p = at(i * 3, BEZEL + 12); return <circle key={i} cx={f(p.x)} cy={f(p.y)} r={i % 10 === 0 ? 1.6 : 0.8} fill={c.muted} opacity={i % 10 === 0 ? 0.7 : 0.35} />; })}
        </g>
        <circle r={BEZEL} fill="none" stroke={c.muted} strokeOpacity="0.35" />
        {Array.from({ length: 72 }, (_, i) => {
          const major = i % 9 === 0, a = at(i * 5, BEZEL), b = at(i * 5, BEZEL - (major ? 12 : 5));
          return <line key={i} x1={f(a.x)} y1={f(a.y)} x2={f(b.x)} y2={f(b.y)} stroke={major ? c.gold : c.muted} strokeOpacity={major ? 0.8 : 0.35} strokeWidth={major ? 1.6 : 1} />;
        })}
        <g className="orbit" style={{ animationDuration: "60s", animationDirection: "reverse" }}><circle r={46} fill="none" stroke={c.muted} strokeOpacity="0.3" strokeDasharray="2 6" /></g>

        {/* The grid: the full octagon, the 30 and 50 marks (active and leading), the eight axes. */}
        <polygon points={octagon(R)} fill="none" stroke={c.muted} strokeOpacity="0.3" />
        {[30, 50].map((m) => <polygon key={m} points={octagon((m / 100) * R)} fill="none" stroke={c.muted} strokeOpacity="0.45" strokeDasharray="3 5" />)}
        {ORDER.map((_, i) => { const e = at(i * 45, R); return <line key={i} x1="0" y1="0" x2={f(e.x)} y2={f(e.y)} stroke={c.muted} strokeOpacity="0.18" />; })}
        {!compact && [30, 50].map((m) => <text key={m} x="4" y={f(-(m / 100) * R - 3)} fontSize="9" fill={c.muted}>{m}</text>)}

        {/* The sweep: a fading trail and the hand, turned by the frame loop. */}
        <g ref={hand}>
          {Array.from({ length: 10 }, (_, i) => {
            const a0 = -(i + 1) * 4, a1 = -i * 4, p0 = at(a0, BEZEL - 2), p1 = at(a1, BEZEL - 2);
            return <path key={i} d={`M0,0 L${f(p0.x)},${f(p0.y)} A${BEZEL - 2},${BEZEL - 2} 0 0,1 ${f(p1.x)},${f(p1.y)} Z`} fill={c.gold} opacity={0.22 - i * 0.02} />;
          })}
          <line x1="0" y1="0" x2="0" y2={-(BEZEL - 2)} stroke={c.gold} strokeWidth="1.6" />
          <circle cx="0" cy={-(BEZEL - 2)} r="3.2" fill={c.gold} style={{ filter: `drop-shadow(0 0 4px ${c.gold})` }} />
        </g>

        {/* The signature, drawn in once the scores are there. */}
        {scored && (
          <g style={{ transform: `scale(${shown ? 1 : 0.001})`, opacity: shown ? 1 : 0, transition: "transform 1.1s cubic-bezier(.2,.8,.2,1), opacity .6s ease" }}>
            <polygon points={shape.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")} fill={`url(#dial-fill-${tone})`} stroke={c.gold} strokeWidth="2" strokeLinejoin="round" />
            {shape.map((p, i) => <circle key={i} cx={f(p.x)} cy={f(p.y)} r={axes[i].zone === "leading" ? 5.5 : 4} fill={c.gold} stroke={c.bg} strokeWidth="2" />)}
          </g>
        )}
        <circle r="16" fill={`url(#dial-core-${tone})`} className="core" />
        <circle r="5" fill={c.gold} />

        {/* The eight types around the bezel; the one under the hand lights up; a tap pins it. */}
        {!compact && axes.map((r, i) => {
          const p = at(i * 45, LABEL), cos = Math.cos(rad(i * 45)), sin = Math.sin(rad(i * 45));
          const anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
          const y = p.y + (sin > 0.3 ? 12 : sin < -0.3 ? -10 : 0);
          const leading = shown && r.zone === "leading";
          return (
            <g key={r.key} ref={(el) => { labels.current[i] = el; }} data-lit="0" className="dial-label cursor-pointer outline-none" tabIndex={0}
              onClick={() => setPinned((v) => (v === i ? null : i))} onMouseEnter={() => setPinned(i)} onMouseLeave={() => setPinned(null)} onFocus={() => setPinned(i)} onBlur={() => setPinned(null)}>
              <rect x={anchor === "end" ? p.x - 110 : anchor === "middle" ? p.x - 55 : p.x} y={y - 18} width="110" height="40" fill="transparent" />
              <text x={f(p.x)} y={f(y)} textAnchor={anchor} fontSize="15" fontWeight={leading ? 700 : 500} fill={leading ? c.ink : c.muted}>{r.name}</text>
              {scored && <text x={f(p.x)} y={f(y + 17)} textAnchor={anchor} fontSize="13.5" fontWeight="600" fill={leading ? c.gold : c.ink} style={{ fontVariantNumeric: "tabular-nums", opacity: shown ? 1 : 0, transition: "opacity .6s ease .3s" }}>{r.value}</text>}
            </g>
          );
        })}
      </svg>

      {!compact && (
        <figcaption className="mt-1 text-center" aria-live="polite">
          <p className="flex min-h-[4.75rem] flex-col items-center justify-start text-sm leading-snug" style={{ color: c.ink }}>
            {!scored || phase === "scan" || phase === "settle"
              ? <span style={{ color: c.muted }}>{scored && phase === "settle" ? t.reading : t.comparing.replace("{name}", focus.name)}</span>
              : phase === "shown" && pinned === null
                ? <><span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: c.gold }}>{t.yourType}</span><span className="mt-1 font-display text-2xl font-semibold" style={{ color: c.ink }}>{axes[leaderIndex].name} · {axes[leaderIndex].value}</span></>
                : <><span className="font-semibold">{focus.name} · {focus.value}{focus.tag ? ` · ${focus.tag}` : ""}</span>{focus.text ? <span className="mt-1 line-clamp-2 max-w-md text-xs" style={{ color: c.muted }}>{focus.text}</span> : null}</>}
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: c.muted }}>{t.legend}{scored ? ` ${t.hint}` : ""}</p>
          {caption && <p className="mt-1 text-xs" style={{ color: c.muted }}>{caption}</p>}
        </figcaption>
      )}
    </figure>
  );
}
