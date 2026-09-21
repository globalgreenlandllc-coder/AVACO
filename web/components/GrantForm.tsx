import { grantAction } from "@/app/admin/actions";

/** Add (or, with a negative number, take back) credits. Every grant is recorded in the ledger with who did it. */
export function GrantForm({ kind, id }: { kind: "user" | "workspace"; id: string }) {
  return (
    <form action={grantAction} className="flex items-center gap-1.5">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
      <input name="credits" type="number" required step="1" placeholder="+5" aria-label="Credits to add" className="w-16 rounded-md border border-line bg-bg px-2 py-1 text-xs" />
      <input name="note" maxLength={200} placeholder="why" aria-label="Note" className="w-24 rounded-md border border-line bg-bg px-2 py-1 text-xs" />
      <button type="submit" className="rounded-md border border-line px-2 py-1 text-xs hover:border-ink-2">Grant</button>
    </form>
  );
}
