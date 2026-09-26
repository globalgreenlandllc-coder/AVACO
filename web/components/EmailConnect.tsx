"use client";

import { useActionState } from "react";
import { connectEmailAction, sampleReceiptAction, type StripeActionState } from "@/app/admin/actions";

const input = "rounded-lg border border-line bg-bg px-3 py-2 text-sm";

/** The mailbox receipts are sent from, and its app password. The server logs in with them before storing anything. */
export function EmailConnect({ canStore, suggested }: { canStore: boolean; suggested: string }) {
  const [state, action, pending] = useActionState<StripeActionState, FormData>(connectEmailAction, { ok: null, message: "" });
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm"><span className="text-ink-2">Mailbox</span><input name="user" type="email" required autoComplete="off" spellCheck={false} defaultValue={suggested} placeholder="support@avocousa.us" className={`${input} mt-1.5 w-full`} /></label>
        <label className="text-sm"><span className="text-ink-2">App password</span><input name="pass" type="password" required autoComplete="off" spellCheck={false} placeholder="abcd efgh ijkl mnop" className={`${input} mt-1.5 w-full font-mono`} /></label>
        <label className="text-sm"><span className="text-ink-2">Sender name</span><input name="fromName" autoComplete="off" defaultValue="AVOCO" maxLength={60} className={`${input} mt-1.5 w-full`} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={pending || !canStore}>{pending ? "Checking with Google…" : "Connect mailbox"}</button>
        {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}

/** One click: a sample receipt in the admin's own inbox, to see exactly what buyers get. */
export function SampleReceipt() {
  const [state, action, pending] = useActionState<StripeActionState>(sampleReceiptAction, { ok: null, message: "" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <button type="submit" className="btn btn-quiet" disabled={pending}>{pending ? "Sending…" : "Send me a sample receipt"}</button>
      {state.message && <p role="status" className={`text-sm ${state.ok ? "text-accent-text" : "text-danger"}`}>{state.message}</p>}
    </form>
  );
}
