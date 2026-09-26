"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

const DRAFT_KEY = "avoco-gift-draft";
interface Draft { giverName: string; recipientName: string; message: string; reports: number; industries: number; matches: number }

/**
 * The gift builder: names, a message, how many voice reports, industry chapters and relationship matches, the live
 * total, and the button that pays. It lives on the landing page too, where a visitor may not be signed in yet: the
 * draft is kept in the browser, so after signing in the form on /gift is exactly as they left it.
 */
export function GiftForm({ t, defaultName, reportCents, industryCents, matchCents, currency, locale, free, signedIn, signInHref, maxReports, maxIndustries, maxMatches }: {
  t: Dict["gift"]["form"]; defaultName: string; reportCents: number; industryCents: number; matchCents: number; currency: string; locale: string;
  free: boolean; signedIn: boolean; signInHref: string; maxReports: number; maxIndustries: number; maxMatches: number;
}) {
  const [draft, setDraft] = useState<Draft>({ giverName: defaultName, recipientName: "", message: "", reports: 1, industries: 0, matches: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What was typed before signing in comes back; what is typed now is kept.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
      if (saved) setDraft((d) => ({ ...d, ...saved, giverName: saved.giverName || d.giverName }));
    } catch { /* storage may be unavailable */ }
  }, []);
  const update = (patch: Partial<Draft>) => setDraft((d) => {
    const next = { ...d, ...patch };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* fine without */ }
    return next;
  });

  const fmt = (cents: number) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`; } };
  const total = draft.reports * reportCents + draft.industries * industryCents + draft.matches * matchCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) { window.location.href = signInHref; return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/gift", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { try { localStorage.removeItem(DRAFT_KEY); } catch { /* fine */ } window.location.href = body.url; return; }
    setError(body?.message ?? "Something went wrong. Please try again.");
    setBusy(false);
  }

  const counter = (label: string, help: string, key: "reports" | "industries" | "matches", min: number, max: number, unit: number) => {
    const value = draft[key];
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{help}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label="−" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => update({ [key]: Math.max(min, value - 1) })} disabled={value <= min}>−</button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="+" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => update({ [key]: Math.min(max, value + 1) })} disabled={value >= max}>+</button>
          </div>
        </div>
        {!free && <p className="mt-3 text-right text-sm text-ink-2">{value} × {fmt(unit)}</p>}
      </div>
    );
  };

  const buttonLabel = busy ? t.creating : !signedIn ? (free ? t.signInFree : t.signIn.replace("{price}", fmt(total))) : free ? t.create : t.pay.replace("{price}", fmt(total));

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm"><span className="text-ink-2">{t.yourName}</span><input value={draft.giverName} onChange={(e) => update({ giverName: e.target.value })} required maxLength={60} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>
        <label className="text-sm"><span className="text-ink-2">{t.recipientName}</span><input value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} maxLength={60} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /><span className="mt-1 block text-xs text-muted">{t.recipientHelp}</span></label>
      </div>
      <label className="block text-sm"><span className="text-ink-2">{t.message}</span><textarea value={draft.message} onChange={(e) => update({ message: e.target.value })} maxLength={300} rows={3} placeholder={t.messagePlaceholder} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>

      <div className="grid gap-4 sm:grid-cols-3">
        {counter(t.reports, t.reportsHelp, "reports", 1, maxReports, reportCents)}
        {counter(t.industries, t.industriesHelp, "industries", 0, maxIndustries, industryCents)}
        {counter(t.matches, t.matchesHelp, "matches", 0, maxMatches, matchCents)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-text">{t.total}</p>
          <p className="font-display text-4xl font-medium tabular-nums">{free ? fmt(0) : fmt(total)}</p>
          {free && <p className="mt-1 text-xs text-muted">{t.freeNote}</p>}
        </div>
        {signedIn
          ? <button type="submit" className="btn" disabled={busy || !draft.giverName.trim()}>{buttonLabel}</button>
          : <Link href={signInHref} className="btn">{buttonLabel}</Link>}
      </div>
      {!free && <p className="text-xs text-muted">{t.secure}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
