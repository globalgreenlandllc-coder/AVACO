"use client";
/**
 * Live traffic for Admin → Statistics: who is on the site right now, on a world map coloured by where each visitor came
 * from, visitors per minute over the last hour, and the page views as they happen. Asks /api/admin/live every five
 * seconds while the tab is visible.
 */
import { useEffect, useMemo, useState } from "react";
import { Bars } from "./AdminCharts";
import { WORLD_ROWS, WORLD_STEP, WORLD_TOP } from "@/lib/world-dots";
import { PLATFORM_NAMES, platformColor, type Live } from "@/lib/visits-math";

const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐");
const ago = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 3_600_000)}h`);
const name = (source: string) => PLATFORM_NAMES[source] ?? source;

export function LiveTraffic() {
  const [data, setData] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        const res = await fetch("/api/admin/live", { cache: "no-store" }).catch(() => null);
        if (res?.ok) { setData(await res.json()); setFailed(false); } else setFailed(true);
      }
      if (!stopped) timer = setTimeout(tick, 5000);
    };
    void tick();
    const second = setInterval(() => setClock(Date.now()), 1000);
    return () => { stopped = true; clearTimeout(timer); clearInterval(second); };
  }, []);

  // The land, drawn once: one path of small dots.
  const land = useMemo(() => {
    let d = "";
    WORLD_ROWS.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== "1") continue;
        const x = c * WORLD_STEP + WORLD_STEP / 2, y = r * WORLD_STEP + WORLD_STEP / 2;
        d += `M${x - 0.95},${y}a0.95,0.95 0 1,0 1.9,0a0.95,0.95 0 1,0 -1.9,0`;
      }
    });
    return d;
  }, []);
  const height = WORLD_ROWS.length * WORLD_STEP;
  const shown = [...new Set((data?.dots ?? []).map((d) => d.source))];

  return (
    <section className="card overflow-hidden p-6 sm:p-7" aria-label="Live traffic">
      <style>{`@keyframes live-ping{0%{transform:scale(1);opacity:.75}100%{transform:scale(3.4);opacity:0}}.live-ping{transform-box:fill-box;transform-origin:center;animation:live-ping 1.8s ease-out infinite}@keyframes live-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}.live-in{animation:live-in .5s ease-out both}@media (prefers-reduced-motion: reduce){.live-ping,.live-in{animation:none}}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <span className="relative grid h-3 w-3 place-items-center" aria-hidden><span className="breathe absolute inset-0 rounded-full" style={{ background: "#e5484d" }} /><span className="relative h-2 w-2 rounded-full" style={{ background: "#e5484d" }} /></span>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#e5484d" }}>Live</span>
          <span className="font-semibold">Traffic right now</span>
        </p>
        <p className="text-xs text-muted">{failed ? "Can't reach the live feed; retrying…" : data ? `Updated ${ago(clock - data.now)} ago · every 5 seconds` : "Connecting…"}</p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <svg viewBox={`0 0 360 ${height}`} className="w-full" role="img" aria-label={`World map: ${data?.dots.length ?? 0} visitors in the last 30 minutes, ${data?.active ?? 0} active now.`}>
            <path d={land} fill="color-mix(in oklab, var(--ink-2) 20%, transparent)" />
            {(data?.dots ?? []).map((d, i) => {
              const x = d.lon + 180, y = WORLD_TOP - d.lat;
              const colour = platformColor(d.source);
              return (
                <g key={`${i}-${x}-${y}`}>
                  {d.active && <circle cx={x} cy={y} r={2.4} fill={colour} className="live-ping" style={{ animationDelay: `${(i % 6) * 0.3}s` }} />}
                  <circle cx={x} cy={y} r={d.active ? 2.4 : 1.7} fill={colour} opacity={d.active ? 1 : 0.45} stroke="var(--surface)" strokeWidth={0.5}>
                    <title>{`${d.city ? `${d.city}, ` : ""}${d.country ?? ""} · ${name(d.source)}${d.active ? " · active now" : ""}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>
          {shown.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
              {shown.map((s) => <span key={s} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: platformColor(s) }} aria-hidden />{name(s)}</span>)}
              <span className="text-muted">Bright dots: active in the last 5 minutes</span>
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">Active now</p>
              <p className="font-display text-6xl font-medium tabular-nums">{data?.active ?? "–"}</p>
            </div>
            <div className="pb-2 text-sm text-ink-2">
              <p><b className="tabular-nums text-ink">{data?.visitors30 ?? "–"}</b> visitors, <b className="tabular-nums text-ink">{data?.views30 ?? "–"}</b> views</p>
              <p className="text-xs text-muted">in the last 30 minutes</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Coming from · 30 min</p>
            {data && data.sources.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm">
                {data.sources.map((s) => (
                  <li key={s.source} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: platformColor(s.source) }} aria-hidden />{name(s.source)}{s.paid > 0 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">{s.paid} from ads</span>}</span>
                    <span className="font-semibold tabular-nums">{s.visitors}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-muted">Nobody in the last 30 minutes.</p>}
          </div>
          {data && data.pages.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">On these pages now</p>
              <ul className="mt-2 space-y-1 text-sm">{data.pages.map((p) => <li key={p.path} className="flex justify-between gap-3"><span className="truncate">{p.path}</span><span className="font-semibold tabular-nums">{p.visitors}</span></li>)}</ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Visitors per minute · last hour</p>
        <Bars
          height={70}
          format={String}
          ariaLabel="Visitors per minute over the last hour"
          items={(data?.perMinute ?? Array.from({ length: 60 }, () => 0)).map((v, i, all) => ({ key: String(i), value: v, axis: i === 0 ? "−60 min" : i === 30 ? "−30 min" : i === all.length - 1 ? "now" : "", title: `${60 - i} min ago: ${v}`, labelled: i === all.length - 1 }))}
        />
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">As it happens</p>
        {data && data.feed.length > 0 ? (
          <ul className="divide-y divide-line text-sm">
            {data.feed.map((f) => (
              <li key={`${f.at}-${f.path}`} className="live-in flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="w-10 shrink-0 text-xs tabular-nums text-muted">{ago(clock - f.at)}</span>
                <span aria-hidden>{flag(f.country)}</span>
                <span className="min-w-24 text-ink-2">{f.city ?? f.country ?? "Somewhere"}</span>
                <span className="font-medium">{f.path}</span>
                <span className="ml-auto flex items-center gap-2 text-xs">
                  {f.landing && <span className="text-muted">arrived</span>}
                  {f.signedIn && <span className="text-muted">signed in</span>}
                  <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: "color-mix(in oklab, " + platformColor(f.source) + " 14%, transparent)", color: platformColor(f.source) }}>{name(f.source)}{f.paid ? " · ad" : ""}</span>
                  <span aria-label={f.device}>{f.device === "phone" ? "📱" : f.device === "tablet" ? "📲" : "💻"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No page views in the last hour yet.</p>}
      </div>
    </section>
  );
}
