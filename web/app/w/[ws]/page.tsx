import Link from "next/link";
import { ApiKeyBox } from "@/components/ApiKeyBox";
import { BuyCredits } from "@/components/BuyCredits";
import { CopyField } from "@/components/CopyField";
import { asWorkspace, balance, getSettings } from "@/lib/billing";
import { getDict } from "@/lib/i18n";
import { packViews } from "@/lib/money";
import { stripeReady } from "@/lib/stripe";
import { baseUrl, currentUserId, orNotFound, presetOf, userLabels } from "@/lib/page";
import { PRESETS, PRESET_RULES } from "@/lib/presets";
import { listGroups, listMembers, monthlyLimit, requireMember, usageThisMonth } from "@/lib/workspaces";
import { createGroupAction, rotateJoinCodeAction, setRoleAction, updateWorkspaceAction } from "../actions";

export default async function WorkspacePage({ params }: { params: Promise<{ ws: string }> }) {
  const [{ ws: wsId }, userId, { t, locale }, origin] = await Promise.all([params, currentUserId(), getDict(), baseUrl()]);
  const { ws, role } = await orNotFound(requireMember(userId, wsId));
  const [groupList, memberList, used] = await Promise.all([listGroups(userId, wsId), listMembers(userId, wsId), usageThisMonth(wsId)]);
  const [cfg, credits] = await Promise.all([getSettings(), balance(asWorkspace(wsId))]);
  const labels = await userLabels(memberList.map((m) => m.userId));
  const o = t.org;
  const preset = o.presets[presetOf(ws.industry)];
  const canManage = role !== "viewer";
  const isAdmin = role === "admin";

  return (
    <div className="space-y-12">
      <div>
        <Link href="/w" className="text-sm text-muted hover:text-ink">← {o.list.title}</Link>
        <h1 className="mt-4 font-display text-5xl font-medium">{ws.name}</h1>
        <p className="mt-2 text-sm text-ink-2">{preset.name} · {o.ws.usage}: {o.ws.usageOf.replace("{used}", String(used)).replace("{limit}", String(monthlyLimit()))}</p>
      </div>

      <section>
        <h2 className="font-display text-3xl font-medium">{preset.group}</h2>
        {canManage && (
          <form action={createGroupAction} className="mt-5 flex flex-wrap gap-3">
            <input type="hidden" name="ws" value={ws.id} />
            <input name="name" required maxLength={120} placeholder={preset.groupExample} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm" aria-label={preset.group} />
            <button type="submit" className="btn">{o.ws.newGroup}</button>
          </form>
        )}
        {groupList.length === 0 ? (
          <p className="card mt-6 p-8 text-center text-ink-2">{o.ws.noGroups}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {groupList.map((g) => (
              <li key={g.id}>
                <Link href={`/w/${ws.id}/g/${g.id}`} className="card flex items-center justify-between gap-4 p-5 transition-colors hover:border-ink-2">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-sm text-muted">{o.ws.peopleCount.replace("{n}", String(g.people))} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {cfg.enabled && (
        <section className="card space-y-5 p-7 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-medium">{t.billing.workspace.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{t.billing.workspace.lead}</p>
            </div>
            <p className="font-display text-6xl font-medium tabular-nums">{credits}</p>
          </div>
          {credits < 1 ? <p role="status" className="rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">{t.billing.workspace.none}</p>
            : credits <= 5 ? <p role="status" className="rounded-xl border border-line px-4 py-3 text-sm text-ink-2">{t.billing.workspace.low.replace("{n}", String(credits))}</p> : null}
          {isAdmin && <BuyCredits packs={packViews(cfg.packs.filter((p) => p.audience === "workspace"), cfg.currency, locale)} canPay={await stripeReady()} t={t.billing} workspaceId={ws.id} />}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5 p-7">
          <h2 className="font-display text-2xl font-medium">{o.ws.members}</h2>
          <ul className="divide-y divide-line text-sm">
            {memberList.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="truncate text-ink-2">{labels.get(m.userId) ?? m.userId}{m.userId === userId ? ` (${o.ws.you})` : ""}</span>
                {isAdmin && m.userId !== userId ? (
                  <form action={setRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="ws" value={ws.id} /><input type="hidden" name="member" value={m.userId} />
                    <select name="role" defaultValue={m.role} className="rounded-lg border border-line bg-bg px-2 py-1.5 text-xs">
                      {(["viewer", "manager", "admin"] as const).map((r) => <option key={r} value={r}>{o.list.role[r]}</option>)}
                      <option value="remove">{o.ws.remove}</option>
                    </select>
                    <button type="submit" className="btn btn-quiet px-3 py-1.5 text-xs">{o.ws.save}</button>
                  </form>
                ) : <span className="text-xs text-muted">{o.list.role[m.role]}</span>}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <div className="space-y-2 border-t border-line pt-5">
              <p className="text-sm font-medium">{o.ws.joinLink}</p>
              <p className="text-xs leading-relaxed text-muted">{o.ws.joinLinkHelp}</p>
              <CopyField value={`${origin}/join/${ws.joinCode}`} copy={o.group.copy} copied={o.group.copied} />
              <form action={rotateJoinCodeAction}><input type="hidden" name="ws" value={ws.id} /><button type="submit" className="text-xs text-muted underline underline-offset-4 hover:text-ink">{o.ws.rotate}</button></form>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="space-y-6">
            <form action={updateWorkspaceAction} className="card space-y-4 p-7">
              <h2 className="font-display text-2xl font-medium">{o.ws.settings}</h2>
              <input type="hidden" name="ws" value={ws.id} />
              <label className="block text-sm"><span className="text-ink-2">{o.list.name}</span>
                <input name="name" required maxLength={80} defaultValue={ws.name} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5" /></label>
              <label className="block text-sm"><span className="text-ink-2">{o.list.industry}</span>
                <select name="industry" defaultValue={presetOf(ws.industry)} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5">
                  {PRESETS.map((key) => <option key={key} value={key}>{o.presets[key].name}</option>)}
                </select></label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" name="hideEmotions" defaultChecked={ws.hideEmotions} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                <span>{o.ws.hideEmotions}<span className="mt-1 block text-xs leading-relaxed text-muted">{o.ws.hideEmotionsHelp}{PRESET_RULES[presetOf(ws.industry)].suggestHideEmotions ? " ★" : ""}</span></span>
              </label>
              <button type="submit" className="btn btn-quiet">{o.ws.save}</button>
            </form>

            <div className="card space-y-3 p-7">
              <h2 className="font-display text-2xl font-medium">{o.ws.api}</h2>
              <p className="text-sm leading-relaxed text-ink-2">{o.ws.apiHelp}</p>
              {ws.apiKeyPrefix && <p className="text-xs text-muted">{o.ws.apiCurrent.replace("{prefix}", `${ws.apiKeyPrefix}…`)}</p>}
              <ApiKeyBox wsId={ws.id} hasKey={Boolean(ws.apiKeyPrefix)} labels={{ create: o.ws.apiCreate, replace: o.ws.apiReplace, shown: o.ws.apiShown, copy: o.group.copy, copied: o.group.copied }} />
              <Link href="/docs/api" className="block text-sm text-accent underline underline-offset-4">{o.ws.apiDocs}</Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
