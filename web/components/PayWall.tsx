"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { goToCheckout } from "@/lib/track";

/**
 * Shown under the free preview, whose locked sections already show what the full report holds: the one button that
 * opens it. With credits, one of them; without, a card payment for exactly this report (`pay`), straight back to it
 * opened, and the packs as the cheaper way for anyone who wants more. `demo` is an admin looking as a client: the
 * same screen with the buttons inactive, so nobody pays by accident.
 */
export function PayWall({ analysisId, credits, fromPrice, pay, demo = false, t }: {
  analysisId: string; credits: number; fromPrice: string;
  /** Where to start a card payment for the single-report pack, its id and its price as words; absent when cards aren't offered. */
  pay?: { url: string; pack: string; price: string };
  demo?: boolean;
  t: Dict["billing"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const l = t.lock;

  async function payNow() {
    if (!pay) return;
    setBusy(true); setFailed(false);
    const res = await fetch(pay.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack: pay.pack, unlock: analysisId }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { goToCheckout(body.url, "report"); return; }
    setBusy(false); setFailed(true);
  }

  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId }) }).catch(() => null);
    if (res?.ok) router.refresh();
    else if (res?.status === 402) router.push(`/credits?unlock=${analysisId}`);
    setBusy(false);
  }

  return (
    <section className="card border-accent p-8 sm:p-12" style={{ boxShadow: "0 18px 50px -24px color-mix(in oklab, var(--accent) 55%, transparent)" }}>
      <h2 className="font-display text-4xl font-medium">{l.title}</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{l.lead}</p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {credits > 0 && !demo
          ? <button type="button" className="btn" onClick={open} disabled={busy}>{busy ? l.unlocking : l.unlock}</button>
          : pay
            ? <button type="button" className="btn" onClick={payNow} disabled={busy || demo}>{busy ? l.paying : l.payNow.replace("{price}", pay.price)}</button>
            : <Link href={`/credits?unlock=${analysisId}`} className="btn" aria-disabled={demo} onClick={(e) => { if (demo) e.preventDefault(); }}>{l.getCredits} · {l.from.replace("{price}", fromPrice)}</Link>}
        {credits > 0 && !demo
          ? <p className="text-sm text-ink-2">{l.youHave.replace("{n}", credits === 1 ? t.credit : t.credits.replace("{n}", String(credits)))}</p>
          : pay
            ? <Link href={`/credits?unlock=${analysisId}`} className="text-sm font-semibold text-accent-text hover:underline" onClick={(e) => { if (demo) e.preventDefault(); }}>{l.orPack} →</Link>
            : <p className="text-sm text-ink-2">{l.need}</p>}
      </div>
      {pay && (credits === 0 || demo) && <p className="mt-4 text-xs text-muted">{l.payNote}</p>}
      {failed && <p role="alert" className="mt-4 text-sm text-danger">{t.notReady}</p>}
    </section>
  );
}
