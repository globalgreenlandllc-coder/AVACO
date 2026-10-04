"use client";
/**
 * The backdrop of the landing pages: two voices as bands of light flowing across the whole screen behind the page, one
 * in the accent colour and one in the second neon, with a little dust drifting up through them. The bands lean toward
 * the pointer, and scrolling plays them on. A picture, not a measurement: it reads no microphone. Drawn at half the
 * screen's rate, stopped while the tab is hidden, and drawn once and left still with reduced motion.
 */
import { useEffect, useRef } from "react";

const STEP = 18, DUST = 46;

export function VoiceField() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const css = getComputedStyle(el);
    const colour = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const voices = [colour("--accent", "#38e8ff"), colour("--neon-2", "#8b6cff")];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dust = Array.from({ length: DUST }, () => ({ x: Math.random(), y: Math.random(), size: 0.6 + Math.random() * 1.6, speed: 0.004 + Math.random() * 0.012, beat: Math.random() * 6.3, voice: Math.random() < 0.5 ? 0 : 1 }));
    let frame = 0, last = 0, w = 0, h = 0, px = -1, py = -1;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = el.clientWidth; h = el.clientHeight;
      el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (!still) frame = requestAnimationFrame(draw);
      if (now - last < 33 && !still) return;
      last = now;
      const t = now / 1000 + window.scrollY * 0.0016;
      const lines = w < 640 ? 7 : 12;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1;
      voices.forEach((stroke, v) => {
        ctx.strokeStyle = stroke;
        for (let i = 0; i < lines; i++) {
          const k = i / (lines - 1);
          // Each band is brightest along its middle line and thins out toward its edges.
          ctx.globalAlpha = 0.04 + 0.17 * Math.sin(k * Math.PI);
          ctx.beginPath();
          const base = h * (0.36 + 0.3 * v) + (k - 0.5) * h * 0.2;
          for (let x = -STEP; x <= w + STEP; x += STEP) {
            const u = x / w, swell = Math.sin(Math.min(1, Math.max(0, u)) * Math.PI);
            let y = base
              + Math.sin(u * 5.2 + t * (0.5 + v * 0.17) + k * 2.2 + v * 1.7) * h * 0.06 * swell
              + Math.sin(u * 11 - t * 0.8 + k * 5) * h * 0.018 * swell * (0.5 + 0.5 * Math.sin(t * 0.6 + k * 3));
            if (px >= 0) { const d = (x - px) / 190; y += (py - y) * 0.2 * Math.exp(-d * d); }
            if (x === -STEP) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
      for (const mote of dust) {
        const y = ((mote.y - t * mote.speed) % 1 + 1) % 1;
        ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.7 + mote.beat));
        ctx.fillStyle = voices[mote.voice];
        ctx.beginPath();
        ctx.arc(mote.x * w + Math.sin(t * 0.4 + mote.beat) * 14, y * h, mote.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const move = (e: PointerEvent) => { if (e.pointerType === "mouse") { px = e.clientX; py = e.clientY; } };
    const away = () => { px = -1; };
    const resize = () => { fit(); if (still) draw(0); };
    const wake = () => { cancelAnimationFrame(frame); if (!document.hidden && !still) frame = requestAnimationFrame(draw); };
    fit();
    if (still) draw(0); else frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", away);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", away);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return <canvas ref={canvas} className="voice-field no-print" aria-hidden />;
}
