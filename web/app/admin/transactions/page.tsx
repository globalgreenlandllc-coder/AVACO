import { transactions } from "@/lib/admin";
import { money } from "@/lib/money";
import { userLabels } from "@/lib/page";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = { purchase: "Purchase", grant: "Admin grant", promo: "Promo code", trial: "Company trial", report: "Report opened", refund: "Refund" };

export default async function AdminTransactions() {
  const rows = await transactions();
  const labels = await userLabels([...new Set(rows.filter((r) => r.ownerKind === "user").map((r) => r.ownerId))].slice(0, 100));
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Every movement of credits and money, newest first. The latest {rows.length}.</p>
        <a href="/api/admin/transactions" className="btn btn-quiet px-4 py-2 text-xs">Download all as CSV</a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-4 font-semibold">When (UTC)</th><th className="px-3 font-semibold">Who</th><th className="px-3 font-semibold">What</th><th className="px-3 text-right font-semibold">Credits</th><th className="px-3 text-right font-semibold">Money</th><th className="pl-3 font-semibold">Note</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 pr-4 text-xs text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="px-3">{r.ownerKind === "workspace" ? <>{r.workspaceName} <span className="text-xs text-muted">company</span></> : labels.get(r.ownerId) ?? r.ownerId}</td>
                <td className="px-3 text-ink-2">{REASONS[r.reason] ?? r.reason}</td>
                <td className="px-3 text-right font-semibold tabular-nums">{r.delta > 0 ? "+" : ""}{r.delta}</td>
                <td className="px-3 text-right tabular-nums">{r.amountCents ? money(r.amountCents, r.currency, "en") : ""}</td>
                <td className="pl-3 text-xs text-muted">{[r.note, r.createdBy && `by ${r.createdBy}`].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-6 text-sm text-muted">Nothing yet.</p>}
    </div>
  );
}
