"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { Thinking } from "./Thinking";

/**
 * The live "analysing" screen. AVOCO reports nothing until it is done, so the stages advance on a clock
 * that follows a typical run (about a minute); the page's polling flips to the real report the moment
 * the result lands, whichever stage is showing. The visual is a voice signal being scanned.
 */
const STAGE_AT = [0, 4, 12, 24, 38, 52]; // seconds at which each stage begins
const TYPICAL = 60;

export function Analysing({ t, startedAt, thoughts }: { t: Dict["report"]["live"]; startedAt: number; thoughts: string[] }) {
  // The server and the browser read the clock at different moments, so the first paint uses the
  // moment the recording started (0 s) and the real clock takes over once the page is live.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const seconds = now === null ? 0 : Math.max(0, (now - startedAt) / 1000);
  const stage = STAGE_AT.filter((s) => seconds >= s).length - 1;
  // Eases toward 95% and waits there: the last step only completes when the real result arrives.
  const progress = Math.min(95, 100 * (1 - Math.exp(-seconds / (TYPICAL * 0.55))));
  const overdue = seconds > TYPICAL * 2;
  const clock = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return (
    <div className="card mt-8 overflow-hidden px-7 py-12 sm:px-12" aria-live="polite" aria-busy="true">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-md leading-relaxed text-ink-2">{overdue ? t.slow : t.lead}</p>

          <ol className="mt-8 space-y-3">
            {t.stages.map((label, i) => {
              const state = i < stage ? "done" : i === stage ? "now" : "next";
              return (
                <li key={label} className={`flex items-center gap-3 text-sm transition-opacity duration-500 ${state === "next" ? "opacity-40" : ""}`}>
                  <span className="grid h-6 w-6 shrink-0 place-items-center" aria-hidden>
                    {state === "done" && <span className="pop grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">✓</span>}
                    {state === "now" && <span className="relative grid h-6 w-6 place-items-center"><span className="breathe absolute inset-0 rounded-full bg-accent" /><span className="relative h-2.5 w-2.5 rounded-full bg-accent" /></span>}
                    {state === "next" && <span className="h-2 w-2 rounded-full bg-line" />}
                  </span>
                  <span className={state === "now" ? "font-semibold" : ""}>{label}</span>
                  <span className="sr-only">{state === "done" ? t.done : state === "now" ? t.inProgress : ""}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-col items-center">
          <Thinking thoughts={thoughts} label={t.title} />
          <div className="mt-6 w-full max-w-xs">
            <div className="flex items-baseline justify-between text-xs text-muted"><span>{t.progress}</span><span className="tabular-nums">{Math.round(progress)}%</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-center text-xs tabular-nums text-muted">{t.elapsed.replace("{time}", clock)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
