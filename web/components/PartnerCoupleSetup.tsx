"use client";
/**
 * Setting up a couple's report on the partner page (app/partners/couple): who the two are to each other, their names,
 * then the second voice, recorded or uploaded here, or one already analysed on this device. Whatever is chosen travels
 * in the address, so the result page needs nothing stored.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { partnerReportsOnDevice } from "./PartnerHistory";
import { Recorder } from "./Recorder";

interface Props {
  a: string;
  t: Dict["partners"];
  record: Dict["record"];
  kinds: Array<{ key: string; label: string; hint: string }>;
  familyLabel: string;
  initial: { kind: string; nameA: string; nameB: string; family: boolean };
  locale: string;
}

export function PartnerCoupleSetup({ a, t, record, kinds, familyLabel, initial, locale }: Props) {
  const c = t.couple;
  const [kind, setKind] = useState(initial.kind);
  const [nameA, setNameA] = useState(initial.nameA);
  const [nameB, setNameB] = useState(initial.nameB);
  const [family, setFamily] = useState(initial.family);
  const [onDevice, setOnDevice] = useState<Array<{ id: string; at: string }>>([]);
  useEffect(() => { setOnDevice(partnerReportsOnDevice().filter((e) => e.id !== a).slice(0, 8)); }, [a]);

  // "{id}" stays as written: the recorder puts the new recording's id there.
  const query = `a=${encodeURIComponent(a)}&kind=${kind}${nameA.trim() ? `&na=${encodeURIComponent(nameA.trim())}` : ""}${nameB.trim() ? `&nb=${encodeURIComponent(nameB.trim())}` : ""}${kind === "couple" && family ? "&fam=1" : ""}`;
  const when = (iso: string) => { try { return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)); } catch { return iso.slice(0, 16); } };

  return (
    <div className="space-y-10">
      <section className="card space-y-6 p-7 sm:p-9">
        <div>
          <p className="eyebrow">{c.kind}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={c.kind}>
            {kinds.map((k) => (
              <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} title={k.hint} onClick={() => setKind(k.key)} className={`pill !py-2 text-sm ${kind === k.key ? "pill-on" : "pill-off"}`}>{k.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{kinds.find((k) => k.key === kind)?.hint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="text-ink-2">{c.nameA}</span><input value={nameA} onChange={(e) => setNameA(e.target.value)} maxLength={40} placeholder={c.defaultA} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>
          <label className="text-sm"><span className="text-ink-2">{c.nameB}</span><input value={nameB} onChange={(e) => setNameB(e.target.value)} maxLength={40} placeholder={c.defaultB} className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2.5" /></label>
        </div>
        {kind === "couple" && (
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={family} onChange={(e) => setFamily(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            <span>{familyLabel}</span>
          </label>
        )}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="font-display text-3xl font-medium">{c.second}</h2>
          <div className="mt-6">
            <Recorder t={record} uploadUrl="/api/partners/upload-token" createUrl="/api/partners/recordings" doneUrl={`/partners/couple?${query}&b={id}`} consentText={t.consent} limitText={t.limit} />
          </div>
        </section>
        {onDevice.length > 0 && (
          <aside>
            <p className="eyebrow">{c.orPick}</p>
            <ul className="mt-4 space-y-2">
              {onDevice.map((e) => (
                <li key={e.id}>
                  <Link href={`/partners/couple?${query}&b=${encodeURIComponent(e.id)}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm hover:border-accent">
                    <span className="text-ink-2">{when(e.at)}</span>
                    <span className="font-semibold text-accent-text">{c.pick} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
