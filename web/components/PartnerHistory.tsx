"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "avoco-partner-reports";
interface Entry { id: string; at: string }

const read = (): Entry[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Remembers a report on this device only; the partner page has no accounts. */
export function rememberPartnerReport(id: string) {
  try {
    const rest = read().filter((e) => e.id !== id);
    localStorage.setItem(KEY, JSON.stringify([{ id, at: new Date().toISOString() }, ...rest].slice(0, 20)));
  } catch { /* private window or storage blocked: the report still opens, it just isn't listed */ }
}

export function forgetPartnerReport(id: string) {
  try { localStorage.setItem(KEY, JSON.stringify(read().filter((e) => e.id !== id))); } catch { /* same */ }
}

export function PartnerHistory({ title, empty, open, locale }: { title: string; empty: string; open: string; locale: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => { setEntries(read()); }, []);
  if (entries === null) return null;
  return (
    <section className="card p-7">
      <p className="eyebrow">{title}</p>
      {entries.length === 0 ? <p className="mt-3 text-sm leading-relaxed text-ink-2">{empty}</p> : (
        <ul className="mt-4 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-ink-2">{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(e.at))}</span>
              <Link href={`/partners/r/${e.id}`} className="text-sm font-semibold text-accent-text hover:underline">{open} →</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Adds the report to this device's list when its page opens. */
export function PartnerRemember({ id }: { id: string }) {
  useEffect(() => { rememberPartnerReport(id); }, [id]);
  return null;
}

/** Drops a report from the list after it was deleted (the report page sends ?forget=<id> back here). */
export function PartnerForget({ id }: { id: string }) {
  useEffect(() => { forgetPartnerReport(id); }, [id]);
  return null;
}
