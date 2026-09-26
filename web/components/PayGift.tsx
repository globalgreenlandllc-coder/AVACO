"use client";

import { useState } from "react";

/** Pays for a gift that was created but never paid: a fresh Stripe Checkout, then back to the gift page. */
export function PayGift({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    const res = await fetch(`/api/gift/${id}/checkout`, { method: "POST" }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.url) { window.location.href = body.url; return; }
    setBusy(false);
  }
  return <button type="button" className="btn" onClick={pay} disabled={busy}>{label}</button>;
}
