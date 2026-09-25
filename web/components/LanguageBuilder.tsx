"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildLanguageAction } from "@/app/admin/actions";

/**
 * Adds or updates one language from the admin page: calls the build action again and again, one batch of
 * strings at a time, showing the count, until every string is translated.
 */
export function LanguageBuilder({ lang, done, total }: { lang: string; done: number; total: number }) {
  const router = useRouter();
  const [progress, setProgress] = useState({ done, total });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = progress.total > 0 && progress.done >= progress.total;

  async function build() {
    setBusy(true);
    setError(null);
    try {
      for (let guard = 0; guard < 200; guard++) {
        const next = await buildLanguageAction(lang);
        if (next.error) { setError(next.error); break; }
        setProgress(next);
        if (next.done >= next.total) break;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-3">
      {busy
        ? <span className="text-xs text-ink-2" aria-live="polite">Translating… {progress.done.toLocaleString("en-US")} / {progress.total.toLocaleString("en-US")}</span>
        : error
          ? <span className="text-xs text-danger" role="alert">{error}</span>
          : <span className="text-xs text-ink-2">{complete ? "Ready" : progress.done === 0 ? "Not added" : `${progress.done.toLocaleString("en-US")} of ${progress.total.toLocaleString("en-US")} up to date`}</span>}
      {!complete && <button type="button" className="rounded-md border border-line px-3 py-1 text-xs hover:border-ink-2 disabled:opacity-50" onClick={build} disabled={busy}>{progress.done === 0 ? "Add" : "Update"}</button>}
    </span>
  );
}
