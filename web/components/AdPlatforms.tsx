/**
 * The ad platforms for Admin → Statistics: for each, the visitors it brought in the last 30 days (from ads and not),
 * and how many of them signed up, recorded and paid. Each visitor is credited to the platform of their first visit.
 */
import type { Stats } from "@/lib/visits-math";
import { PLATFORM_NAMES, platformColor } from "@/lib/visits-math";

export function AdPlatforms({ platforms }: { platforms: Stats["platforms"] }) {
  const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
  return (
    <section className="card p-7">
      <h2 className="text-lg font-semibold">Your ad platforms · last 30 days</h2>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
        Each visitor is credited to the platform of their first visit and followed from there. &quot;From ads&quot; means a tagged ad link (utm_medium paid or cpc) or the platform&apos;s ad click id;
        visits from inside the Instagram, Facebook and TikTok apps count for them even when the app sends no address.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((p) => (
          <div key={p.platform} className="rounded-2xl border border-line p-5" style={{ borderTopWidth: 4, borderTopColor: platformColor(p.platform) }}>
            <p className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: platformColor(p.platform) }} aria-hidden />{PLATFORM_NAMES[p.platform] ?? p.platform}</p>
            <p className="mt-3 font-display text-4xl font-medium tabular-nums">{p.visitors}</p>
            <p className="text-xs text-ink-2">visitors · <b>{p.paid}</b> from ads · {p.organic} organic</p>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-track" role="img" aria-label={`${p.paid} from ads, ${p.organic} organic`}>
              <div style={{ width: `${p.visitors ? (p.paid / p.visitors) * 100 : 0}%`, background: platformColor(p.platform) }} />
              <div style={{ width: `${p.visitors ? (p.organic / p.visitors) * 100 : 0}%`, background: "color-mix(in oklab, " + platformColor(p.platform) + " 35%, transparent)" }} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Signed up", p.signups], ["Recorded", p.recorded], ["Bought", p.customers]].map(([label, n]) => (
                <div key={label as string} className="rounded-xl bg-accent-soft px-1 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{n}</dd>
                  <dd className="text-[10px] text-muted">{rate(n as number, p.visitors)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">{p.campaigns.length ? `Campaigns: ${p.campaigns.join(", ")}` : `${p.sessions} ${p.sessions === 1 ? "session" : "sessions"}`}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
