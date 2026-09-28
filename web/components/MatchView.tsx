"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buildReportFile, saveFile } from "@/lib/export";
import type { Dict } from "@/lib/i18n";
import type { MatchReport } from "@/lib/match-report";
import type { Stage } from "@/lib/match-stage";

export interface Side { name: string; leading: { name: string; value: number } | null; recordedAt: string | null }
export interface MatchState {
  status: "waiting" | "processing" | "ready";
  stage: Stage;
  owner: Side;
  partner: Side & { openedAt: string | null; startedAt: string | null };
  partnerName: string;
  ownerName: string;
  report: MatchReport | null;
}

/** The three steps both sides see: the orderer's voice, the partner's voice, the couple's report. */
function Progress({ state, side, t }: { state: MatchState; side: "owner" | "partner"; t: Dict["match"] }) {
  const done = (x: Side) => (x.leading ? t.stepDone.replace("{type}", x.leading.name).replace("{value}", String(x.leading.value)) : x.recordedAt ? t.stepRecorded.replace("{when}", x.recordedAt) : t.stepPending);
  const partnerLine = state.stage === "ready" ? done(state.partner) : side === "partner" && (state.stage === "invited" || state.stage === "opened") ? t.stageYourTurn : t.stages[state.stage].replace("{when}", state.partner.recordedAt ?? state.partner.openedAt ?? "").replace("{type}", state.partner.leading?.name ?? "").replace("{value}", String(state.partner.leading?.value ?? ""));
  const steps = [
    { label: side === "owner" ? t.stepYou : t.stepPartner.replace("{name}", state.owner.name), text: done(state.owner), state: state.owner.leading ? "done" : "wait" },
    { label: side === "partner" ? t.stepYou : t.stepPartner.replace("{name}", state.partner.name), text: partnerLine, state: state.stage === "ready" ? "done" : state.stage === "invited" ? "wait" : "now" },
    { label: t.stepCouple, text: state.status === "ready" ? t.coupleReady : t.coupleWaiting, state: state.status === "ready" ? "done" : "wait" },
  ] as const;
  return (
    <section className="card p-6 sm:p-8" aria-label={t.progressTitle} data-no-export>
      <p className="eyebrow">{t.progressTitle}</p>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label} className={`rounded-2xl border p-4 ${s.state === "done" ? "border-accent bg-accent-soft" : s.state === "now" ? "border-accent" : "border-line"}`}>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-accent-text">
              <span aria-hidden className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${s.state === "done" ? "bg-accent text-accent-ink" : s.state === "now" ? "breathe bg-accent text-accent-ink" : "border border-line text-muted"}`}>{s.state === "done" ? "✓" : i + 1}</span>{s.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MatchView({ initial, pollUrl, waiting, side, t }: { initial: MatchState; pollUrl: string; waiting: React.ReactNode; side: "owner" | "partner"; t: Dict["match"] }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  // When the other side's recording lands, the page's server-rendered parts (their report) must appear too.
  useEffect(() => { if (state.status === "ready" && initial.status !== "ready") router.refresh(); }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false);
  const article = useRef<HTMLElement>(null);
  // Coming from the report's downloads box: save the file as soon as the report is on the page.
  useEffect(() => {
    if (state.status !== "ready" || !state.report || !new URLSearchParams(window.location.search).has("download")) return;
    void download();
    window.history.replaceState(null, "", window.location.pathname);
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.status === "ready") return;
    const timer = setInterval(async () => {
      const res = await fetch(pollUrl, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setState(await res.json());
    }, 5000);
    return () => clearInterval(timer);
  }, [pollUrl, state.status]);

  async function download() {
    const rep = state.report;
    if (!article.current || !rep) return;
    setSaving(true);
    try { saveFile(await buildReportFile(article.current, `AVOCO · ${t.matchTitle.replace("{a}", rep.names.a).replace("{b}", rep.names.b)}`), `avoco-match-${rep.names.a}-${rep.names.b}.html`.toLowerCase()); } finally { setSaving(false); }
  }

  const progress = <Progress state={state} side={side} t={t} />;
  if (state.status === "waiting") return <div className="theme-match space-y-8">{progress}{waiting}</div>;
  if (state.status === "processing" || !state.report) {
    return (
      <div className="theme-match space-y-8">
        {progress}
        <div className="card flex flex-col items-center px-7 py-16 text-center" aria-live="polite">
          <div className="relative grid h-20 w-20 place-items-center"><span className="breathe absolute inset-0 rounded-full bg-accent" aria-hidden /><span className="relative h-8 w-8 rounded-full bg-accent" aria-hidden /></div>
          <p className="mt-8 max-w-md leading-relaxed text-ink-2">{t.processing.replace("{name}", state.partnerName)}</p>
        </div>
      </div>
    );
  }
  const r = state.report;
  return (
    <div className="theme-match space-y-8">
    {progress}
    <article ref={article} className="theme-match space-y-10" data-match>
      <CoupleReport report={r} t={t} />
      <div data-no-export className="no-print flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={download} disabled={saving}>{t.download}</button>
        <button type="button" className="btn btn-quiet" onClick={() => window.print()}>{t.print}</button>
      </div>
    </article>
    </div>
  );
}

/**
 * The couple's report itself, with nothing around it: the cover, the reasons, the nine areas, the roles. Shown on the
 * match page, and copied hidden into the orderer's own report for print and the downloaded file (ReportView).
 */
export function CoupleReport({ report: r, t }: { report: MatchReport; t: Dict["match"] }) {
  return (
    <>
    <section className="cover relative overflow-hidden px-7 py-12 sm:px-12 sm:py-14">
      <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
      <p className="cover-eyebrow relative">{t.eyebrow}</p>
      <h1 className="gold-text relative mt-5 pb-1 font-display text-5xl font-semibold leading-[0.98] sm:text-7xl">{t.matchTitle.replace("{a}", r.names.a).replace("{b}", r.names.b)}</h1>
      <div className="relative mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: "var(--cover-muted)" }}>
        <span><span className="font-semibold" style={{ color: "var(--cover-ink)" }}>{r.names.a}</span> · {r.hearts.a.name} {r.hearts.a.value}</span>
        <span><span className="font-semibold" style={{ color: "var(--cover-ink)" }}>{r.names.b}</span> · {r.hearts.b.name} {r.hearts.b.value}</span>
      </div>
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

    {/* Closer up: the two leading types in eight areas of a shared life, AVOCO's texts side by side and the pair read on each. */}
    <section data-deep>
      <h2 className="font-display text-4xl font-medium">{r.deep.title}</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{r.deep.lead}</p>
      {r.deep.avoco.length > 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="eyebrow">{r.deep.avocoTitle}</p>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed text-ink-2">{r.deep.avoco.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      <ol className="mt-8 space-y-6">
        {r.deep.themes.map((d, i) => (
          <li key={d.key} className="card break-inside-avoid overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="tab-title">{String(i + 1).padStart(2, "0")} · {d.name}</p>
              <span className={`mr-6 mt-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${d.kind === "contrast" ? "bg-accent text-accent-ink" : d.kind === "aligned" ? "border border-line text-ink-2" : "bg-accent-soft text-accent-text"}`}>{r.deep.kinds[d.kind]}</span>
            </div>
            <div className="px-6 pb-6 pt-3 sm:px-7">
              <p className="text-xs text-muted">{d.blurb}</p>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {[d.a, d.b].map((side) => (
                  <div key={side.name}>
                    <p className="font-semibold">{side.name} <span className="ml-1 text-xs font-bold uppercase tracking-widest text-accent-text">{side.type}</span></p>
                    <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-2">{side.points.map((p) => <p key={p}>{p}</p>)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-accent-soft p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-text">{r.deep.rubTitle}</p>
                <p className="mt-2 text-sm leading-relaxed">{d.rub}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-accent-text">{r.deep.helpTitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{d.help}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted">{r.deep.note}</p>
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
    </>
  );
}
