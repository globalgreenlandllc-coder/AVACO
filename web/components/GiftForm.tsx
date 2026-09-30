"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { goToCheckout } from "@/lib/track";

/**
 * Drafts are kept per account, so a gift someone started never shows up for another person who uses the same browser.
 * A draft typed while signed out ("guest") carries over once, into the account that signs in next. The old shared key
 * is removed on sight: it could hold another account's names.
 */
const LEGACY_KEY = "avoco-gift-draft";
const draftKey = (owner: string) => `avoco-gift-draft:${owner}`;
interface Draft { giverName: string; recipientName: string; message: string; reports: number; industries: number; matches: number; best: number }

/**
 * The gift builder: names, a message, how many voice reports, industry chapters, best-match industries and relationship matches, the live
 * total, and the button that pays. It lives on the landing page too, where a visitor may not be signed in yet: the
 * draft is kept in the browser, so after signing in the form on /gift is exactly as they left it.
 */
export function GiftForm({ t, defaultName, reportCents, industryCents, matchCents, bestCents, currency, locale, free, signedIn, signInHref, maxReports, maxIndustries, maxMatches, maxBest, draftOwner }: {
  t: Dict["gift"]["form"]; defaultName: string; reportCents: number; industryCents: number; matchCents: number; bestCents: number; currency: string; locale: string;
  free: boolean; signedIn: boolean; signInHref: string; maxReports: number; maxIndustries: number; maxMatches: number; maxBest: number;
  /** Whose draft this is: the signed-in user's id, or "guest". */
  draftOwner: string;
}) {
  const key = draftKey(draftOwner);
  const [draft, setDraft] = useState<Draft>({ giverName: defaultName, recipientName: "", message: "", reports: 1, industries: 0, matches: 0, best: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This account's draft comes back; a draft typed while signed out comes back once, into this account; nothing else does.
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KEY);
      let saved = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<Draft> | null;
      if (!saved && signedIn) {
        saved = JSON.parse(localStorage.getItem(draftKey("guest")) ?? "null") as Partial<Draft> | null;
        if (saved) { localStorage.removeItem(draftKey("guest")); localStorage.setItem(key, JSON.stringify(saved)); }
      }
      if (saved) setDraft((d) => ({ ...d, ...saved, giverName: saved!.giverName || d.giverName }));
    } catch { /* storage may be unavailable */ }
  }, [key, signedIn]);
  const update = (patch: Partial<Draft>) => setDraft((d) => {
    const next = { ...d, ...patch };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* fine without */ }
    return next;
  });

  const fmt = (cents: number) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`; } };
  const total = draft.reports * reportCents + draft.industries * industryCents + draft.best * bestCents + draft.matches * matchCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedIn) { window.location.href = signInHref; return; }
    setBusy(true); setError(null);
    const res = await fetch("/api/gift", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { try { localStorage.removeItem(key); } catch { /* fine */ } goToCheckout(body.url, "gift"); return; }
    setError(body?.message ?? "Something went wrong. Please try again.");
    setBusy(false);
  }

  const counter = (label: string, tag: string, help: string, key: "reports" | "industries" | "best" | "matches", min: number, max: number, unit: number) => {
    const value = draft[key];
    return (
      <div className="card flex flex-col p-5">
        <p className="font-semibold leading-snug">{label}</p>
        <p className="mt-1.5 text-sm leading-snug text-accent-text">{tag}</p>
        <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{help}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          {free ? <span /> : <span className="text-sm text-ink-2">{value} × {fmt(unit)}</span>}
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label="−" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => update({ [key]: Math.max(min, value - 1) })} disabled={value <= min}>−</button>
            <span className="w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
            <button type="button" aria-label="+" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => update({ [key]: Math.min(max, value + 1) })} disabled={value >= max}>+</button>
          </div>
        </div>
      </div>
    );
  };

  const buttonLabel = busy ? t.creating : !signedIn ? (free ? t.signInFree : t.signIn.replace("{price}", fmt(total))) : free ? t.create : t.pay.replace("{price}", fmt(total));

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm"><span className="text-ink-2">{t.yourName}</span><input value={draft.giverName} onChange={(e) => update({ giverName: e.target.value })} required maxLength={60} placeholder={t.yourNamePlaceholder} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>
        <label className="text-sm"><span className="text-ink-2">{t.recipientName}</span><input value={draft.recipientName} onChange={(e) => update({ recipientName: e.target.value })} maxLength={60} placeholder={t.recipientNamePlaceholder} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /><span className="mt-1 block text-xs text-muted">{t.recipientHelp}</span></label>
      </div>
      <label className="block text-sm"><span className="text-ink-2">{t.message}</span><textarea value={draft.message} onChange={(e) => update({ message: e.target.value })} maxLength={300} rows={3} placeholder={t.messagePlaceholder} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {counter(t.reports, t.reportsTag, t.reportsHelp, "reports", 1, maxReports, reportCents)}
        {counter(t.industries, t.industriesTag, t.industriesHelp, "industries", 0, maxIndustries, industryCents)}
        {counter(t.best, t.bestTag, t.bestHelp, "best", 0, maxBest, bestCents)}
        {counter(t.matches, t.matchesTag, t.matchesHelp, "matches", 0, maxMatches, matchCents)}
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
