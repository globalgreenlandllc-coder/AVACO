import Link from "next/link";
import { notFound } from "next/navigation";
import { BulkUpload } from "@/components/BulkUpload";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyField } from "@/components/CopyField";
import { Qr } from "@/components/Qr";
import { TeamMap } from "@/components/TeamMap";
import { fieldFits } from "@/lib/fit";
import { formatDate, getDict } from "@/lib/i18n";
import { baseUrl, currentUserId, orNotFound, presetOf } from "@/lib/page";
import { groupPeople, requireGroup } from "@/lib/workspaces";
import { deleteGroupAction, inviteAction } from "../../../actions";

export default async function GroupPage({ params }: { params: Promise<{ ws: string; group: string }> }) {
  const [{ ws: wsId, group: groupId }, userId, { t, locale }, origin] = await Promise.all([params, currentUserId(), getDict(), baseUrl()]);
  const { group, ws, role } = await orNotFound(requireGroup(userId, groupId));
  if (ws.id !== wsId) notFound();
  const people = await groupPeople(group.id);
  const o = t.org;
  const g = o.group;
  const preset = o.presets[presetOf(ws.industry)];
  const canManage = role !== "viewer";
  const openUrl = `${origin}/s/${group.openToken}`;
  const typeName = (key: string, fallback: string) => (Object.hasOwn(t.psytypes, key) ? (t.psytypes as Record<string, { name: string }>)[key].name : fallback);

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/w/${ws.id}`} className="text-sm text-muted hover:text-ink">← {ws.name}</Link>
        <p className="eyebrow mt-5">{preset.group}</p>
        <h1 className="mt-2 font-display text-5xl font-medium">{group.name}</h1>
      </div>

      {canManage && (
        <section className="grid gap-5 lg:grid-cols-3">
          <form action={inviteAction} className="card space-y-3 p-6">
            <h2 className="text-lg font-semibold">{g.invite}</h2>
            <p className="text-xs leading-relaxed text-muted">{g.inviteHelp}</p>
            <input type="hidden" name="ws" value={ws.id} /><input type="hidden" name="group" value={group.id} />
            <input name="name" required maxLength={120} placeholder={g.name} aria-label={g.name} className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm" />
            <input name="email" type="email" maxLength={200} placeholder={g.email} aria-label={g.email} className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm" />
            <button type="submit" className="btn w-full">{g.add}</button>
          </form>

          <div className="card space-y-3 p-6">
            <h2 className="text-lg font-semibold">{g.openLink}</h2>
            <p className="text-xs leading-relaxed text-muted">{g.openLinkHelp}</p>
            <div className="flex justify-center py-1"><Qr value={openUrl} label={g.openLink} size={132} /></div>
            <CopyField value={openUrl} copy={g.copy} copied={g.copied} />
          </div>

          <div className="card flex flex-col gap-3 p-6">
            <h2 className="text-lg font-semibold">{g.station}</h2>
            <p className="text-xs leading-relaxed text-muted">{g.stationHelp}</p>
            <Link href={`/s/${group.openToken}?station=1`} target="_blank" className="btn btn-quiet mt-auto">{g.openStation} ↗</Link>
          </div>

          <div className="card space-y-3 p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold">{g.upload}</h2>
            <p className="text-xs leading-relaxed text-muted">{g.uploadHelp}</p>
            <BulkUpload groupId={group.id} t={g} errors={t.record.errors} />
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-3xl font-medium">{preset.people}</h2>
        {people.length === 0 ? (
          <p className="card mt-6 p-8 text-center text-ink-2">{g.noPeople}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {people.map(({ participant: p, latest }) => {
              const status = latest ? latest.status : "invited";
              const top = latest?.status === "completed" ? latest.psytype?.[0] : undefined;
              const fit = latest?.status === "completed" && latest.psytype ? fieldFits(latest.psytype)[0] : undefined;
              const personal = `${origin}/r/${p.token}`;
              return (
                <li key={p.id} className="card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}{p.email && <span className="ml-2 text-xs font-normal text-muted">{p.email}</span>}</p>
                      <p className="mt-1 text-sm text-ink-2">
                        {g.status[status]}
                        {top && <> · {typeName(top.key, top.label)} {top.value}</>}
                        {fit && <> · {g.bestFit}: {t.deep.fit.fields[fit.key].name} {fit.score}</>}
                        {latest && <span className="text-muted"> · {formatDate(latest.created_at, locale)}</span>}
                      </p>
                    </div>
                    {latest && <Link href={`/w/${ws.id}/g/${group.id}/p/${p.id}`} className="btn btn-quiet px-5 py-2 text-sm">{g.view} →</Link>}
                  </div>
                  {!latest && canManage && <div className="mt-4"><CopyField value={personal} copy={g.copy} copied={g.copied} /></div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TeamMap people={people} t={t} />

      {role === "admin" && (
        <form action={deleteGroupAction} className="border-t border-line pt-8">
          <input type="hidden" name="ws" value={ws.id} /><input type="hidden" name="group" value={group.id} />
          <ConfirmSubmit label={g.deleteGroup} confirm={g.deleteGroupConfirm} />
        </form>
      )}
    </div>
  );
}
