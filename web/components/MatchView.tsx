"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { MatchReport } from "@/lib/match-report";

export interface MatchState { status: "waiting" | "processing" | "ready"; partnerName: string; ownerName: string; report: MatchReport | null }

/** The couple's report. Polls while the partner's recording is being analysed; `waiting` is what the page shows until then. */
export function MatchView({ initial, pollUrl, waiting, t }: { initial: MatchState; pollUrl: string; waiting: React.ReactNode; t: Dict["match"] }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    if (state.status === "ready") return;
    const timer = setInterval(async () => {
      const res = await fetch(pollUrl, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setState(await res.json());
    }, 5000);
    return () => clearInterval(timer);
  }, [pollUrl, state.status]);

  if (state.status === "waiting") return <>{waiting}</>;
  if (state.status === "processing" || !state.report) {
    return (
      <div className="card flex flex-col items-center px-7 py-16 text-center" aria-live="polite">
        <div className="relative grid h-20 w-20 place-items-center"><span className="breathe absolute inset-0 rounded-full bg-accent" aria-hidden /><span className="relative h-8 w-8 rounded-full bg-accent" aria-hidden /></div>
        <p className="mt-8 max-w-md leading-relaxed text-ink-2">{t.processing.replace("{name}", state.partnerName)}</p>
      </div>
    );
  }
  const r = state.report;
  return (
    <article className="space-y-10" data-match>
      <section className="cover relative overflow-hidden px-7 py-12 sm:px-12 sm:py-14">
        <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <p className="cover-eyebrow relative">{t.eyebrow}</p>
        <h1 className="gold-text relative mt-5 pb-1 font-display text-5xl font-semibold leading-[0.98] sm:text-7xl">{t.matchTitle.replace("{a}", r.names.a).replace("{b}", r.names.b)}</h1>
        <div className="relative mt-8 grid items-center gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex items-baseline gap-3">
            <span className="text-8xl font-semibold tabular-nums leading-none">{r.score}</span>
            <span className="text-sm" style={{ color: "var(--cover-muted)" }}>/ 100 · {t.scoreLabel}</span>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold" style={{ color: "var(--cover-gold)" }}>{r.band.title}</p>
            <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: "var(--cover-muted)" }}>{r.band.text}</p>
          </div>
        </div>
        <p className="relative mt-8 flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--cover-ink)" }}>
          <span role="img" aria-label={`${r.hearts.count} / 5`} className="tracking-wider" style={{ color: "var(--cover-gold)" }}>{"♥".repeat(r.hearts.count)}<span style={{ opacity: 0.3 }}>{"♥".repeat(5 - r.hearts.count)}</span></span>
          <span>{t.heartsLabel.replace("{a}", `${r.hearts.a.name} ${r.hearts.a.value}`).replace("{b}", `${r.hearts.b.name} ${r.hearts.b.value}`).replace("{hearts}", String(r.hearts.count)).replace("{note}", r.hearts.note)}</span>
        </p>
      </section>

      <section className="soft-panel p-7 sm:p-10">
        <p className="eyebrow !text-accent-text">{t.reasonsTitle}</p>
        <ul className="mt-4 space-y-2 leading-relaxed text-ink-2 sm:text-lg">{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      <section>
        <h2 className="font-display text-4xl font-medium">{t.categoriesTitle}</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2">
          {r.categories.map((c) => (
            <li key={c.key} className="card break-inside-avoid overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <p className="tab-title">{c.name}</p>
                <span className="mr-6 mt-4 text-3xl font-semibold tabular-nums text-accent-text">{c.score}</span>
              </div>
              <div className="px-6 pb-6 pt-3">
                <p className="text-xs text-muted">{c.blurb}</p>
                <div className="mt-3 h-2.5 rounded-r-full bg-track" role="img" aria-label={`${c.name}: ${c.score} / 100`}><div className="bar-fill h-full rounded-r-full" style={{ width: `${c.score}%`, background: c.score >= 65 ? "var(--bar-leading)" : c.score >= 45 ? "var(--bar-active)" : "var(--bar-background)" }} /></div>
                <p className="mt-4 text-sm leading-relaxed text-ink-2">{c.a}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{c.b}</p>
                {c.note && <p className="mt-3 border-l-2 border-accent pl-3 text-sm leading-relaxed">{c.note}</p>}
                <p className="mt-3 text-xs leading-relaxed text-muted">{c.tip}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-7">
          <p className="eyebrow">{t.rolesTitle}</p>
          <ul className="mt-4 space-y-3">
            {r.roles.map((x) => <li key={x.key} className="text-sm leading-relaxed"><span className={`font-semibold ${x.held ? "text-accent-text" : "text-muted"}`}>{x.name}.</span> <span className="text-ink-2">{x.text}</span></li>)}
          </ul>
        </section>
        <section className="soft-panel p-7">
          <p className="eyebrow !text-accent-text">{r.strengthsTitle}</p>
          <p className="mt-2 font-display text-2xl leading-snug">{r.strengths.join(" · ")}</p>
          <p className="eyebrow mt-6 !text-accent-text">{r.watchTitle}</p>
          <p className="mt-2 font-display text-2xl leading-snug">{r.watch.join(" · ")}</p>
          {r.today.length > 0 && (<>
            <p className="eyebrow mt-6 !text-accent-text">{t.todayTitle}</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-2">{r.today.map((x) => <li key={x}>{x}</li>)}</ul>
          </>)}
        </section>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-muted">{r.method}</p>
    </article>
  );
}
