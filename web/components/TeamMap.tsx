import type { Dict } from "@/lib/i18n";
import type { PersonRow } from "@/lib/workspaces";
import { zoneOf } from "@/lib/report";

/** Who leads with which type. A person sits under their strongest type; their other leading or active types are noted beside the name. */
export function TeamMap({ people, t }: { people: PersonRow[]; t: Dict }) {
  const ready = people.filter((p) => p.latest?.status === "completed" && p.latest.psytype?.length);
  if (ready.length < 2) return null;
  const o = t.org.group;
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? (t.psytypes as Record<string, { name: string }>)[key].name : key);

  const columns = Object.keys(t.psytypes).map((type) => ({
    type,
    members: ready.filter((p) => p.latest!.psytype![0].key === type).map((p) => ({
      id: p.participant.id,
      name: p.participant.name,
      value: p.latest!.psytype![0].value,
      also: p.latest!.psytype!.slice(1).filter((x) => zoneOf(x.value) !== "background").map((x) => typeName(x.key)),
    })),
  }));
  const most = Math.max(...columns.map((c) => c.members.length));

  return (
    <section className="card p-8 sm:p-10">
      <h2 className="font-display text-3xl font-medium">{o.teamMap}</h2>
      <p className="mt-2 text-sm text-ink-2">{o.teamMapLead}</p>
      <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {columns.map((c) => (
          <li key={c.type}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{typeName(c.type)}</span>
              <span className="font-semibold tabular-nums">{c.members.length}</span>
            </div>
            <div className="mt-2 h-2 rounded-r-full bg-track" role="img" aria-label={`${typeName(c.type)}: ${c.members.length}`}>
              <div className="h-full rounded-r-full" style={{ width: `${most ? (c.members.length / most) * 100 : 0}%`, background: "var(--bar-leading)" }} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {c.members.length === 0 ? <span className="text-muted">{o.nobody}</span> : c.members.map((m, i) => (
                <span key={m.id}>{i > 0 && ", "}{m.name} <span className="text-xs text-muted">{m.value}{m.also.length ? ` · ${o.activeToo}: ${m.also.join(", ")}` : ""}</span></span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
