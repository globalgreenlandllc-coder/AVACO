"use client";
/**
 * The heart of the couples page: two voices drawn as rings of light, each with its own shape and beat, joined by spokes
 * wherever the two run close, around the sample couple's match score. Around them the spectrum of each voice, a dial
 * and a sweep, as on an instrument; the whole leans toward the pointer and stirs when it is over it. The rings are a
 * picture of the idea, not a measurement: the score and the four readings are the sample couple's real report
 * (lib/sample-couple.ts). Drawn only while it is on screen; with reduced motion it is drawn once and holds still.
 */
import { useEffect, useRef } from "react";
import { CountUp } from "./Motion";

const TAU = Math.PI * 2, POINTS = 240, BARS = 96, SPOKES = 60, MOTES = 40;
/** Each voice: where its ring sits, how it turns, and the three waves of its shape (whole numbers, so the ring closes). */
const VOICES = [
  { token: "--accent", fallback: "#ff5aa8", scale: 1, spin: 0.11, env: 0.9, phase: 0, k: [5, 9, 17], w: [1.3, 0.9, 2.1] },
  { token: "--neon-2", fallback: "#5ee7ff", scale: 0.84, spin: -0.14, env: 0.7, phase: 2.1, k: [4, 11, 19], w: [1.1, 1.4, 1.8] },
];
type Voice = (typeof VOICES)[number] & { colour: string };

/** A hex colour at an opacity, for gradient stops; anything else is passed through as it is. */
const fade = (hex: string, alpha: number) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + Math.round(alpha * 255).toString(16).padStart(2, "0") : hex);

