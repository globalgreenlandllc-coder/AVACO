"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { buildReportFile, saveFile } from "@/lib/export";
import type { Dict } from "@/lib/i18n";
import type { IndustryChapter, IndustryTeaser } from "@/lib/industry-chapter";
import { RefreshWhile } from "./RefreshWhile";

export interface IndustryProps {
  /** The selection bar, in the visitor's language. */
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
  /** A live example from the person's own scores, shown until an industry is chosen. */
  teaser?: IndustryTeaser | null;
  /** The industry to show first: the one the buyer was opening when they went to pay. */
  initialIndustry?: string | null;
  /** Just back from Stripe: the payment is confirmed, or still being confirmed (the page then refreshes by itself). */
  paid?: "confirmed" | "pending" | null;
  /** Where opened chapters are copied for print and the downloaded file: the very end of the report. */
  printSlot?: HTMLElement | null;
  t: Dict["industry"];
}

type State = { kind: "idle" } | { kind: "loading" } | { kind: "locked" } | { kind: "error" } | { kind: "chapter"; chapter: IndustryChapter };

/**
 * The industry add-on, sold and shown in one teal card above the report: a selection bar with the industries, the
 * price and the button that opens or buys, and the chapter itself once it is open. Nothing of it sits inside the
 * report. For print and the downloaded file, every opened chapter is copied to `printSlot`, at the very end.
 */
export function Industry({ industries, chapterUrl, unlockUrl, analysisId, unlocked = [], credits = 0, creditsHref = "/credits", freeUnlock = false, price = null, teaser = null, initialIndustry = null, paid = null, printSlot = null, t }: IndustryProps) {
  const [open, setOpen] = useState<string[]>(unlocked);
  const [picked, setPicked] = useState<string | null>(initialIndustry);
  const [shown, setShown] = useState(true); // the opened chapter can be folded away without closing it
  const [saving, setSaving] = useState(false);
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

  useEffect(() => { if (picked) void load(picked); else setState({ kind: "idle" }); }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  // A refresh can bring the news that the picked industry was opened meanwhile (the payment landed): fetch it then.
  const unlockedKey = unlocked.join(",");
  useEffect(() => { if (picked && state.kind === "locked" && unlocked.includes(picked)) void load(picked); }, [unlockedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function unlock() {
    if (!picked || !unlockUrl) return;
    setBusy(true);
    const res = await fetch(unlockUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, industry: picked }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) await load(picked);
    else if (res?.status === 402) window.location.href = `${creditsHref}?unlock=${analysisId}&industry=${picked}`;
    else setState({ kind: "error" });
  }

  /** One industry chapter as a file of its own; the full report download carries every opened chapter at its end. */
  async function downloadChapter(chapter: IndustryChapter) {
    const node = document.querySelector<HTMLElement>(`[data-industry-chapter="${chapter.industry}"]`);
    if (!node) return;
    setSaving(true);
    try {
      saveFile(await buildReportFile(node, `${chapter.name} · AVOCO`), `avoco-${chapter.industry}-chapter.html`);
    } finally {
      setSaving(false);
    }
  }

  const a = t.addon;
  // "Pending" only while the chapter really is still closed; once it is open the payment has plainly landed.
  const paidState = paid === "pending" && initialIndustry && open.includes(initialIndustry) ? "confirmed" : paid;
  const paidName = industries.find((i) => i.key === initialIndustry)?.name ?? "";
  const priceLabel = price ? a.price.replace("{price}", price) : freeUnlock ? t.promo.freeAdmin : t.promo.free;
  const example = !picked && teaser && teaser.roles[0]
    ? a.example.replace("{industry}", teaser.name).replace("{role}", teaser.roles[0].name).replace("{score}", String(teaser.roles[0].score))
    : null;

  return (
    <>
      <aside data-no-export className="no-print addon-strip" aria-label={a.badge} data-industry>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="addon-badge">{a.badge}</p>
          <span className="addon-pill">{priceLabel}</span>
        </div>
        <p className="mt-1 font-display text-2xl font-medium leading-tight">{a.title}</p>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{a.text}</p>

        {paidState && (
          <p role="status" className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--addon)" }}>
            {paidState === "confirmed" ? t.lock.paid.replace("{industry}", paidName) : t.lock.paidPending}
          </p>
        )}
        {paidState === "pending" && <RefreshWhile />}

        {/* The selection bar, and next to it whatever the chosen industry needs: open, buy, hide, download. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="industry-select">{t.pick}</label>
          <select id="industry-select" value={picked ?? ""} onChange={(e) => { setPicked(e.target.value || null); setShown(true); }} className="addon-select min-w-64 flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold sm:flex-none">
            <option value="">{a.select}</option>
            {industries.map((i) => <option key={i.key} value={i.key}>{i.name}{open.includes(i.key) ? ` · ${a.openedTag}` : ""}</option>)}
          </select>
          {state.kind === "locked" && picked && (freeUnlock || credits > 0
            ? <button type="button" className="btn addon-btn" onClick={unlock} disabled={busy}>{busy ? t.lock.unlocking : freeUnlock ? t.lock.unlockAdmin : t.lock.unlock}</button>
            : <Link href={`${creditsHref}?unlock=${analysisId}&industry=${picked}`} className="btn addon-btn">{t.lock.getCredits}</Link>)}
          {state.kind === "chapter" && (
            <>
              <button type="button" className="btn btn-quiet" onClick={() => setShown((v) => !v)}>{shown ? a.hide : a.show}</button>
              <button type="button" className="btn btn-quiet" onClick={() => downloadChapter(state.chapter)} disabled={saving}>{saving ? t.downloading : t.download}</button>
            </>
          )}
        </div>

        {example && <p className="mt-3 text-xs text-muted"><span className="addon-tag">{a.exampleTag}</span>{example}</p>}
        {state.kind === "loading" && <p className="mt-3 text-sm text-ink-2" aria-live="polite">{t.loading}</p>}
        {state.kind === "error" && <p className="mt-3 text-sm text-danger" aria-live="polite">{t.error}</p>}
        {state.kind === "locked" && picked && (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-2">{t.lock.text} {freeUnlock ? t.lock.adminNote : credits > 0 ? t.lock.youHave.replace("{n}", String(credits)) : t.lock.need}</p>
        )}

        {/* The opened chapter lives inside the card; only the chosen one is on screen. */}
        {state.kind === "chapter" && shown && (
          <div data-industry-chapter={state.chapter.industry} className="rise">
            <Chapter chapter={state.chapter} onPick={(key) => { setPicked(key); setShown(true); }} />
          </div>
        )}
      </aside>

      {/* Print and the downloaded file: every opened chapter, at the very end of the report. */}
      {printSlot && Object.keys(chapters).length > 0 && createPortal(
        <section className="space-y-10">
          <p className="addon-badge">{a.badge}</p>
          {Object.values(chapters).map((chapter) => <div key={chapter.industry} data-industry-chapter-print={chapter.industry}><Chapter chapter={chapter} /></div>)}
        </section>,
        printSlot,
      )}
    </>
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
