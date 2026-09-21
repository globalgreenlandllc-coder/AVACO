"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

const LOCALES: Array<{ id: Locale; short: string; name: string }> = [
  { id: "en", short: "EN", name: "English" },
  { id: "ru", short: "RU", name: "Русский" },
];

export function LanguageSwitch({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => startTransition(async () => {
    await fetch("/api/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: next }) });
    router.refresh();
  });

  return (
    <div role="group" aria-label={label} className={`flex rounded-full border border-line p-0.5 text-xs font-semibold ${pending ? "opacity-60" : ""}`}>
      {LOCALES.map((l) => (
        <button key={l.id} type="button" lang={l.id} aria-label={l.name} aria-pressed={l.id === locale} onClick={() => l.id !== locale && choose(l.id)}
          className={`rounded-full px-2.5 py-1 ${l.id === locale ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
