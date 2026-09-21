import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { currentUserId, presetOf } from "@/lib/page";
import { PRESETS } from "@/lib/presets";
import { myWorkspaces } from "@/lib/workspaces";
import { createWorkspaceAction } from "./actions";

export default async function WorkspacesPage() {
  const [userId, { t }] = await Promise.all([currentUserId(), getDict()]);
  const o = t.org;
  const list = await myWorkspaces(userId);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="font-display text-5xl font-medium">{o.list.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{o.list.lead}</p>
        {list.length === 0 ? (
          <p className="card mt-10 p-10 text-center text-ink-2">{o.list.empty}</p>
        ) : (
          <ul className="mt-10 space-y-3">
            {list.map((ws) => (
              <li key={ws.id}>
                <Link href={`/w/${ws.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-ink-2">
                  <div>
                    <p className="text-lg font-medium">{ws.name}</p>
                    <p className="mt-1 text-sm text-ink-2">{o.presets[presetOf(ws.industry)].name} · {o.list.role[ws.role]}</p>
                  </div>
                  <span className="text-sm text-muted">{o.list.open} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={createWorkspaceAction} className="card h-fit space-y-5 p-7">
        <h2 className="font-display text-2xl font-medium">{o.list.create}</h2>
        <label className="block text-sm">
          <span className="text-ink-2">{o.list.name}</span>
          <input name="name" required maxLength={80} className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2.5" />
        </label>
        <fieldset className="text-sm">
          <legend className="text-ink-2">{o.list.industry}</legend>
          <div className="mt-2 space-y-1">
            {PRESETS.map((key, i) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-track/50">
                <input type="radio" name="industry" value={key} defaultChecked={i === 0} className="mt-1 accent-[var(--accent)]" />
                <span><span className="font-medium">{o.presets[key].name}</span><span className="block text-xs leading-relaxed text-muted">{o.presets[key].hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn w-full">{o.list.create}</button>
      </form>
    </div>
  );
}
