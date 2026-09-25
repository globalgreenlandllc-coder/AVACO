"use client";

import { useActionState } from "react";
import { connectStripeAction, type StripeActionState } from "@/app/admin/actions";

const input = "rounded-lg border border-line bg-bg px-3 py-2 font-mono text-sm";

/** The two Stripe secrets, pasted once. The server checks the key with Stripe and stores both sealed. */
export function StripeConnect({ canStore }: { canStore: boolean }) {
  const [state, action, pending] = useActionState<StripeActionState, FormData>(connectStripeAction, { ok: null, message: "" });
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm"><span className="text-ink-2">Secret key</span><input name="secretKey" type="password" required autoComplete="off" spellCheck={false} placeholder="sk_live_…" className={`${input} mt-1.5 w-full`} /></label>
        <label className="text-sm"><span className="text-ink-2">Webhook signing secret <span className="text-muted">(optional: leave empty and it is set up for you)</span></span><input name="webhookSecret" type="password" autoComplete="off" spellCheck={false} placeholder="whsec_… or empty" className={`${input} mt-1.5 w-full`} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={pending || !canStore}>{pending ? "Checking with Stripe…" : "Connect Stripe"}</button>
        {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
