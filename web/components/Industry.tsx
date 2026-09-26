"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { IndustryChapter, IndustryTeaser } from "@/lib/industry-chapter";

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
  /** Admins: the unlock button always shows and says it is free; nothing is charged. */
  freeUnlock?: boolean;
  /** The price of one industry as words ("1 credit · $9"), or null where chapters are free. */
  price?: string | null;
  /** A live example from the person's own scores, for the pitch. */
  teaser?: IndustryTeaser | null;
  t: Dict["industry"];
}

type State = { kind: "idle" } | { kind: "loading" } | { kind: "locked" } | { kind: "error" } | { kind: "chapter"; chapter: IndustryChapter };

/**
 * "Narrow it to your industry": the picker, the paywall when an industry is still closed, and the chapter.
 * Chapters already fetched stay in the page, so print and the downloaded file carry every opened industry.
 */
export function Industry({ industries, chapterUrl, unlockUrl, analysisId, unlocked = [], credits = 0, creditsHref = "/credits", freeUnlock = false, price = null, teaser = null, t }: IndustryProps) {
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
    <section className="card card-flow overflow-hidden" data-industry>
      {/* The pitch: what the add-on does, what it costs, and a live taste from this person's own scores. */}
      <div className="cover relative overflow-hidden rounded-none px-7 py-10 sm:px-12 sm:py-12">
        <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="cover-eyebrow">{t.promo.eyebrow}</p>
            <h2 className="gold-text mt-4 pb-1 font-display text-5xl font-semibold leading-[0.98] sm:text-6xl">{t.promo.title}</h2>
            <p className="mt-5 max-w-xl leading-relaxed sm:text-lg" style={{ color: "var(--cover-muted)" }}>{t.promo.text}</p>
            <ul className="mt-5 space-y-2 text-sm" style={{ color: "var(--cover-ink)" }}>
              {t.promo.points.map((x) => <li key={x} className="flex gap-3"><span className="mt-2 h-1.5 w-3 shrink-0 rounded-full" style={{ background: "var(--cover-gold)" }} aria-hidden /><span>{x}</span></li>)}
            </ul>
            <div className="no-print mt-7 flex flex-wrap items-center gap-4">
              <a href="#industry-pick" className="btn" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{t.promo.cta}</a>
              <span className="rounded-full border px-4 py-2 text-sm font-bold" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", color: "var(--cover-gold)" }}>{price ? t.promo.price.replace("{price}", price) : freeUnlock ? t.promo.freeAdmin : t.promo.free}</span>
            </div>
          </div>
          {teaser && (
            <div className="rounded-3xl p-6 sm:p-7" style={{ background: "color-mix(in oklab, var(--cover-gold) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--cover-gold) 35%, transparent)" }}>
              <p className="cover-eyebrow">{t.promo.exampleTitle.replace("{industry}", teaser.name)}</p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--cover-muted)" }}>{t.promo.exampleText.replace("{industry}", teaser.name)}</p>
              <p className="mt-4 font-display text-4xl font-semibold leading-tight" style={{ color: "var(--cover-gold)" }}>{teaser.name}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{teaser.overall}<span className="text-sm font-medium opacity-70"> / 100</span></p>
              <ol className="mt-4 space-y-2">
                {teaser.roles.map((r, i) => (
                  <li key={r.name} className="flex items-baseline justify-between gap-3 border-t pt-2 text-sm" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 30%, transparent)" }}>
                    <span><span className="mr-2 font-display text-xl" style={{ color: "var(--cover-gold)" }}>{String(i + 1).padStart(2, "0")}</span>{r.name}</span>
                    <span className="font-semibold tabular-nums">{r.score}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--cover-muted)" }}>{t.promo.exampleMore.replace("{n}", String(teaser.more)).replace("{industry}", teaser.name)}</p>
              <button type="button" className="no-print mt-4 text-sm font-bold underline-offset-4 hover:underline" style={{ color: "var(--cover-gold)" }} onClick={() => setPicked(teaser.industry)}>{t.promo.exampleCta.replace("{industry}", teaser.name)} →</button>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 sm:p-12">
      <h3 className="font-display text-3xl font-medium sm:text-4xl">{t.title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{t.lead}</p>

      <div className="no-print mt-8 scroll-mt-24" id="industry-pick">
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
            {freeUnlock || credits > 0
              ? <button type="button" className="btn" onClick={unlock} disabled={busy}>{busy ? t.lock.unlocking : freeUnlock ? t.lock.unlockAdmin : t.lock.unlock}</button>
              : <Link href={`${creditsHref}?unlock=${analysisId}`} className="btn">{t.lock.getCredits}</Link>}
            <p className="text-sm text-ink-2">{freeUnlock ? t.lock.adminNote : credits > 0 ? t.lock.youHave.replace("{n}", String(credits)) : t.lock.need}</p>
          </div>
        </div>
      )}

      {/* Every opened chapter stays rendered; only the picked one is visible on screen, all of them in print. */}
      {Object.values(chapters).map((chapter) => (
        <div key={chapter.industry} data-industry-chapter={chapter.industry} className={`rise ${state.kind === "chapter" && state.chapter.industry === chapter.industry ? "" : "hidden print:block"}`}>
          <Chapter chapter={chapter} onPick={setPicked} />
        </div>
      ))}
      </div>
    </section>
  );
}

function Chapter({ chapter: c, onPick }: { chapter: IndustryChapter; onPick?: (key: string) => void }) {
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
        <p className="mt-4 text-sm font-semibold">{c.rankLine}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{c.pairTitle}</p>
          <p className="px-6 pb-6 pt-4 text-sm leading-relaxed text-ink-2">{c.pairText}</p>
        </div>
        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{c.alsoTitle}</p>
          <div className="px-6 pb-6 pt-4">
            {c.also.length > 0 ? (
              <ul className="space-y-2">
                {c.also.map((i) => (
                  <li key={i.key} className="flex items-baseline justify-between gap-3 text-sm">
                    <button type="button" className="font-semibold text-accent-text hover:underline" data-also={i.key} onClick={() => onPick?.(i.key)}>{i.name}</button>
                    <span className="font-semibold tabular-nums">{i.overall}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm leading-relaxed text-ink-2">{c.alsoNone}</p>}
          </div>
        </div>
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
              <p className="eyebrow mt-3">{r.levelLabel} · {r.leansOn}</p>
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

      {c.todayTitle && (
        <div className="soft-panel break-inside-avoid p-6 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent-text">{c.todayTitle}</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
            {c.today.map((x) => <li key={x.level}>{x.text}</li>)}
          </ul>
        </div>
      )}

      <p className="border-t border-line pt-6 text-xs leading-relaxed text-muted">{c.scoreHelp}</p>
    </div>
  );
}
