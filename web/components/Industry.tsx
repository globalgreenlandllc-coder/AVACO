"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { IndustryChapter } from "@/lib/industry-chapter";

export interface IndustryProps {
  /** The picker, in the visitor's language. */
  industries: Array<{ key: string; name: string }>;
  /** Where a chapter comes from; {key} is the industry. 402 means it must be opened first. */
  chapterUrl: string;
  /** Where to open an industry for a credit. Absent when chapters are free here (admins, the partner page, billing off). */
  unlockUrl?: string;
  analysisId: string;
  /** Industries already opened on this report. */
  unlocked?: string[];
  credits?: number;
  creditsHref?: string;
  t: Dict["industry"];
}

type State = { kind: "idle" } | { kind: "loading" } | { kind: "locked" } | { kind: "error" } | { kind: "chapter"; chapter: IndustryChapter };

/**
 * "Narrow it to your industry": the picker, the paywall when an industry is still closed, and the chapter.
 * Chapters already fetched stay in the page, so print and the downloaded file carry every opened industry.
 */
export function Industry({ industries, chapterUrl, unlockUrl, analysisId, unlocked = [], credits = 0, creditsHref = "/credits", t }: IndustryProps) {
  const [open, setOpen] = useState<string[]>(unlocked);
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [chapters, setChapters] = useState<Record<string, IndustryChapter>>({});
  const [busy, setBusy] = useState(false);

  async function load(key: string) {
    if (chapters[key]) { setState({ kind: "chapter", chapter: chapters[key] }); return; }
    setState({ kind: "loading" });
    const res = await fetch(chapterUrl.replace("{key}", key), { cache: "no-store" }).catch(() => null);
    if (res?.status === 402) { setState({ kind: "locked" }); return; }
    if (!res?.ok) { setState({ kind: "error" }); return; }
    const chapter = (await res.json()) as IndustryChapter;
    setChapters((c) => ({ ...c, [key]: chapter }));
    setOpen((o) => (o.includes(key) ? o : [...o, key]));
    setState({ kind: "chapter", chapter });
  }

  useEffect(() => { if (picked) void load(picked); }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps

  async function unlock() {
    if (!picked || !unlockUrl) return;
    setBusy(true);
    const res = await fetch(unlockUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, industry: picked }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) await load(picked);
    else if (res?.status === 402) window.location.href = `${creditsHref}?unlock=${analysisId}`;
    else setState({ kind: "error" });
  }

  const pickedName = industries.find((i) => i.key === picked)?.name ?? "";

  return (
    <section className="card card-flow p-8 sm:p-12" data-industry>
      <h2 className="font-display text-3xl font-medium sm:text-4xl">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{t.lead}</p>

      <div className="no-print mt-8">
        <p className="eyebrow">{t.pick}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="listbox" aria-label={t.pick}>
          {industries.map((i) => (
            <button key={i.key} type="button" role="option" aria-selected={picked === i.key} className={`pill ${picked === i.key ? "pill-on" : "pill-off"}`} onClick={() => setPicked(i.key)}>
              {i.name}{open.includes(i.key) && picked !== i.key ? <span className="ml-2 text-xs opacity-70">✓</span> : null}
            </button>
          ))}
        </div>
      </div>

      {state.kind === "loading" && <p className="mt-8 text-sm text-ink-2" aria-live="polite">{t.loading}</p>}
      {state.kind === "error" && <p className="mt-8 text-sm text-danger" aria-live="polite">{t.error}</p>}

      {state.kind === "locked" && picked && (
        <div className="soft-panel mt-8 p-7 sm:p-9">
          <h3 className="font-display text-3xl font-medium">{t.lock.title.replace("{industry}", pickedName)}</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{t.lock.text}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {credits > 0
              ? <button type="button" className="btn" onClick={unlock} disabled={busy}>{busy ? t.lock.unlocking : t.lock.unlock}</button>
              : <Link href={`${creditsHref}?unlock=${analysisId}`} className="btn">{t.lock.getCredits}</Link>}
            <p className="text-sm text-ink-2">{credits > 0 ? t.lock.youHave.replace("{n}", String(credits)) : t.lock.need}</p>
          </div>
        </div>
      )}

      {/* Every opened chapter stays rendered; only the picked one is visible on screen, all of them in print. */}
      {Object.values(chapters).map((chapter) => (
        <div key={chapter.industry} data-industry-chapter={chapter.industry} className={`rise ${state.kind === "chapter" && state.chapter.industry === chapter.industry ? "" : "hidden print:block"}`}>
          <Chapter chapter={chapter} />
        </div>
      ))}
    </section>
  );
}

