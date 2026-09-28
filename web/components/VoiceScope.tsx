"use client";
/**
 * The live view of the voice while it is being recorded: the spectrum of the voice as mirrored gold bars, the
 * recording's shape drawing itself underneath, and three readouts (signal, pitch, room). Reads the recorder's
 * analyser on every frame and never touches the recording itself.
 */
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { detectPitch, roomOf, type Room } from "@/lib/waveform";

const BARS = 44, F_LOW = 80, F_HIGH = 6000;

export function VoiceScope({ analyser, sampleRate, t }: { analyser: AnalyserNode | null; sampleRate: number; t: Dict["record"]["scope"] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState<{ level: number; pitch: number | null; room: Room | null }>({ level: 0, pitch: null, room: null });

  useEffect(() => {
    const el = canvas.current;
    if (!el || !analyser) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(el);
    const colour = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const gold = colour("--accent", "#e2a647"), deep = colour("--bar-leading", "#8a5306"), line = colour("--line", "#ebe0cb");

    const freq = new Uint8Array(analyser.frequencyBinCount);
    const time = new Float32Array(analyser.fftSize);
    const binHz = sampleRate / analyser.fftSize;
    // Bars on a log scale between the lowest and highest frequencies that matter for a voice.
    const edges = Array.from({ length: BARS + 1 }, (_, k) => F_LOW * (F_HIGH / F_LOW) ** (k / BARS));
    const bars = new Array<number>(BARS).fill(0), hold = new Array<number>(BARS).fill(0);
    const history: number[] = [], floors: number[] = [];
    let frame = 0, tick = 0, pitch: number | null = null, lastVoiced = 0, level = 0;

    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth, h = el.clientHeight;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) { el.width = Math.round(w * dpr); el.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    const draw = () => {
      const { w, h } = fit();
      analyser.getByteFrequencyData(freq);
      analyser.getFloatTimeDomainData(time);
      tick++;

      // Level and the room: the loud tenth is the voice, the quiet tenth the floor.
      let energy = 0;
      for (let i = 0; i < time.length; i++) energy += time[i] * time[i];
      const rms = Math.sqrt(energy / time.length);
      const db = 20 * Math.log10(rms || 1e-9);
      level = level * 0.7 + Math.min(1, rms * 4) * 0.3;
      floors.push(db); if (floors.length > 240) floors.shift();
      history.push(Math.min(1, rms * 3.5)); if (history.length > Math.floor(w / 2)) history.shift();

      // Pitch every third frame, on a lighter copy of the frame.
      if (tick % 3 === 0) {
        const step = Math.max(1, Math.floor(sampleRate / 16000));
        const light = new Float32Array(Math.floor(time.length / step));
        for (let i = 0; i < light.length; i++) light[i] = time[i * step];
        const p = detectPitch(light, sampleRate / step);
        if (p) { pitch = pitch ? pitch * 0.6 + p * 0.4 : p; lastVoiced = tick; }
        else if (tick - lastVoiced > 30) pitch = null;
      }
      if (tick % 6 === 0) {
        const sorted = [...floors].sort((a, b) => a - b);
        const room = sorted.length >= 60 ? roomOf(sorted[Math.floor(sorted.length * 0.1)]) : null;
        setReadout({ level, pitch: pitch ? Math.round(pitch) : null, room });
      }

      ctx.clearRect(0, 0, w, h);
      // The spectrum: mirrored bars, fast to rise and slow to fall, with a held peak above each.
      const top = h * 0.68, mid = top / 2, bw = w / BARS, slot = bw * 0.58;
      const grad = ctx.createLinearGradient(0, 0, 0, top);
      grad.addColorStop(0, deep); grad.addColorStop(0.5, gold); grad.addColorStop(1, deep);
      for (let k = 0; k < BARS; k++) {
        const b0 = Math.max(0, Math.floor(edges[k] / binHz)), b1 = Math.max(b0 + 1, Math.floor(edges[k + 1] / binHz));
        let sum = 0;
        for (let b = b0; b < b1 && b < freq.length; b++) sum += freq[b];
        const v = Math.min(1, sum / (b1 - b0) / 255 * 1.25);
        bars[k] = Math.max(v, bars[k] * 0.82);
        hold[k] = Math.max(bars[k], hold[k] - 0.012);
        const bh = Math.max(2, bars[k] * (top - 8));
        const x = k * bw + (bw - slot) / 2;
        ctx.fillStyle = grad;
        roundRect(ctx, x, mid - bh / 2, slot, bh, slot / 2);
        ctx.fillStyle = gold;
        ctx.globalAlpha = 0.55;
        const hy = Math.max(2, hold[k] * (top - 8)) / 2;
        ctx.fillRect(x, mid - hy - 3, slot, 1.5);
        ctx.fillRect(x, mid + hy + 1.5, slot, 1.5);
        ctx.globalAlpha = 1;
      }
      // The recording's shape so far, drawn from the left, two pixels per frame.
      const base = h - 2, band = h - top - 6;
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, top + 3); ctx.lineTo(w, top + 3); ctx.stroke();
      ctx.fillStyle = gold; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.moveTo(0, base);
      history.forEach((v, i) => ctx.lineTo(i * 2, base - v * band));
      ctx.lineTo((history.length - 1) * 2, base); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = deep; ctx.lineWidth = 1.2;
      ctx.beginPath();
      history.forEach((v, i) => (i === 0 ? ctx.moveTo(0, base - v * band) : ctx.lineTo(i * 2, base - v * band)));
      ctx.stroke();
      // The writing head.
      const hx = (history.length - 1) * 2, hy = base - (history.at(-1) ?? 0) * band;
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, Math.PI * 2); ctx.fill();

      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser, sampleRate]);

  const segments = 14, lit = Math.round(readout.level * segments);
  return (
    <div className="w-full">
      <canvas ref={canvas} className="block h-32 w-full" aria-label={t.signal} />
      <dl className="mt-3 grid grid-cols-3 gap-3 text-left">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t.signal}</dt>
          <dd className="mt-1.5 flex h-5 items-center gap-[3px]" aria-label={`${Math.round(readout.level * 100)}%`}>
            {Array.from({ length: segments }, (_, i) => <span key={i} className="h-3 w-1.5 rounded-sm" style={{ background: i < lit ? (i >= segments - 2 ? "var(--danger)" : "var(--accent)") : "var(--track)" }} />)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t.pitch}</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{readout.pitch ? t.hz.replace("{n}", String(readout.pitch)) : <span className="text-muted">—</span>}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t.room}</dt>
          <dd className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: readout.room === "noisy" ? "var(--danger)" : readout.room === "fair" ? "var(--accent)" : readout.room === "quiet" ? "var(--accent-text)" : "var(--track)" }} aria-hidden />
            <span className={readout.room ? "" : "text-sm font-normal text-muted"}>{readout.room ? t[readout.room] : t.listening}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath(); ctx.fill();
}
