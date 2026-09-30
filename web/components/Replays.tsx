/**
 * Session replays for Admin → Statistics: the newest recordings from PostHog, each a click away, or the three steps
 * to set PostHog up when the keys aren't there yet.
 */
import { posthogConfig, recentReplays } from "@/lib/posthog";

const ago = (iso: string) => { const ms = Date.now() - new Date(iso).getTime(); return ms < 3_600_000 ? `${Math.max(1, Math.round(ms / 60_000))} min ago` : ms < 86_400_000 ? `${Math.round(ms / 3_600_000)} h ago` : `${Math.round(ms / 86_400_000)} d ago`; };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export async function Replays() {
  const cfg = posthogConfig();
  const { replays, ready, error } = await recentReplays(20);
  return (
    <section className="card p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Session replays</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Watch how visitors move through the landing page, sign-up, the recorder and credits: every click, scroll and pause, with anything typed masked.
            Report pages are never recorded, admins&apos; browsers never are, and visitors who refuse analytics cookies aren&apos;t either.
          </p>
        </div>
        {cfg?.projectId && <a href={`${cfg.app}/project/${cfg.projectId}/replay`} target="_blank" rel="noopener" className="btn btn-quiet !px-4 !py-2 text-sm">Open all replays in PostHog ↗</a>}
      </div>

      {!cfg && (
        <div className="mt-5 rounded-2xl border border-line p-5 text-sm leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">Not connected yet. Three steps, about ten minutes:</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Create a free account at <b>posthog.com</b> (US Cloud), and a project called AVOCO. Free tier: 5,000 recordings a month.</li>
            <li>In the project&apos;s Settings copy the <b>Project API key</b> (starts with phc_) and note the <b>Project ID</b> (the number in the address bar). Under your personal settings create a <b>Personal API key</b> (phx_) with the scope <i>session_recording: read</i>.</li>
            <li>In Vercel → avaco-web → Environment variables add <code>NEXT_PUBLIC_POSTHOG_KEY</code>, <code>NEXT_PUBLIC_POSTHOG_HOST</code> (https://us.i.posthog.com), <code>POSTHOG_PROJECT_ID</code> and <code>POSTHOG_API_KEY</code>, then redeploy. Recordings start with the next visitor.</li>
          </ol>
        </div>
      )}
      {cfg && !ready && <p className="mt-5 rounded-2xl border border-line p-5 text-sm text-ink-2">Recording is on. To list the replays here as well, add <code>POSTHOG_PROJECT_ID</code> and <code>POSTHOG_API_KEY</code> (a personal key with <i>session_recording: read</i>) in Vercel.</p>}
      {error && <p className="mt-5 rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger">Couldn&apos;t read the replays: {error}</p>}
      {ready && !error && (
        replays.length === 0 ? <p className="mt-5 text-sm text-muted">No recordings yet. They appear here a minute or two after a visit.</p> : (
          <ul className="mt-5 divide-y divide-line text-sm">
            {replays.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="w-20 shrink-0 text-xs tabular-nums text-muted">{ago(r.startedAt)}</span>
                <span className="w-12 shrink-0 tabular-nums font-semibold">{clock(r.seconds)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.startUrl ? new URL(r.startUrl).pathname : "–"}{r.person ? <span className="ml-2 text-xs text-muted">visitor {r.person.slice(0, 10)}</span> : null}</span>
                <span className="text-xs text-muted">{r.clicks} clicks{r.errors ? ` · ${r.errors} errors` : ""}{r.viewed ? " · seen" : ""}</span>
                <a href={r.url} target="_blank" rel="noopener" className="btn !px-4 !py-1.5 text-sm">▶ Watch</a>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
