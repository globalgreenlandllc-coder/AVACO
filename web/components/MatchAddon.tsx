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
  canOrder: boolean;
  creditsHref?: string;
  existing: Array<{ id: string; partnerName: string; status: "waiting" | "processing" | "ready" }>;
  t: Dict["match"];
}

/** The add-on card in a report: order a couple's report by inviting the partner, and the matches already ordered. */
export function MatchAddon({ analysisId, price, freeLabel, credits, canOrder, creditsHref = "/credits", existing, t }: MatchAddonProps) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [withFamily, setWithFamily] = useState(false);
  const [busy, setBusy] = useState<"upload" | "invite" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ownerRef = useRef<HTMLInputElement>(null), partnerRef = useRef<HTMLInputElement>(null);
  const who = partnerName.trim() || "…";

  /** Both ways in create (and pay for) the match; the match page then opens on the chosen way. */
  async function order(mode: "upload" | "invite") {
    if (!ownerName.trim() || !partnerName.trim()) { setError(t.namesFirst); (ownerName.trim() ? partnerRef : ownerRef).current?.focus(); return; }
    setBusy(mode); setError(null);
    const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, ownerName, partnerName, withFamily }) }).catch(() => null);
    if (res?.status === 201) { const { id } = await res.json(); router.push(`/match/${id}?mode=${mode}`); return; }
    if (res?.status === 402) { window.location.href = `${creditsHref}?unlock=${analysisId}`; return; }
    setError((await res?.json().catch(() => null))?.message ?? "Error");
    setBusy(null);
  }

  return (
    <section className="addon-strip" data-no-export>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div>
          <p className="addon-badge">{t.eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{t.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">{t.lead}</p>
          <p className="mt-4"><span className="addon-pill">{price ?? freeLabel}</span></p>
          {existing.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">{t.existing}</p>
              <ul className="mt-2 divide-y divide-line">
                {existing.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{m.partnerName} <span className="text-muted">· {m.status === "ready" ? t.ready : t.waiting.replace("{name}", m.partnerName)}</span></span>
                    <Link href={`/match/${m.id}`} className="font-semibold text-accent-text hover:underline">{t.open} →</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <form onSubmit={(e) => e.preventDefault()} className="card space-y-3 p-5">
          <p className="eyebrow">1 · {t.stepWho}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm"><span className="text-ink-2">{t.yourName}</span><input ref={ownerRef} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required maxLength={60} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2.5" /></label>
            <label className="block text-sm"><span className="text-ink-2">{t.partnerName}</span><input ref={partnerRef} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} required maxLength={60} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2.5" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" checked={withFamily} onChange={(e) => setWithFamily(e.target.checked)} className="h-4 w-4 accent-[var(--addon)]" />{t.withFamily}</label>
          <p className="eyebrow pt-2">2 · {t.stepHow.replace("{name}", who)}</p>
          {canOrder ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3">
                <p className="text-sm font-semibold">{t.haveRecording}</p>
                <p className="mt-1 min-h-16 text-xs leading-relaxed text-ink-2">{t.haveRecordingText.replace("{name}", who)}</p>
                <button type="button" className="btn addon-btn mt-3 w-full" disabled={Boolean(busy)} onClick={() => order("upload")}>{busy === "upload" ? t.ordering : t.uploadCta}</button>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-sm font-semibold">{t.noRecording}</p>
                <p className="mt-1 min-h-16 text-xs leading-relaxed text-ink-2">{t.noRecordingText.replace("{name}", who)}</p>
                <button type="button" className="btn btn-quiet mt-3 w-full" disabled={Boolean(busy)} onClick={() => order("invite")}>{busy === "invite" ? t.ordering : t.inviteCta.replace("{name}", who)}</button>
              </div>
            </div>
          ) : <Link href={`${creditsHref}?unlock=${analysisId}`} className="btn addon-btn w-full">{t.getCredits} · {t.needCredits.replace("{n}", "2")}</Link>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {canOrder && price && <p className="text-xs text-muted">{t.needCredits.replace("{n}", "2")} {price}</p>}
        </form>
      </div>
    </section>
  );
}
