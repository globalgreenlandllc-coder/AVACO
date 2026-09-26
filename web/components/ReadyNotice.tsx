"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "avoco-notice-hidden";

/** The notices themselves; "Later" hides one for this browser session only, so it comes back next visit until opened. */
export function ReadyNotice({ items, later }: { items: Array<{ id: string; href: string; text: string; open: string }>; later: string }) {
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    try { setHidden(JSON.parse(sessionStorage.getItem(KEY) ?? "[]")); } catch { /* storage may be unavailable */ }
  }, []);
  const shown = items.filter((i) => !hidden.includes(i.id));
  if (shown.length === 0) return null;

  const hide = (id: string) => {
    const next = [...hidden, id];
    setHidden(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* fine without */ }
  };

  return (
    <div className="no-print mx-auto w-full max-w-5xl px-5 sm:px-8">
      {shown.map((i) => (
        <div key={i.id} role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent bg-accent-soft px-5 py-3 text-sm">
          <span className="font-medium">♥ {i.text}</span>
          <span className="flex items-center gap-4">
            <Link href={i.href} className="btn !px-4 !py-1.5 text-xs">{i.open}</Link>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => hide(i.id)}>{later}</button>
          </span>
        </div>
      ))}
    </div>
  );
}
