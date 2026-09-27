"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";

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
  t: Dict["match"];
}

/** The relationship add-on at the top of a report, in a dusty-rose panel: order a couple's report, and the matches already ordered. */
export function MatchAddon({ analysisId, price, freeLabel, credits, needed = 2, canOrder, creditsHref = "/credits", existing, t }: MatchAddonProps) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
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
    const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, ownerName, partnerName, withFamily, mode }) }).catch(() => null);
    if (res?.status === 201) {
      const { id, url } = await res.json();
      if (url) { window.location.href = url; return; } // paying by card: Stripe, then back to the match page
      router.push(`/match/${id}?mode=${mode}`); return;
    }
    if (res?.status === 402) { window.location.href = `${creditsHref}?unlock=${analysisId}`; return; }
    setError((await res?.json().catch(() => null))?.message ?? "Error");
    setBusy(null);
  }

  const inProgress = existing.filter((m) => m.stage !== "ready");
  const ready = existing.filter((m) => m.stage === "ready");
  const stageText = (stage: MatchAddonProps["existing"][number]["stage"]) => t.stages[stage].replace(" {when}", "").replace("{when}", "").replace(" · {type} {value}", "");

  // The order, in two white cards with a tab, as on the landing page: who the two are, then how the partner's voice arrives.
  const form = (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
      <div className="card overflow-hidden">
        <p className="tab-title">1 · {t.stepWho}</p>
        <div className="grid gap-4 px-5 pb-6 pt-5 sm:grid-cols-2 sm:px-7 sm:pb-7">
          <label className="block text-sm"><span className="text-ink-2">{t.yourName}</span><input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required maxLength={60} className="offer-field mt-1.5 w-full px-3 py-2.5" /></label>
          <label className="block text-sm"><span className="text-ink-2">{t.partnerName}</span><input ref={partnerRef} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required maxLength={60} className="offer-field mt-1.5 w-full px-3 py-2.5" /></label>
          <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2"><input type="checkbox" checked={withFamily} onChange={(e) => setWithFamily(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />{t.withFamily}</label>
        </div>
      </div>
      <div className="card overflow-hidden">
        <p className="tab-title">2 · {t.stepHow.replace("{name}", who)}</p>
        <div className="px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
          {canOrder ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col rounded-2xl bg-accent-soft p-5">
                <p className="font-semibold">{t.haveRecording}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{withName(t.haveRecordingText)}</p>
                <button type="button" className="btn mt-5 w-full max-sm:!px-4 max-sm:!text-sm sm:w-auto sm:self-start" disabled={Boolean(busy)} onClick={() => order("upload")}>{busy === "upload" ? t.ordering : t.uploadCta}</button>
              </div>
              <div className="flex flex-col rounded-2xl border border-line p-5">
                <p className="font-semibold">{t.noRecording}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{withName(t.noRecordingText)}</p>
                <button type="button" className="btn btn-quiet mt-5 w-full max-sm:!px-4 max-sm:!text-sm sm:w-auto sm:self-start" disabled={Boolean(busy)} onClick={() => order("invite")}>{busy === "invite" ? t.ordering : t.inviteCta.replace("{name}", who)}</button>
              </div>
            </div>
          ) : <Link href={`${creditsHref}?unlock=${analysisId}`} className="btn">{t.getCredits} · {t.needCredits.replace("{n}", String(needed))}</Link>}
          {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
          {canOrder && price && <p className="mt-4 text-xs text-muted">{credits >= needed ? t.payWithCredits.replace("{n}", String(needed)).replace("{have}", String(credits)) : t.payByCard.replace("{price}", price.split(" ·")[0])}</p>}
        </div>
      </div>
    </form>
  );

  return (
    <section className="offer offer-match" data-no-export aria-label={t.eyebrow}>
      <p className="eyebrow !text-accent-text">{t.eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-medium leading-tight sm:text-4xl">{t.title}</h2>
      <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{t.lead}</p>
      <p className="mt-5"><span className="inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">{price ?? freeLabel}</span></p>

      {inProgress.length > 0 && (
        <div className="card mt-7 overflow-hidden">
          <p className="tab-title">{t.inProgressTitle}</p>
          <ul className="divide-y divide-line px-5 pb-2 pt-2 sm:px-7">
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
        <div className="card mt-7 overflow-hidden">
          <p className="tab-title">{t.existing}</p>
          <ul className="divide-y divide-line px-5 pb-2 pt-2 sm:px-7">
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
      <div className="mt-7">
        {inProgress.length > 0
          ? <details><summary className="btn btn-quiet cursor-pointer">{t.startAnother}</summary><div className="mt-5">{form}</div></details>
          : form}
      </div>
    </section>
  );
}