export function ResonanceCore({ score, names, rows, t }: { score: number; names: { a: string; b: string }; rows: Array<{ name: string; score: number }>; t: { eyebrow: string; outOf: string; band: string; note: string } }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stir = useRef(1);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const css = getComputedStyle(el);
    const colour = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const voices: Voice[] = VOICES.map((v) => ({ ...v, colour: colour(v.token, v.fallback) }));
    const ink = colour("--ink", "#fdf1f8");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motes = Array.from({ length: MOTES }, () => ({ angle: Math.random() * TAU, orbit: 0.45 + Math.random() * 1.2, speed: (Math.random() - 0.5) * 0.5, size: 0.7 + Math.random() * 1.5, beat: Math.random() * TAU, voice: Math.random() < 0.5 ? 0 : 1 }));
    let frame = 0, w = 0, h = 0, lively = 1, onScreen = true;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = el.clientWidth; h = el.clientHeight;
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const time = now / 1000, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;
      lively += (stir.current - lively) * 0.06;
      // A voice's ring at an angle on the screen: its resting circle, pushed in and out by its three waves, louder in some stretches than others.
      const reach = (v: Voice, angle: number) => {
        const a = angle - time * v.spin;
        const loud = 0.5 + 0.5 * Math.sin(a * 2 + time * v.env + v.phase);
        const wave = Math.sin(a * v.k[0] + time * v.w[0]) * 0.55 + Math.sin(a * v.k[1] - time * v.w[1]) * 0.3 + Math.sin(a * v.k[2] + time * v.w[2]) * 0.15;
        return R * v.scale + wave * (0.25 + 0.75 * loud) * R * 0.15 * lively;
      };

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      // The sweep: a wedge of light turning like a radar's.
      if (typeof ctx.createConicGradient === "function") {
        const wedge = ctx.createConicGradient(time * 0.7, cx, cy);
        wedge.addColorStop(0, fade(voices[1].colour, 0));
        wedge.addColorStop(0.78, fade(voices[1].colour, 0));
        wedge.addColorStop(1, fade(voices[1].colour, 0.16));
        ctx.globalAlpha = 1;
        ctx.fillStyle = wedge;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, TAU); ctx.fill();
      }

      // The dial: a tick every three degrees, a longer one every thirty, turning slowly.
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (let i = 0; i < 120; i++) {
        const major = i % 10 === 0, angle = (i / 120) * TAU + time * 0.04;
        const from = R * 1.6, to = from + (major ? 9 : 4);
        ctx.globalAlpha = major ? 0.55 : 0.2;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from); ctx.lineTo(cx + Math.cos(angle) * to, cy + Math.sin(angle) * to); ctx.stroke();
      }

      // The spectrum: bars standing round the rings, one voice on each half, rising and falling like speech.
      ctx.lineWidth = Math.max(1.5, R * 0.016);
      for (let i = 0; i < BARS; i++) {
        const voice = i < BARS / 2 ? 0 : 1, angle = (i / BARS) * TAU - Math.PI / 2;
        const speech = Math.abs(Math.sin(i * 0.9 + time * 3.1 + voice * 2) * Math.sin(i * 0.23 - time * 1.3));
        const level = Math.min(1, (0.12 + 0.88 * speech * (0.55 + 0.45 * Math.sin(time * 0.9 + i * 0.11))) * lively);
        const from = R * 1.26, to = from + level * R * 0.28;
        ctx.strokeStyle = voices[voice].colour;
        ctx.globalAlpha = 0.3 + 0.6 * level;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from); ctx.lineTo(cx + Math.cos(angle) * to, cy + Math.sin(angle) * to); ctx.stroke();
      }

      // Spokes between the two rings, bright where the voices run close: where they agree.
      ctx.lineWidth = 1;
      ctx.strokeStyle = ink;
      for (let i = 0; i < SPOKES; i++) {
        const angle = (i / SPOKES) * TAU, a = reach(voices[0], angle), b = reach(voices[1], angle);
        const close = Math.max(0, 1 - Math.abs(a - b) / (R * 0.22));
        if (close <= 0) continue;
        ctx.globalAlpha = close * 0.65;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * a, cy + Math.sin(angle) * a); ctx.lineTo(cx + Math.cos(angle) * b, cy + Math.sin(angle) * b); ctx.stroke();
      }

      // The two voices: each ring drawn twice, a wide soft line under a thin bright one, which reads as a glow.
      for (const v of voices) {
        for (const pass of [{ width: R * 0.07, alpha: 0.13 }, { width: Math.max(1.6, R * 0.014), alpha: 0.95 }]) {
          ctx.beginPath();
          for (let i = 0; i <= POINTS; i++) {
            const angle = (i / POINTS) * TAU, r = reach(v, angle);
            if (i) ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r); else ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.strokeStyle = v.colour; ctx.lineWidth = pass.width; ctx.globalAlpha = pass.alpha;
          ctx.stroke();
        }
        // The point each voice is at now, riding its ring.
        const angle = time * (v.spin > 0 ? 0.55 : -0.42) + v.phase, r = reach(v, angle);
        ctx.fillStyle = v.colour;
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, R * 0.07, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Math.max(2.4, R * 0.02), 0, TAU); ctx.fill();
      }

      // Dust in orbit, in the two voices' colours.
      for (const mote of motes) {
        const angle = mote.angle + time * mote.speed, r = R * mote.orbit;
        ctx.fillStyle = voices[mote.voice].colour;
        ctx.globalAlpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(time * 2 + mote.beat));
        ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, mote.size, 0, TAU); ctx.fill();
      }

      if (!still && onScreen) frame = requestAnimationFrame(draw);
    };

    const resize = () => { fit(); if (still) draw(0); };
    fit();
    if (still) draw(0); else frame = requestAnimationFrame(draw);
    const seen = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      const was = onScreen;
      onScreen = entry.isIntersecting;
      if (onScreen && !was && !still) frame = requestAnimationFrame(draw);
    });
    seen?.observe(el);
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(frame); seen?.disconnect(); window.removeEventListener("resize", resize); };
  }, []);

  // The whole instrument leans toward the pointer, and the voices stir while it is over them.
  const lean = (e: React.PointerEvent<HTMLElement>) => {
    const node = wrap.current;
    if (!node || e.pointerType !== "mouse") return;
    const box = node.getBoundingClientRect();
    node.style.setProperty("--tx", (((e.clientX - box.left) / box.width - 0.5) * 14).toFixed(2));
    node.style.setProperty("--ty", ((0.5 - (e.clientY - box.top) / box.height) * 12).toFixed(2));
    stir.current = 1.7;
  };
  const rest = () => {
    wrap.current?.style.removeProperty("--tx");
    wrap.current?.style.removeProperty("--ty");
    stir.current = 1;
  };

  return (
    <figure className="resonance" onPointerMove={lean} onPointerLeave={rest}>
      <p className="mb-3 text-center"><span className="hud hud-chip"><span className="hud-live" aria-hidden />{t.eyebrow}</span></p>
      <div ref={wrap} className="resonance-wrap">
        <div className="resonance-stage">
          <canvas ref={canvas} className="resonance-canvas" aria-hidden />
          <div className="resonance-centre" role="img" aria-label={`${names.a} & ${names.b}: ${Math.round(score)} ${t.outOf}`}>
            <span className="resonance-score" aria-hidden><CountUp value={Math.round(score)} duration={2200} /></span>
            <span className="hud text-muted" aria-hidden>{t.outOf}</span>
            <span className="resonance-names" aria-hidden>{names.a}<i>×</i>{names.b}</span>
          </div>
        </div>
        <ul className="resonance-chips">
          {rows.map((row) => (
            <li key={row.name} className="resonance-chip">
              <p><span>{row.name}</span><b>{Math.round(row.score)}</b></p>
              <span aria-hidden><i style={{ width: `${Math.max(4, Math.min(100, row.score))}%` }} /></span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-4 text-center text-sm leading-relaxed text-ink-2"><span className="font-semibold text-ink">{t.band}</span><br /><span className="text-xs text-muted">{t.note}</span></figcaption>
    </figure>
  );
}
