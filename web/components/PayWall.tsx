"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

/** Shown under the free preview: what the full report holds, and the one button that opens it. */
export function PayWall({ analysisId, credits, fromPrice, t }: { analysisId: string; credits: number; fromPrice: string; t: Dict["billing"] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const l = t.lock;

  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId }) }).catch(() => null);
    if (res?.ok) router.refresh();
    else if (res?.status === 402) router.push(`/credits?unlock=${analysisId}`);
    setBusy(false);
  }

  return (
    <section className="card border-accent p-8 sm:p-12">
      <h2 className="font-display text-4xl font-medium">{l.title}</h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{l.lead}</p>
      <ul className="mt-6 space-y-2.5">
        {l.items.map((item) => <li key={item} className="flex gap-3 leading-relaxed"><span className="text-accent-text" aria-hidden>✓</span><span>{item}</span></li>)}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {credits > 0
          ? <button type="button" className="btn" onClick={open} disabled={busy}>{busy ? l.unlocking : l.unlock}</button>
          : <Link href={`/credits?unlock=${analysisId}`} className="btn">{l.getCredits} · {l.from.replace("{price}", fromPrice)}</Link>}
        <p className="text-sm text-ink-2">{credits > 0 ? l.youHave.replace("{n}", credits === 1 ? t.credit : t.credits.replace("{n}", String(credits))) : l.need}</p>
      </div>
    </section>
  );
}
