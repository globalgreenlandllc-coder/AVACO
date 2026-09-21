import { GrantForm } from "@/components/GrantForm";
import { userRows } from "@/lib/admin";
import { userLabels } from "@/lib/page";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const rows = await userRows();
  const labels = await userLabels(rows.map((r) => r.userId).slice(0, 100));
  return (
    <div>
      <p className="mb-5 text-sm text-ink-2">People who recorded for themselves or hold credits, most recently active first. {rows.length} shown.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-4 font-semibold">Person</th><th className="px-3 text-right font-semibold">Recordings</th><th className="px-3 text-right font-semibold">Opened</th><th className="px-3 text-right font-semibold">Credits</th><th className="px-3 text-right font-semibold">Spent</th><th className="px-3 font-semibold">Last active</th><th className="pl-3 font-semibold">Grant credits</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.userId}>
                <td className="py-3 pr-4">{labels.get(r.userId) ?? r.userId}</td>
                <td className="px-3 text-right tabular-nums">{r.recordings}</td>
                <td className="px-3 text-right tabular-nums">{r.opened}</td>
                <td className="px-3 text-right font-semibold tabular-nums">{r.credits}</td>
                <td className="px-3 text-right tabular-nums">{money(r.spentCents, "usd", "en")}</td>
                <td className="px-3 text-xs text-muted">{r.lastActive?.toISOString().slice(0, 10) ?? ""}</td>
                <td className="pl-3"><GrantForm kind="user" id={r.userId} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-6 text-sm text-muted">Nobody yet.</p>}
    </div>
  );
}
