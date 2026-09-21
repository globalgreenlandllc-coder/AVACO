/** GET — the whole ledger as CSV, for accounting. Admins only. */
import { requireAdmin, transactions } from "@/lib/admin";

// A cell that starts with = + - or @ would run as a formula in a spreadsheet; a leading apostrophe keeps it text.
const cell = (v: unknown) => { const s = String(v ?? ""); return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };

export async function GET() {
  await requireAdmin();
  const rows = await transactions(100_000);
  const lines = [["created_at_utc", "owner_kind", "owner_id", "company", "reason", "credits", "amount", "currency", "ref", "note", "created_by"].join(",")];
  for (const r of rows) lines.push([r.createdAt.toISOString(), r.ownerKind, r.ownerId, r.workspaceName, r.reason, r.delta, (r.amountCents / 100).toFixed(2), r.currency, r.ref, r.note, r.createdBy].map(cell).join(","));
  return new Response(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="avoco-transactions-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
