"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMatch({ id, label, confirm, afterHref }: { id: string; label: string; confirm: string; afterHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="no-print" data-no-export>
      <button type="button" className="btn btn-quiet btn-danger" disabled={busy} onClick={async () => {
        if (!window.confirm(confirm)) return;
        setBusy(true);
        const res = await fetch(`/api/match/${id}`, { method: "DELETE" }).catch(() => null);
        if (res?.ok) { router.push(afterHref); router.refresh(); } else setBusy(false);
      }}>{label}</button>
    </div>
  );
}
