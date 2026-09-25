"use client";

import { useActionState } from "react";
import type { StripeActionState } from "@/app/admin/actions";

type ConnectAction = (prev: StripeActionState, form: FormData) => Promise<StripeActionState>;

/** One secret pasted once, checked by the server and stored sealed. */
export function KeyConnect({ action, name, label, placeholder, button, canStore }: { action: ConnectAction; name: string; label: string; placeholder: string; button: string; canStore: boolean }) {
  const [state, run, pending] = useActionState<StripeActionState, FormData>(action, { ok: null, message: "" });
  return (
    <form action={run} className="space-y-4">
      <label className="block text-sm sm:max-w-md"><span className="text-ink-2">{label}</span><input name={name} type="password" required autoComplete="off" spellCheck={false} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm" /></label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={pending || !canStore}>{pending ? "Checking…" : button}</button>
        {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
