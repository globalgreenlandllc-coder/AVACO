"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { goToCheckout } from "@/lib/track";

/**
 * Pays for a couple's report that was ordered but never paid (a card checkout left half-way). Ordering the same
 * couple again reuses that match, so this only opens a fresh checkout for it; nothing is created or paid twice.
 */
export function PayMatch({ analysisId, ownerName, partnerName, withFamily, label }: { analysisId: string; ownerName: string; partnerName: string; withFamily: boolean; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true); setError(null);
    const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysisId, ownerName, partnerName, withFamily, mode: "invite" }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.status === 201 && body?.url) { goToCheckout(body.url, "relationship"); return; }
    if (res?.status === 201) { router.refresh(); return; } // nothing left to pay
    setError(body?.message ?? "Something went wrong. Please try again.");
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <button type="button" className="btn" onClick={pay} disabled={busy}>{busy ? "…" : label}</button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
