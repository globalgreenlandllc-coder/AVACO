"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildLanguageAction } from "@/app/admin/actions";

/**
 * One button that adds or updates every language that is missing or out of date, one after the other,
 * calling the same batch action the single-language rows use. Keep the tab open while it runs.
 */
export function LanguageBuilderAll({ languages }: { languages: Array<{ code: string; name: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; index: number; done: number; total: number; error: string | null }>({ busy: false, index: 0, done: 0, total: 0, error: null });

  async function buildAll() {
    setState({ busy: true, index: 0, done: 0, total: 0, error: null });
    try {
      for (let i = 0; i < languages.length; i++) {
        for (let guard = 0; guard < 200; guard++) {
          const next = await buildLanguageAction(languages[i].code);
          if (next.error) { setState((s) => ({ ...s, busy: false, error: `${languages[i].name}: ${next.error}` })); return; }
          setState({ busy: true, index: i, done: next.done, total: next.total, error: null });
          if (next.done >= next.total) break;
        }
      }
      router.refresh();
    } finally {
      setState((s) => ({ ...s, busy: false }));
    }
  }

  if (languages.length === 0) return <span className="text-xs text-ink-2">Every language is up to date.</span>;
  return (
    <span className="flex flex-wrap items-center gap-3">
      {state.busy
        ? <span className="text-xs text-ink-2" aria-live="polite">Translating {languages[state.index]?.name}: {state.done.toLocaleString("en-US")} / {state.total.toLocaleString("en-US")} · language {state.index + 1} of {languages.length}. Keep this tab open.</span>
        : state.error
          ? <span className="text-xs text-danger" role="alert">{state.error}</span>
          : <span className="text-xs text-ink-2">{languages.length} language{languages.length === 1 ? "" : "s"} to add or update.</span>}
      <button type="button" className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-ink hover:opacity-90 disabled:opacity-50" onClick={buildAll} disabled={state.busy}>Add all languages</button>
    </span>
  );
}
