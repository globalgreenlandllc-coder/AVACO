import Link from "next/link";
import { Trends } from "@/components/Trends";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { leadingTypes, psytypeRows } from "@/lib/report";
import { visitorId } from "@/lib/visitor";

export default async function ReportsPage() {
  const [userId, { locale, t }] = await Promise.all([visitorId(), getDict()]);
  const { data } = userId ? await gateway.listAnalyses(userId) : { data: [] };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl font-medium">{t.reports.title}</h1>
        <Link href="/record" className="btn">{t.nav.record}</Link>
      </div>

      {data.length === 0 ? (
        <p className="card mt-10 p-10 text-center text-ink-2">{t.reports.empty}</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {data.map((a) => {
            const rows = psytypeRows(a.psytype ?? [], t);
            const leaders = leadingTypes(rows);
            const summary = a.status !== "completed" || rows.length === 0 ? null
              : leaders.length > 0 ? `${t.reports.leading}: ${leaders.slice(0, 2).map((l) => l.name).join(", ")}`
              : t.reports.balanced;
            return (
              <li key={a.id}>
                <Link href={`/reports/${a.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-ink-2">
                  <div>
                    <p className="font-medium">{formatDate(a.created_at, locale)}</p>
                    {summary && <p className="mt-1 text-sm text-ink-2">{summary}</p>}
                  </div>
                  <span className="text-sm text-muted">{t.status[a.status]} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10">
        <Trends
          analyses={data}
          names={(key, fallback) => { const all = { ...t.psytypes, ...t.emostate } as Record<string, { name: string }>; return Object.hasOwn(all, key) ? all[key].name : fallback; }}
          title={t.org.person.trend}
          lead={t.org.person.trendLead.replace("{n}", String(data.filter((a) => a.status === "completed").length))}
        />
      </div>
    </div>
  );
}
