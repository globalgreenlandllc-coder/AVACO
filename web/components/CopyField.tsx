"use client";

import { useState } from "react";

export function CopyField({ value, copy, copied }: { value: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink-2" aria-label={copy} />
      <button type="button" className="btn btn-quiet shrink-0 px-4 py-2 text-xs" onClick={async () => { await navigator.clipboard.writeText(value).catch(() => {}); setDone(true); setTimeout(() => setDone(false), 1500); }}>
        {done ? copied : copy}
      </button>
    </div>
  );
}
