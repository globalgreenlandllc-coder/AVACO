"use client";
/** Admin → Settings: one test event through Meta's Conversions API, marked with Events Manager's test code. */
import { useActionState } from "react";
import { metaTestAction, type StripeActionState } from "@/app/admin/actions";

export function MetaTest() {
  const [state, action, pending] = useActionState<StripeActionState, FormData>(metaTestAction, { ok: null, message: "" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input name="code" required autoComplete="off" placeholder="TEST12345" aria-label="Test event code" className="w-40 rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm uppercase" />
      <button type="submit" className="btn btn-quiet" disabled={pending}>{pending ? "Sending…" : "Send a test event"}</button>
      {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.message}</p>}
    </form>
  );
}