function Chapter({ chapter: c }: { chapter: IndustryChapter }) {
  const top = c.roles.slice(0, 3);
  return (
    <div className="mt-10 space-y-10 break-before-auto">
      <div className="gold-panel p-7 sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em]">{c.fitTitle}</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="font-display text-7xl font-semibold leading-none">{c.name}</span>
          <span className="text-4xl font-semibold tabular-nums">{c.overall} <span className="text-base font-medium opacity-70">/ 100</span></span>
        </div>
        <p className="mt-4 max-w-2xl leading-relaxed">{c.blurb}</p>
      </div>

      <div>
        <h3 className="font-display text-3xl font-medium">{c.pathTitle}</h3>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {c.path.map((step, i) => (
            <li key={step.level} className="card break-inside-avoid overflow-hidden">
              <p className="tab-title">{String(i + 1).padStart(2, "0")} · {step.label}</p>
              <div className="px-6 pb-6 pt-4">
                <p className="text-lg font-semibold leading-snug">{step.role.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.role.text}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums text-accent-text">{step.role.score}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-display text-3xl font-medium">{c.rolesTitle}</h3>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          {top.map((r, i) => (
            <li key={r.key} className="soft-panel break-inside-avoid p-6">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-5xl font-medium text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-3xl font-semibold tabular-nums">{r.score}</span>
              </div>
              <p className="eyebrow mt-3">{r.levelLabel}</p>
              <p className="mt-1 text-lg font-semibold leading-snug">{r.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{r.text}</p>
              <p className="mt-2 text-xs text-muted">{r.because}</p>
            </li>
          ))}
        </ol>
        <ol className="mt-6 grid gap-x-12 gap-y-5 sm:grid-cols-2" start={4}>
          {c.roles.slice(3).map((r, i, rest) => (
            <li key={r.key} className="break-inside-avoid-page">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{r.name} <span className="text-xs text-muted">· {r.levelLabel}</span></span>
                <span className="w-10 text-right font-semibold tabular-nums">{r.score}</span>
              </div>
              <div className="mt-2 h-2.5 rounded-r-full bg-track" role="img" aria-label={`${r.name}: ${r.score} / 100`}>
                <div className="bar-fill h-full rounded-r-full" style={{ width: `${r.score}%`, background: i >= rest.length - 2 ? "var(--bar-background)" : "var(--bar-active)", animationDelay: `${i * 50}ms` }} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{r.text}</p>
              <p className="mt-1 text-xs text-muted">{r.because}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{c.angleTitle}</p>
          <div className="px-6 pb-6 pt-4">
            <p className="text-sm leading-relaxed text-ink-2">{c.angle}</p>
            {c.watch.length > 0 && (<>
              <p className="eyebrow mt-5">{c.watchTitle}</p>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-ink-2">
                {c.watch.map((w) => <li key={w} className="flex gap-3"><span className="mt-2 h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden /><span>{w}</span></li>)}
              </ul>
            </>)}
          </div>
        </div>
        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{c.rewardsTitle}</p>
          <ul className="space-y-2 px-6 pb-6 pt-4 text-sm leading-relaxed text-ink-2">
            {c.rewards.map((w) => <li key={w} className="flex gap-3"><span className="mt-2 h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden /><span>{w}</span></li>)}
          </ul>
        </div>
      </div>

      <p className="border-t border-line pt-6 text-xs leading-relaxed text-muted">{c.scoreHelp}</p>
    </div>
  );
}
