"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

export interface PackView { id: string; credits: number; price: string; perReport: string }

/** Credit packs and the promo-code field. For a person, or for a workspace when workspaceId is given. `unlock` opens that report after payment, and `industry` the chapter on it. */
export function BuyCredits({ packs, canPay, t, workspaceId, unlock, industry }: { packs: PackView[]; canPay: boolean; t: Dict["billing"]; workspaceId?: string; unlock?: string; industry?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const names = t.packNames as Record<string, string>;
  const featured = packs.length > 2 ? packs[1].id : null;

  async function buy(pack: string) {
    setBusy(pack); setMessage(null);
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack, workspaceId, unlock, industry }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { window.location.href = body.url; return; }
    setMessage({ ok: false, text: body?.message ?? t.notReady });
    setBusy(null);
  }

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy("code"); setMessage(null);
    const res = await fetch("/api/billing/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, workspaceId }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    setBusy(null);
    if (res?.ok) { setCode(""); setMessage({ ok: true, text: t.redeemed.replace("{n}", String(body.credits)) }); router.refresh(); }
    else setMessage({ ok: false, text: body?.message ?? "" });
  }

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-3">
        {packs.map((p) => (
          <li key={p.id} className={`card flex flex-col p-6 ${p.id === featured ? "border-accent" : ""}`}>
            {p.id === featured && <p className="eyebrow !text-accent-text">{t.best}</p>}
            <p className="mt-1 text-lg font-semibold">{names[p.id] ?? t.credits.replace("{n}", String(p.credits))}</p>
            <p className="mt-3 font-display text-5xl font-medium tabular-nums">{p.price}</p>
            <p className="mt-1 text-sm text-ink-2">{t.credits.replace("{n}", String(p.credits))} · {t.perReport.replace("{price}", p.perReport)}</p>
            <button type="button" className={`btn mt-6 ${p.id === featured ? "" : "btn-quiet"}`} disabled={!canPay || busy !== null} onClick={() => buy(p.id)}>{t.pay.replace("{price}", p.price)}</button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">{canPay ? t.secure : t.notReady}</p>

      <form onSubmit={applyCode} className="flex max-w-md flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm"><span className="text-ink-2">{t.promo}</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.promoPlaceholder} maxLength={40} autoCapitalize="characters" className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5 uppercase" /></label>
        <button type="submit" className="btn btn-quiet" disabled={!code.trim() || busy !== null}>{t.redeem}</button>
      </form>
      {message && <p role="status" className={`text-sm ${message.ok ? "text-accent-text" : "text-danger"}`}>{message.text}</p>}
    </div>
  );
}
