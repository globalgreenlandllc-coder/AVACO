import { RankBars } from "./AdminCharts";
import type { Stats } from "@/lib/visits-math";

const rate = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const th = "px-3 py-2 text-right font-semibold";
const td = "px-3 text-right tabular-nums";
const GROUPS = { ads: "From ads", others: "Everyone else" } as const;
const SECONDS = ["under 3 s", "3–9 s", "10–29 s", "30 s or more"];
const SHADES = ["var(--track)", "color-mix(in oklab, var(--accent) 35%, var(--track))", "color-mix(in oklab, var(--accent) 70%, var(--track))", "var(--accent)"];

/**
 * Admin → Statistics, "What people do on the landing page": for the sessions that began there, how long the page was
 * on screen, how far it was scrolled, what was tapped and whether another page followed, from ads and from elsewhere;
 * then Meta's placements. From the beacon's follow-ups (components/VisitBeacon.tsx).
 */
export function EngagementReport({ v }: { v: Stats }) {
  const measured = v.engagement.some((g) => g.sessions > 0);
  return (
    <section className="card p-7">
      <h2 className="mb-1 text-lg font-semibold">What people do on the landing page</h2>
      <p className="mb-6 max-w-3xl text-xs leading-relaxed text-muted">
        Sessions that began on the landing page, last 30 days, since this started being measured on 30 September 2026. A session counts as
        gone within 5 seconds until the page reports otherwise, so an ad tap that closes before the page shows is counted there too.
      </p>
      {!measured ? <p className="text-sm text-muted">Nothing measured yet: the numbers appear with the next visits.</p> : (
        <div className="space-y-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted">
                <tr><th className="py-2 pr-3 font-semibold">Visitors</th><th className={th}>Sessions</th><th className={th}>Stayed 5 s+</th><th className={th}>Stayed 15 s+</th><th className={th}>Scrolled half</th><th className={th}>Tapped</th><th className={th}>Next page</th><th className={th}>Median</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {v.engagement.map((g) => (
                  <tr key={g.group}>
                    <td className="py-3 pr-3">
                      <span className="font-medium">{GROUPS[g.group]}</span>
                      {g.sessions > 0 && (
                        <span className="mt-2 flex h-2 w-full overflow-hidden rounded-full" title={g.seconds.map((n, i) => `${SECONDS[i]}: ${n}`).join(" · ")}>
                          {g.seconds.map((n, i) => <span key={SECONDS[i]} style={{ width: `${(n / g.sessions) * 100}%`, background: SHADES[i] }} />)}
                        </span>
                      )}
                    </td>
                    <td className={td}>{g.sessions}</td>
                    <td className={td}>{rate(g.stayed5, g.sessions)}</td>
                    <td className={td}>{rate(g.stayed15, g.sessions)}</td>
                    <td className={td}>{rate(g.scrolledHalf, g.sessions)}</td>
                    <td className={td}>{rate(g.tapped, g.sessions)}</td>
                    <td className={td}>{rate(g.movedOn, g.sessions)}</td>
                    <td className={td}>{g.medianSeconds === null ? "–" : `${g.medianSeconds} s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              Time on screen:{SECONDS.map((label, i) => <span key={label} className="inline-flex items-center gap-1.5"><span aria-hidden className="inline-block h-2 w-3 rounded-sm" style={{ background: SHADES[i] }} />{label}</span>)}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="min-w-0">
              <p className="eyebrow mb-4">What they tapped</p>
              <RankBars rows={v.landingTaps.map((x) => ({ label: x.label, value: x.count }))} empty="Nothing tapped yet." />
            </div>
            <div className="min-w-0">
              <p className="eyebrow mb-4">Meta placements</p>
              {v.placements.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  None yet. The Meta link above now carries <code>utm_term={"{{placement}}"}</code>: put it in the ads&apos; URL parameters to see which placements
                  (feed, stories, reels, Audience Network) bring people who stay.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[24rem] text-left text-sm">
                    <thead className="text-xs uppercase tracking-widest text-muted">
                      <tr><th className="py-2 pr-3 font-semibold">Placement</th><th className={th}>Sessions</th><th className={th}>Stayed 5 s+</th><th className={th}>Tapped</th><th className={th}>Next page</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {v.placements.map((p) => (
                        <tr key={p.placement}>
                          <td className="py-2.5 pr-3 font-medium">{p.placement.replace(/_/g, " ")}</td>
                          <td className={td}>{p.sessions}</td><td className={td}>{rate(p.stayed5, p.sessions)}</td><td className={td}>{rate(p.tapped, p.sessions)}</td><td className={td}>{rate(p.movedOn, p.sessions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
