"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n";

export interface LanguageOption { code: string; name: string; flag: string }

/**
 * A language menu: a button showing the current language with its flag (English (US) until the visitor picks
 * another), opening the list of every language the app has. `openUp` is for the footer, where the list must
 * open above the button.
 */
export function LanguageSwitch({ locale, label, languages, openUp = false }: { locale: Locale; label: string; languages: LanguageOption[]; openUp?: boolean }) {
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
        <span aria-hidden className="text-sm leading-none">{current?.flag}</span>
        <span lang={current?.code}>{current?.name}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d={openUp ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className={`absolute end-0 z-20 max-h-80 w-56 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-lg ${openUp ? "bottom-full mb-2" : "mt-2"}`}>
          {languages.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button type="button" lang={l.code} onClick={() => choose(l.code)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm ${l.code === locale ? "bg-track font-semibold text-ink" : "text-ink-2 hover:bg-track/60 hover:text-ink"}`}>
                <span aria-hidden className="text-base leading-none">{l.flag}</span>
                <span className="flex-1">{l.name}</span>
                {l.code === locale && <span aria-hidden className="text-accent-text">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
