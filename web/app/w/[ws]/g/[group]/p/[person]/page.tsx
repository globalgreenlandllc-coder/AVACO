import { notFound } from "next/navigation";
import { Sections } from "@/components/Bars";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyField } from "@/components/CopyField";
import { ReportView } from "@/components/ReportView";
import { Trends } from "@/components/Trends";
import { publicReport } from "@/lib/api";
import { focusSections } from "@/lib/focus";
import { formatDate, getDict } from "@/lib/i18n";
import { baseUrl, currentUserId, orNotFound, presetOf } from "@/lib/page";
import { PRESET_RULES } from "@/lib/presets";
import { emostateRows, psytypeRows } from "@/lib/report";
import { personAnalyses, requireParticipant } from "@/lib/workspaces";
import { erasePersonAction } from "../../../../../actions";

export default async function PersonPage({ params }: { params: Promise<{ ws: string; group: string; person: string }> }) {
  const [{ ws: wsId, group: groupId, person: personId }, userId, { t, locale }, origin] = await Promise.all([params, currentUserId(), getDict(), baseUrl()]);
  const { participant, group, ws, role } = await orNotFound(requireParticipant(userId, personId));
  if (ws.id !== wsId || group.id !== groupId) notFound();

  const analyses = await personAnalyses(participant.id);
  const latest = analyses[0];
  if (!latest) notFound();

  const o = t.org;
  const preset = presetOf(ws.industry);
  const report = publicReport(latest, ws.hideEmotions);
  const names = (key: string, fallback: string) => {
    const all = { ...t.psytypes, ...t.emostate } as Record<string, { name: string }>;
    return Object.hasOwn(all, key) ? all[key].name : fallback;
  };
  const focus = latest.status === "completed"
    ? focusSections(preset, psytypeRows(latest.psytype ?? [], t), ws.hideEmotions ? [] : emostateRows(latest.emostate ?? [], t), t)
    : [];

  const lead = (
    <>
      <div>
        <h1 className="font-display text-5xl font-medium">{participant.name}</h1>
        <p className="mt-2 text-sm text-ink-2">{o.person.sharedBy.replace("{name}", participant.name).replace("{company}", ws.name)}</p>
      </div>
      {PRESET_RULES[preset].decisionNotice && <p className="rounded-xl border border-line px-5 py-4 text-sm leading-relaxed text-ink-2">{o.person.decisionNotice}</p>}
      {focus.length > 0 && (
        <section className="card border-accent/40 p-8 sm:p-10">
          <p className="eyebrow">{o.person.focus.replace("{industry}", o.presets[preset].name)}</p>
          <div className="mt-5 grid gap-x-12 gap-y-6 sm:grid-cols-2"><Sections sections={focus} /></div>
        </section>
      )}
    </>
  );

  return (
    <div className="space-y-8">
      <ReportView
        initial={report}
        recordedOn={formatDate(latest.created_at, locale)}
        t={t}
        pollUrl={`/api/w/people/${participant.id}/report?a=${latest.id}`}
        deleteUrl={null}
        back={{ href: `/w/${ws.id}/g/${group.id}`, label: o.person.back }}
        lead={lead}
        hideEmotions={ws.hideEmotions}
      />

      <Trends analyses={analyses.map((a) => ({ ...a, emostate: ws.hideEmotions ? null : a.emostate }))} names={names} title={o.person.trend} lead={o.person.trendLead.replace("{n}", String(analyses.filter((a) => a.status === "completed").length))} />

      {role !== "viewer" && (
        <section className="no-print space-y-5 border-t border-line pt-8">
          <div className="max-w-xl space-y-2">
            <p className="text-sm font-medium">{o.person.recordAgain}</p>
            <CopyField value={`${origin}/r/${participant.token}`} copy={o.group.copy} copied={o.group.copied} />
          </div>
          <form action={erasePersonAction}>
            <input type="hidden" name="ws" value={ws.id} /><input type="hidden" name="group" value={group.id} /><input type="hidden" name="person" value={participant.id} />
            <ConfirmSubmit label={o.group.erase} confirm={o.group.eraseConfirm} />
          </form>
        </section>
      )}
    </div>
  );
}
