"use client";

import { useState } from "react";

export function CopyLink({ value, label, copied }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="max-w-full break-all rounded-lg border border-line bg-bg px-3 py-2 text-sm">{value}</code>
      <button type="button" className="btn btn-quiet" onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked: the link is visible to copy by hand */ } }}>{done ? copied : label}</button>
    </div>
  );
}
