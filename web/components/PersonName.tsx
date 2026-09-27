"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import { MAX_NAME, personKey } from "@/lib/person";

/**
 * On the report's cover: whose voice this report is, and the way to change it. A named report says so on the cover,
 * in print and in the downloaded file too; the account holder's own report shows only the quiet "add a name" link.
 * Saving re-renders the page, because the type across recordings is read per person (lib/profile.ts).
 */
export function PersonName({ analysisId, name, known, t }: { analysisId: string; name: string | null; known: string[]; t: Dict["people"] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(value: string) {
    setBusy(true); setFailed(false);
    const res = await fetch(`/api/analyses/${analysisId}/person`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: value }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setFailed(true); return; }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {name && <span className="rounded-full border px-4 py-1.5 font-semibold" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", color: "var(--cover-ink)" }}>{t.reportFor.replace("{name}", name)}</span>}
        <button type="button" data-no-export className="no-print text-sm font-semibold underline-offset-4 hover:underline" style={{ color: name ? "var(--cover-gold)" : "var(--cover-muted)" }} onClick={() => { setDraft(name ?? ""); setEditing(true); }}>
          ✎ {name ? t.change : t.addName}
        </button>
      </div>
    );
  }

  // The choices: me, the names already used on this account, or a new one typed in.
  const others = known.filter((n) => personKey(n) !== "");
  const pill = (on: boolean) => `pill ${on ? "pill-on" : "pill-off"}`;
  return (
    <form data-no-export className="offer-cover no-print relative mt-5 max-w-xl rounded-2xl border border-line p-5" onSubmit={(e) => { e.preventDefault(); void save(draft); }}>
      <p className="cover-eyebrow">{t.editTitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={pill(personKey(draft) === "")} onClick={() => setDraft("")}>{t.me}</button>
        {others.map((n) => <button key={n} type="button" className={pill(personKey(draft) === personKey(n))} onClick={() => setDraft(n)}>{n}</button>)}
      </div>
      <label className="sr-only" htmlFor={`person-${analysisId}`}>{t.namePlaceholder}</label>
      <input id={`person-${analysisId}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={MAX_NAME} placeholder={t.namePlaceholder} autoComplete="off" className="offer-field mt-3 w-full px-3 py-2.5 text-sm" />
      <p className="mt-2 text-xs text-ink-2">{t.editHelp}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" className="btn" disabled={busy}>{busy ? t.saving : t.save}</button>
        <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)} disabled={busy}>{t.cancel}</button>
      </div>
      {failed && <p role="alert" className="mt-3 text-sm text-danger">{t.error}</p>}
    </form>
  );
}
