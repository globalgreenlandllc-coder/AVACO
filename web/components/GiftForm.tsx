"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";

/** The gift builder: names, a message, how many reports and industry chapters, the live total, and the button that pays. */
export function GiftForm({ t, defaultName, reportCents, industryCents, currency, locale, free, maxReports, maxIndustries }: {
  t: Dict["gift"]["form"]; defaultName: string; reportCents: number; industryCents: number; currency: string; locale: string; free: boolean; maxReports: number; maxIndustries: number;
}) {
  const [giverName, setGiverName] = useState(defaultName);
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [reports, setReports] = useState(1);
  const [industries, setIndustries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (cents: number) => { try { return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`; } };
  const total = reports * reportCents + industries * industryCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/gift", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ giverName, recipientName, message, reports, industries }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { window.location.href = body.url; return; }
    setError(body?.message ?? "Something went wrong. Please try again.");
    setBusy(false);
  }

  const counter = (label: string, help: string, value: number, set: (n: number) => void, min: number, max: number, unit: number) => (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{help}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="−" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => set(Math.max(min, value - 1))} disabled={value <= min}>−</button>
          <span className="w-8 text-center text-lg font-semibold tabular-nums">{value}</span>
          <button type="button" aria-label="+" className="btn btn-quiet !h-9 !w-9 !p-0" onClick={() => set(Math.min(max, value + 1))} disabled={value >= max}>+</button>
        </div>
      </div>
      {!free && <p className="mt-3 text-right text-sm text-ink-2">{value} × {fmt(unit)}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm"><span className="text-ink-2">{t.yourName}</span><input value={giverName} onChange={(e) => setGiverName(e.target.value)} required maxLength={60} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>
        <label className="text-sm"><span className="text-ink-2">{t.recipientName}</span><input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={60} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /><span className="mt-1 block text-xs text-muted">{t.recipientHelp}</span></label>
      </div>
      <label className="block text-sm"><span className="text-ink-2">{t.message}</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} placeholder={t.messagePlaceholder} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>

      <div className="grid gap-4 sm:grid-cols-2">
        {counter(t.reports, t.reportsHelp, reports, setReports, 1, maxReports, reportCents)}
        {counter(t.industries, t.industriesHelp, industries, setIndustries, 0, maxIndustries, industryCents)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-text">{t.total}</p>
          <p className="font-display text-4xl font-medium tabular-nums">{free ? fmt(0) : fmt(total)}</p>
          {free && <p className="mt-1 text-xs text-muted">{t.freeNote}</p>}
        </div>
        <button type="submit" className="btn" disabled={busy || !giverName.trim()}>{busy ? t.creating : free ? t.create : t.pay.replace("{price}", fmt(total))}</button>
      </div>
      {!free && <p className="text-xs text-muted">{t.secure}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>
  );
}
