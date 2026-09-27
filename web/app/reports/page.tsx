import Link from "next/link";
import { Trends } from "@/components/Trends";
import { fullAccessIds } from "@/lib/billing";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { stageOf } from "@/lib/match-stage";
import { matchesFor, partnerAnalyses } from "@/lib/matches";
import { namesFor, peopleIn, personKey, reportsOf, type Person } from "@/lib/people";
import { leadingTypes, psytypeRows } from "@/lib/report";
import { visitorId } from "@/lib/visitor";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const [userId, { locale, t }, query] = await Promise.all([visitorId(), getDict(), searchParams]);
  const { data } = userId ? await gateway.listAnalyses(userId) : { data: [] };
  // Whose voice each report is (lib/people.ts). ?person= (empty) is the account holder, ?person=<name> someone they recorded.
  const names = userId ? await namesFor(userId) : new Map<string, string>();
  const people = peopleIn(data, names);
  const many = people.length > 1;
  const chosen = query.person === undefined ? null : people.find((p) => p.key === personKey(query.person)) ?? null;
  const shown = chosen ? reportsOf(data, names, chosen.key) : data;
  const label = (p: Pick<Person, "key" | "name">) => (p.key === "" ? t.people.me : p.name ?? "");
  const someone = chosen && chosen.key !== "" && chosen.name ? chosen.name : null;
  // A report not opened yet is a preview here too: no type in the list, and no scores in the trends.
  const open = userId ? await fullAccessIds(userId, data.map((a) => a.id)).catch(() => new Set<string>()) : new Set<string>();
  const opened = data.filter((a) => open.has(a.id));
  // Trends read one person, never a mix of voices: the one chosen, or else the account holder.
  const trendPerson = chosen ?? people.find((p) => p.key === "") ?? people[0];
  const trendSet = trendPerson ? reportsOf(opened, names, trendPerson.key) : opened;

  // Relationship matches, each with where the partner is; a finished one the person hasn't opened yet is marked new.
  const when = (d: Date | string | null | undefined) => (d ? formatDate(typeof d === "string" ? d : d.toISOString(), locale) : "");
  const matchRows = await Promise.all((userId ? await matchesFor(userId).catch(() => []) : []).map(async (m) => {
    const partner = await partnerAnalyses(m).catch(() => []);
    const stage = stageOf({ openedAt: m.partnerOpenedAt, startedAt: m.partnerStartedAt, analyses: partner });
    const ready = stage === "ready";
    return {
      id: m.id, unseen: ready && !m.ownerSeenAt, unfinished: !ready,
      title: t.match.list.pair.replace("{a}", m.ownerName).replace("{b}", m.partnerName),
      text: ready ? t.match.list.ready : t.match.stages[stage].replace("{when}", when(partner[0]?.created_at ?? m.partnerOpenedAt)).replace(" · {type} {value}", ""),
      status: ready ? t.match.ready : t.match.waiting.replace("{name}", m.partnerName),
    };
  }));

  return (
    <div>
      {/* Paid couple's reports still waiting for the partner come first: nothing paid for should look lost. */}
      {matchRows.some((r) => r.unfinished) && (
        <section className="cover offer-cover offer-match mb-10 px-7 py-8 sm:px-10" aria-label={t.match.unfinishedTitle}>
          <p className="cover-eyebrow">{t.match.unfinishedTitle}</p>
          <ul className="mt-2 divide-y divide-line">
            {matchRows.filter((r) => r.unfinished).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm"><span className="font-semibold">{r.title}</span> <span className="text-ink-2">· {t.match.unfinishedText.replace("{stage}", r.text)}</span></span>
                <Link href={`/match/${r.id}`} className="btn !px-5 !py-2">{t.match.continue} →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl font-medium">{t.reports.title}</h1>
        <Link href={someone ? `/record?person=${encodeURIComponent(someone)}` : "/record"} className="btn">{someone ? t.people.recordFor.replace("{name}", someone) : t.nav.record}</Link>
      </div>
      {many && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={t.people.whoseTitle}>
          <Link href="/reports" className={`pill ${chosen ? "pill-off" : "pill-on"}`}>{t.people.everyone} · {data.length}</Link>
          {people.map((p) => <Link key={p.key} href={`/reports?person=${p.key === "" ? "" : encodeURIComponent(p.name ?? "")}`} className={`pill ${chosen?.key === p.key ? "pill-on" : "pill-off"}`}>{label(p)} · {p.count}</Link>)}
        </nav>
      )}

      {data.length === 0 ? (
        <p className="card mt-10 p-10 text-center text-ink-2">{t.reports.empty}</p>
      ) : (
        <ul className="mt-10 space-y-3">
          {shown.map((a) => {
            const rows = psytypeRows(a.psytype ?? [], t);
            const leaders = leadingTypes(rows);
            const summary = a.status !== "completed" || rows.length === 0 ? null
              : !open.has(a.id) ? t.reports.locked
              : leaders.length > 0 ? `${t.reports.leading}: ${leaders.slice(0, 2).map((l) => l.name).join(", ")}`
              : t.reports.balanced;
            return (
              <li key={a.id}>
                <Link href={`/reports/${a.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-ink-2">
                  <div>
                    <p className="font-medium">{many && !chosen && <span className="font-semibold">{label({ key: personKey(names.get(a.id)), name: names.get(a.id) ?? null })} · </span>}{formatDate(a.created_at, locale)}</p>
                    {summary && <p className="mt-1 text-sm text-ink-2">{summary}</p>}
                  </div>
                  <span className="text-sm text-muted">{t.status[a.status]} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {matchRows.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl font-medium">{t.match.list.title}</h2>
          <ul className="mt-5 space-y-3">
            {matchRows.map((r) => (
              <li key={r.id}>
                <Link href={`/match/${r.id}`} className={`card flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-ink-2 ${r.unseen ? "border-accent" : ""}`}>
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="mt-1 text-sm text-ink-2">{r.text}</p>
                  </div>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    {r.unseen && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-ink">{t.match.list.new}</span>}
                    {r.status} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <Trends
          analyses={trendSet}
          names={(key, fallback) => { const all = { ...t.psytypes, ...t.emostate } as Record<string, { name: string }>; return Object.hasOwn(all, key) ? all[key].name : fallback; }}
          title={many && trendPerson ? t.people.trendFor.replace("{name}", label(trendPerson)) : t.org.person.trend}
          lead={t.org.person.trendLead.replace("{n}", String(trendSet.filter((a) => a.status === "completed").length))}
        />
      </div>
    </div>
  );
}
