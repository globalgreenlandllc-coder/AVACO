import { GrantForm } from "@/components/GrantForm";
import { companyRows } from "@/lib/admin";
import { en } from "@/lib/i18n/en";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCompanies() {
  const rows = await companyRows();
  const preset = (k: string) => (en.org.presets as Record<string, { name: string }>)[k]?.name ?? k;
  return (
    <div>
      <p className="mb-5 text-sm text-ink-2">Every workspace, newest first. {rows.length} shown.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted"><tr><th className="py-2 pr-4 font-semibold">Company</th><th className="px-3 font-semibold">Industry</th><th className="px-3 text-right font-semibold">Members</th><th className="px-3 text-right font-semibold">People</th><th className="px-3 text-right font-semibold">Recordings</th><th className="px-3 text-right font-semibold">30 days</th><th className="px-3 text-right font-semibold">Credits</th><th className="px-3 text-right font-semibold">Spent</th><th className="pl-3 font-semibold">Grant credits</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-3 pr-4"><span className="font-medium">{r.name}</span><span className="block text-xs text-muted">since {r.createdAt.toISOString().slice(0, 10)}</span></td>
                <td className="px-3 text-ink-2">{preset(r.industry)}</td>
                <td className="px-3 text-right tabular-nums">{r.members}</td>
                <td className="px-3 text-right tabular-nums">{r.people}</td>
                <td className="px-3 text-right tabular-nums">{r.recordings}</td>
                <td className="px-3 text-right tabular-nums">{r.recordings30}</td>
                <td className={`px-3 text-right font-semibold tabular-nums ${r.credits < 1 ? "text-danger" : ""}`}>{r.credits}</td>
                <td className="px-3 text-right tabular-nums">{money(r.spentCents, "usd", "en")}</td>
                <td className="pl-3"><GrantForm kind="workspace" id={r.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="mt-6 text-sm text-muted">No companies yet.</p>}
    </div>
  );
}
