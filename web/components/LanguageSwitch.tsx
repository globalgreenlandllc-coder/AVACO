"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n";

export interface LanguageOption { code: string; name: string }

/** A language menu: a button with the current language, opening the list of every language the app has. */
export function LanguageSwitch({ locale, label, languages }: { locale: Locale; label: string; languages: LanguageOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === locale) ?? languages[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const choose = (next: string) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await fetch("/api/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: next }) });
      router.refresh();
    });
  };

  return (
    <div ref={root} className="relative">
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-ink-2 hover:text-ink ${pending ? "opacity-60" : ""}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></svg>
        <span lang={current?.code}>{current?.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute right-0 z-20 mt-2 max-h-80 w-52 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lg">
          {languages.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button type="button" lang={l.code} onClick={() => choose(l.code)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${l.code === locale ? "bg-track font-semibold text-ink" : "text-ink-2 hover:bg-track/60 hover:text-ink"}`}>
                {l.name}
                {l.code === locale && <span aria-hidden className="text-accent-text">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
