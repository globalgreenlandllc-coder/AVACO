"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { BestIndustry } from "@/lib/industry-chapter";
import { goToCheckout } from "@/lib/track";

/** The best-industry finder as the report page offers it (app/reports/[id]/page.tsx). */
export interface BestProps {
  /** GET: the result, 402 until it is opened. POST: opens it, for credits or free. */
  url: string;
  /** Already opened on this report. */
  open: boolean;
  /** How many industries are compared. */
  total: number;
  /** Its price in report credits. */
  needed: number;
  /** Charging is off, or the open host: it costs nothing but is still asked for. */
  free: boolean;
  admin: boolean;
  /** The pill: "$12.90 · or 2 credits", "Free on this page", … */
  price: string;
  /** Where to pay by card; absent when card payments aren't offered here. */
  payUrl?: string;
  payLabel: string;
  /** Just back from Stripe with this purchase. */
  paid?: "confirmed" | "pending" | null;
}

type State = { kind: "closed" } | { kind: "busy" } | { kind: "short" } | { kind: "error" } | { kind: "open"; result: BestIndustry };

/** The finder's state, shared by the tile inside the cover and the result below it. */
export function useBest(best: BestProps | undefined, analysisId: string) {
  const [state, setState] = useState<State>({ kind: best?.open ? "busy" : "closed" });
  const [shown, setShown] = useState(true);

  async function load() {
    if (!best) return;
    const res = await fetch(best.url, { cache: "no-store" }).catch(() => null);
    if (res?.ok) setState({ kind: "open", result: (await res.json()) as BestIndustry });
    else setState(res?.status === 402 ? { kind: "closed" } : { kind: "error" });
  }
  useEffect(() => { if (best?.open) void load(); }, [best?.open]); // eslint-disable-line react-hooks/exhaustive-deps

  /** With credits, or free where it is free; 402 means too few credits, and the tile then offers the card. */
  async function find() {
    if (!best) return;
    setState({ kind: "busy" });
    const res = await fetch(best.url, { method: "POST" }).catch(() => null);
    if (res?.ok) { await load(); setShown(true); return; }
    setState(res?.status === 402 ? { kind: "short" } : { kind: "error" });
  }

  /** Straight from the card; Stripe brings the buyer back to this report with the finder open. */
  async function pay() {
    if (!best?.payUrl) return;
    setState({ kind: "busy" });
    const res = await fetch(best.payUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { goToCheckout(body.url, "best_industry"); return; }
    setState({ kind: "error" });
  }

  return { state, shown, setShown, find, pay };
}

type Finder = ReturnType<typeof useBest>;

/** The second offer inside the industry cover: what the finder does, its price, and the one button that fits this person. */
export function BestTile({ best, finder, f, credits, creditsHref }: { best: BestProps; finder: Finder; f: Dict["finder"]; credits: number; creditsHref: string }) {
  const { state } = finder;
  const o = f.offer;
  const busy = state.kind === "busy";
  const result = state.kind === "open" ? state.result : null;
  const paying = !best.free && !best.admin;
  const enough = credits >= best.needed;
  return (
    <div className="offer-tile flex flex-col p-6 sm:p-8" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 60%, transparent)", background: "color-mix(in oklab, var(--cover-gold) 9%, transparent)" }}>
      <p className="cover-eyebrow">✦ {o.eyebrow}</p>
      <h3 className="gold-text mt-2 pb-1 font-display text-3xl font-semibold">{o.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-2 sm:text-base">{o.text.replace("{n}", String(best.total))}</p>
      <p className="mt-4"><span className="offer-badge">{result ? `✓ ${o.open} · ${result.name} · ${result.match}` : best.price}</span></p>
      <div className="mt-6 flex flex-wrap gap-3">
        {result ? (
          <button type="button" className="btn btn-quiet" onClick={() => finder.setShown((v) => !v)}>{finder.shown ? o.hide : o.show}</button>
        ) : !paying || enough ? (
          <>
            <button type="button" className="btn" onClick={finder.find} disabled={busy}>{busy ? o.finding : best.free ? o.find : best.admin ? o.findAdmin : o.findCredits.replace("{n}", String(best.needed))}</button>
            {paying && best.payUrl && <button type="button" className="btn btn-quiet" onClick={finder.pay} disabled={busy}>{best.payLabel}</button>}
          </>
        ) : best.payUrl ? (
          <button type="button" className="btn" onClick={finder.pay} disabled={busy}>{busy ? o.finding : `${o.find} · ${best.payLabel}`}</button>
        ) : (
          <Link href={creditsHref} className="btn">{o.getCredits}</Link>
        )}
      </div>
      {!result && paying && (state.kind === "short" || !enough) && <p className="mt-4 text-sm text-ink-2">{o.need.replace("{n}", String(best.needed))} {o.youHave.replace("{have}", String(credits))}</p>}
      {best.paid && !result && <p role="status" className="mt-4 text-sm">{best.paid === "confirmed" ? o.paid : o.paidPending}</p>}
      {state.kind === "error" && <p role="alert" className="mt-4 text-sm text-danger">{o.error}</p>}
    </div>
  );
}

/** The winner, laid out like a report chapter: why it wins, the best role and the way to it, then the top five from different fields. */
/** `onExplore` opens one of the other four in the industry picker, where it can be bought on its own. */
export function BestResult({ result: r, onOpenChapter, onExplore }: { result: BestIndustry; onOpenChapter?: (key: string) => void; onExplore?: (key: string) => void }) {
  return (
    <section className="theme-industry mt-10 space-y-8" data-best>
      <div className="gold-panel p-7 sm:p-9">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em]">{r.eyebrow}</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="font-display text-5xl font-semibold leading-none sm:text-7xl">{r.name}</span>
          <span className="text-4xl font-semibold tabular-nums">{r.match} <span className="text-base font-medium opacity-70">/ 100</span></span>
        </div>
        <p className="mt-4 max-w-2xl leading-relaxed">{r.blurb}</p>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-relaxed">{r.why}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{r.roleTitle}</p>
          <div className="px-6 pb-7 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="font-display text-3xl font-medium leading-tight sm:text-4xl">{r.role.name}</p>
              <p className="text-4xl font-semibold tabular-nums text-accent-text">{r.role.score}</p>
            </div>
            <p className="eyebrow mt-2">{r.role.levelLabel} · {r.role.leansOn}</p>
            <p className="mt-4 leading-relaxed text-ink-2">{r.role.text}</p>
            <p className="mt-2 text-sm text-muted">{r.role.because}</p>
            <p className="eyebrow mt-7">{r.pathTitle}</p>
            <ol className="mt-3 space-y-3">
              {r.path.map((step, i) => (
                <li key={step.level} className="flex items-baseline justify-between gap-4 text-sm">
                  <span><span className="font-display text-lg text-accent-text">{String(i + 1).padStart(2, "0")}</span> <span className="font-semibold">{step.label}</span> · {step.role.name}</span>
                  <span className="font-semibold tabular-nums">{step.role.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card break-inside-avoid overflow-hidden">
          <p className="tab-title">{r.scoresTitle}</p>
          <div className="space-y-5 px-6 pb-7 pt-5">
            {r.scores.map((s, i) => (
              <div key={s.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm"><span>{s.label}</span><span className="font-semibold tabular-nums">{s.value}</span></div>
                <div className="mt-2 h-2.5 rounded-r-full bg-track" role="img" aria-label={`${s.label}: ${s.value} / 100`}>
                  <div className="bar-fill h-full rounded-r-full" style={{ width: `${s.value}%`, background: i === 0 ? "var(--bar-leading)" : "var(--bar-active)", animationDelay: `${i * 80}ms` }} />
                </div>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-muted">{r.scoresHelp}</p>
          </div>
        </div>
      </div>

      <div className="card break-inside-avoid overflow-hidden">
        <p className="tab-title">{r.topTitle}</p>
        <ol className="divide-y divide-line px-6 pt-2">
          {r.top.map((o, i) => (
            <li key={o.key} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
              <span className="font-display text-3xl leading-none text-accent-text">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-lg font-semibold">{o.name}</span>
                  {i === 0 && <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-ink">{r.bestTag}</span>}
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{o.sector}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{o.blurb}</p>
                <p className="mt-1 text-sm font-medium">{o.role}</p>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                <span className="text-2xl font-semibold tabular-nums">{o.match}</span>
                {i > 0 && onExplore && <button type="button" data-no-export className="btn btn-quiet no-print !px-4 !py-1.5 !text-sm" onClick={() => onExplore(o.key)}>{r.explore}</button>}
              </div>
            </li>
          ))}
        </ol>
        <p className="px-6 pb-6 pt-2 text-xs leading-relaxed text-muted">{r.topNote}</p>
      </div>

      {onOpenChapter && <button type="button" data-no-export className="btn no-print" onClick={() => onOpenChapter(r.industry)}>{r.openChapter} →</button>}
      <p className="text-xs leading-relaxed text-muted">{r.note}</p>
    </section>
  );
}
