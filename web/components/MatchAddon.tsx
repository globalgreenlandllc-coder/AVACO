"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { MATCH_KINDS, matchWords, type KindWords, type MatchKind } from "@/lib/match-kind";
import { CoverCapsules } from "./CoverCapsules";
import { goToCheckout } from "@/lib/track";

export interface MatchAddonProps {
  analysisId: string;
  /** "2 credits · $18", or null where it is free. */
  price: string | null;
  freeLabel: string;
  credits: number;
  /** Credits one couple's report costs, when paid with credits. */
  needed?: number;
  canOrder: boolean;
  creditsHref?: string;
  existing: Array<{ id: string; partnerName: string; stage: "invited" | "opened" | "recording" | "analysing" | "ready" }>;
  /** "Your first name" to start with: whoever the report is about. */
  defaultOwnerName?: string;
  /** The words per kind of pair (lib/match-kind.ts): the form re-says itself for the kind chosen. */
  kinds: Record<MatchKind, KindWords>;
  /** "Works for", before the kinds on the cover. */
  worksFor: string;
  t: Dict["match"];
}

/** The relationship add-on at the top of a report, in a cover of its own (rose gold): order a couple's report, and the matches already ordered. */
export function MatchAddon({ analysisId, price, freeLabel, credits, needed = 2, canOrder, creditsHref = "/credits", existing, defaultOwnerName, kinds, worksFor, t: base }: MatchAddonProps) {
  const router = useRouter();
  const [kind, setKind] = useState<MatchKind>("couple");
  const t = matchWords(base, kind, kinds);
  const [ownerName, setOwnerName] = useState(defaultOwnerName ?? "");
  const [partnerName, setPartnerName] = useState("");
  const [withFamily, setWithFamily] = useState(false);
  const [busy, setBusy] = useState<"upload" | "invite" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ownerRef = useRef<HTMLInputElement>(null), partnerRef = useRef<HTMLInputElement>(null);
  const who = partnerName.trim() || t.partnerFallback;
  // "…a private link. {name} records…": when no name is typed yet, the fallback ("your partner") starts a sentence.
  const withName = (text: string) => text.replace(/\{name\}/g, (_, at: number) => (at === 0 || /[.!?]\s+$/.test(text.slice(0, at)) ? who.charAt(0).toUpperCase() + who.slice(1) : who));

  /** Both ways in create (and pay for) the match; the match page then opens on the chosen way. */
  async function order(mode: "upload" | "invite") {
    if (!ownerName.trim() || !partnerName.trim()) { setError(t.namesFirst); (ownerName.trim() ? partnerRef : ownerRef).current?.focus(); return; }
    setBusy(mode); setError(null);
    const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, ownerName, partnerName, withFamily: kind === "couple" && withFamily, kind, mode }) }).catch(() => null);
    if (res?.status === 201) {
      const { id, url } = await res.json();
      if (url) { goToCheckout(url, "relationship"); return; } // paying by card: Stripe, then back to the match page
      router.push(`/match/${id}?mode=${mode}`); return;
    }
    if (res?.status === 402) { window.location.href = `${creditsHref}?unlock=${analysisId}`; return; }
    setError((await res?.json().catch(() => null))?.message ?? "Error");
    setBusy(null);
  }

  const inProgress = existing.filter((m) => m.stage !== "ready");
  const ready = existing.filter((m) => m.stage === "ready");
  const stageText = (stage: MatchAddonProps["existing"][number]["stage"]) => t.stages[stage].replace(" {when}", "").replace("{when}", "").replace(" · {type} {value}", "");

  // The order, on the cover's right where the report has its radar: who the two are, then how the partner's voice arrives.
  const form = (
    <form onSubmit={(e) => e.preventDefault()}>
      <p className="cover-eyebrow">1 · {t.stepWho}</p>
      {/* Who the two are to each other: the areas read and every word below follow this. */}
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t.stepWho}>
        {MATCH_KINDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} title={kinds[k].hint}
            className={`pill !py-2 text-xs ${kind === k ? "pill-on" : "pill-off"}`}>{kinds[k].label}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-2">{kinds[kind].hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm"><span className="text-ink-2">{t.yourName}</span><input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required maxLength={60} className="offer-field mt-1.5 w-full px-3 py-2.5" /></label>
        <label className="block text-sm"><span className="text-ink-2">{t.partnerName}</span><input ref={partnerRef} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required maxLength={60} className="offer-field mt-1.5 w-full px-3 py-2.5" /></label>
        {kind === "couple" && <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2"><input type="checkbox" checked={withFamily} onChange={(e) => setWithFamily(e.target.checked)} className="h-4 w-4 accent-[var(--cover-gold)]" />{t.withFamily}</label>}
      </div>
      <p className="cover-eyebrow mt-8">2 · {t.stepHow.replace("{name}", who)}</p>
      {canOrder ? (
        <div className="mt-4 space-y-3">
          <div className="offer-tile p-5">
            <p className="font-semibold">{t.haveRecording}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{withName(t.haveRecordingText)}</p>
            <button type="button" className="btn mt-4 w-full max-sm:!px-4 max-sm:!text-sm sm:w-auto" disabled={Boolean(busy)} onClick={() => order("upload")}>{busy === "upload" ? t.ordering : t.uploadCta}</button>
          </div>
          <div className="offer-tile p-5">
            <p className="font-semibold">{t.noRecording}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{withName(t.noRecordingText)}</p>
            <button type="button" className="btn btn-quiet mt-4 w-full max-sm:!px-4 max-sm:!text-sm sm:w-auto" disabled={Boolean(busy)} onClick={() => order("invite")}>{busy === "invite" ? t.ordering : t.inviteCta.replace("{name}", who)}</button>
          </div>
        </div>
      ) : <Link href={`${creditsHref}?unlock=${analysisId}`} className="btn mt-4">{t.getCredits} · {t.needCredits.replace("{n}", String(needed))}</Link>}
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {canOrder && price && <p className="mt-4 text-xs text-muted">{credits >= needed ? t.payWithCredits.replace("{n}", String(needed)).replace("{have}", String(credits)) : t.payByCard.replace("{price}", price.split(" ·")[0])}</p>}
    </form>
  );

  return (
    <section className="cover offer-cover offer-match no-print px-7 py-10 sm:px-12 sm:py-14" data-no-export aria-label={t.eyebrow}>
      <CoverCapsules />
      <p className="cover-eyebrow relative"><span className="font-display text-xl font-semibold tracking-[0.2em]">AVOCO</span><span className="mx-3 opacity-50">·</span>{t.eyebrow}</p>

      <div className="relative mt-10 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div>
          <h2 className="gold-text pb-2 font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">{t.title}</h2>
          <p className="mt-5 max-w-md leading-relaxed text-ink-2 sm:text-lg">{t.lead}</p>
          <p className="mt-6"><span className="offer-badge">{price ?? freeLabel}</span></p>
          <p className="mt-6 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 font-bold uppercase tracking-[0.14em]" style={{ color: "var(--cover-gold)" }}>{worksFor}</span>
            {MATCH_KINDS.map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full border px-2.5 py-1 font-semibold transition-colors ${kind === k ? "border-transparent" : ""}`} style={kind === k ? { background: "var(--cover-gold)", color: "var(--cover-bg)" } : { borderColor: "color-mix(in oklab, var(--cover-gold) 45%, transparent)", color: "var(--cover-ink)" }}>{kinds[k].label}</button>)}
          </p>
        </div>

        {/* The right side, where the report has its radar: the couples already ordered, then a new order. */}
        <div className="space-y-9">
          {inProgress.length > 0 && (
            <div>
              <p className="cover-eyebrow">{t.inProgressTitle}</p>
              <ul className="mt-2 divide-y divide-line">
                {inProgress.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="text-sm"><span className="font-semibold">{t.inProgressFor.replace("{name}", m.partnerName)}</span> <span className="text-ink-2">· {stageText(m.stage)}</span></span>
                    <Link href={`/match/${m.id}`} className="btn !px-5 !py-2">{t.continue} →</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ready.length > 0 && (
            <div>
              <p className="cover-eyebrow">{t.existing}</p>
              <ul className="mt-2 divide-y divide-line">
                {ready.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span><span className="font-semibold">{m.partnerName}</span> <span className="text-ink-2">· {t.ready}</span></span>
                    <Link href={`/match/${m.id}`} className="font-semibold text-accent-text hover:underline">{t.open} →</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* With a couple's report already under way, a new one is one click away instead of a whole form. */}
          {inProgress.length > 0
            ? <details><summary className="btn btn-quiet cursor-pointer">{t.startAnother}</summary><div className="mt-6">{form}</div></details>
            : form}
        </div>
      </div>
    </section>
  );
}
