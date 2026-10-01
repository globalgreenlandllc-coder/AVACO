"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { syntheticPeaks } from "@/lib/waveform";
import { Waveform } from "./Waveform";
import { markReveal, TypeDial } from "./TypeDial";

/**
 * The live "analysing" screen. AVOCO reports nothing until it is done, so the stages advance on a clock that follows
 * a typical run (about a minute); the page's polling flips to the real report the moment the result lands, whichever
 * stage is showing. The visual is the person's own recording (handed over by the recorder through sessionStorage,
 * keyed by the analysis id in the address) being scanned, six measurement channels, and the eight-type map drawing
 * itself once the comparison begins. Decoration, never numbers: no score exists before the result.
 */
const STAGE_AT = [0, 4, 12, 24, 38, 52]; // seconds at which each stage begins
const TYPICAL = 60;
const STAND_IN = syntheticPeaks(120);
const CHANNEL_BARS = 9;
/** "Measured" heights per channel and bar, the same on the server and in the browser. */
const settled = (c: number, b: number) => 0.35 + 0.6 * Math.abs(Math.sin(c * 3.7 + b * 1.3));

/** `peaks`: the recording's shape when the caller has it (components/HeldWaiting.tsx); otherwise it is looked up by the report id in the address. */
export function Analysing({ t, startedAt, thoughts, queued = false, peaks: given = null }: { t: Dict["report"]["live"]; startedAt: number; thoughts: string[]; queued?: boolean; peaks?: number[] | null }) {
  // The server and the browser read the clock at different moments, so the first paint uses the
  // moment the recording started (0 s) and the real clock takes over once the page is live.
  const [now, setNow] = useState<number | null>(null);
  const [peaks, setPeaks] = useState<number[]>(STAND_IN);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const clockId = setInterval(() => setNow(Date.now()), 250);
    const thoughtId = setInterval(() => setTick((n) => n + 1), 1600);
    try {
      const key = location.pathname.split("/").filter(Boolean).pop() ?? "";
      if (location.pathname.startsWith("/reports/")) markReveal(key); // the report that replaces this screen reveals its type
      const list = JSON.parse(sessionStorage.getItem(`avoco-wave:${key}`) ?? "null") as unknown;
      if (Array.isArray(list) && list.length > 0 && list.length <= 400 && list.every((v) => typeof v === "number")) setPeaks(list as number[]);
    } catch { /* the stand-in stays */ }
    return () => { clearInterval(clockId); clearInterval(thoughtId); };
  }, []);
  useEffect(() => { if (given?.length) setPeaks(given); }, [given]);

  const seconds = now === null ? 0 : Math.max(0, (now - startedAt) / 1000);
  const stage = queued ? 0 : STAGE_AT.filter((s) => seconds >= s).length - 1;
  // Eases toward 95% and waits there: the last step only completes when the real result arrives.
  const progress = queued ? 4 : Math.min(95, 100 * (1 - Math.exp(-seconds / (TYPICAL * 0.55))));
  const overdue = seconds > TYPICAL * 2;
  const clock = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const thought = queued ? t.queuedThought : thoughts.length ? thoughts[tick % thoughts.length] : "";
  const measuring = !queued && stage >= 2, mapping = !queued && stage >= 3, scaling = !queued && stage >= 4;

  return (
    <div className="card mt-8 overflow-hidden px-7 py-12 sm:px-12" aria-live="polite" aria-busy="true">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="eyebrow">{queued ? t.queuedEyebrow : t.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{queued ? t.queuedTitle : t.title}</h1>
          <p className="mt-4 max-w-md leading-relaxed text-ink-2">{queued ? t.queuedLead : overdue ? t.slow : t.lead}</p>

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

        {/* The analyser's console: the recording being read, the channels it measures, the map it compares against. */}
        <div className="w-full">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t.console.signal}</p>
              <p className="text-xs tabular-nums text-muted">{clock}</p>
            </div>
            <div className="mt-3"><Waveform peaks={peaks} progress={queued ? 0 : progress / 100} scan={!queued} height={80} label={t.console.signal} /></div>

            <dl className="mt-6 grid grid-cols-3 gap-x-4 gap-y-5">
              {t.console.channels.map((name, c) => (
                <div key={name} className={`transition-opacity duration-700 ${measuring ? "" : "opacity-35"}`}>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted">{name}</dt>
                  <dd className="mt-2 flex h-7 items-end gap-[3px]" aria-hidden>
                    {Array.from({ length: CHANNEL_BARS }, (_, b) => (
                      <span
                        key={b}
                        className={`w-1.5 rounded-sm ${measuring && !mapping ? "signal-bar" : ""}`}
                        style={{ height: `${Math.round((mapping ? settled(c, b) : 0.55) * 100)}%`, background: mapping ? "var(--bar-leading)" : "var(--accent)", animationDelay: `${((c * 0.21 + b * 0.13) % 1.4).toFixed(2)}s` }}
                      />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
              <div className={`w-32 shrink-0 transition-opacity duration-700 sm:w-36 ${mapping ? "" : "opacity-40"}`}><TypeDial rows={null} tone="card" compact /></div>
              <div className="text-sm">
                <p className={`font-semibold transition-opacity duration-700 ${mapping ? "" : "opacity-35"}`}>{t.console.types}</p>
                <p className={`mt-2 font-semibold transition-opacity duration-700 ${scaling ? "" : "opacity-35"}`}>{t.console.scales}</p>
                <p key={tick} className="thought mt-4 min-h-5 text-xs text-ink-2" aria-live="polite">{thought}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full">
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
