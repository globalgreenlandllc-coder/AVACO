"use client";
/**
 * Live traffic for Admin → Statistics: who is on the site right now, on a world map coloured by where each visitor came
 * from, visitors per minute over the last hour, and the page views as they happen. Asks /api/admin/live every two
 * seconds while the tab is visible, and at once when the tab comes back into view.
 */
import { useEffect, useRef, useState } from "react";
import { Bars } from "./AdminCharts";
import { LiveMap } from "./LiveMap";
import { pageName, PLATFORM_NAMES, platformColor, type Live } from "@/lib/visits-math";

const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐");
const ago = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)}m` : `${Math.round(ms / 3_600_000)}h`);
const name = (source: string) => PLATFORM_NAMES[source] ?? source;

/** `replayPerson`: PostHog's person page address, when replays are set up (lib/posthog.ts); a pin's card then links to that visitor's recordings. */
export function LiveTraffic({ replayPerson = null }: { replayPerson?: string | null }) {
  const [data, setData] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  /** Who the map shows: the last 5 minutes, half hour or hour. */
  const [span, setSpan] = useState(30);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        const res = await fetch("/api/admin/live", { cache: "no-store" }).catch(() => null);
        if (res?.ok) { setData(await res.json()); setFailed(false); } else setFailed(true);
      }
      if (!stopped) timer = setTimeout(tick, 2000);
    };
    void tick();
    // Back to the tab: fresh numbers now, not at the next tick.
    const onShow = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void tick(); } };
    document.addEventListener("visibilitychange", onShow);
    const second = setInterval(() => setClock(Date.now()), 1000);
    return () => { stopped = true; clearTimeout(timer); clearInterval(second); document.removeEventListener("visibilitychange", onShow); };
  }, []);

  const onMap = (data?.visitors ?? []).filter((v) => clock - v.lastAt <= span * 60_000);

  // Full screen: the map as large as the screen allows, with its numbers and the feed beside it (below it on a phone).
  // The browser's own full screen where it has one; elsewhere (an iPhone) the panel simply covers the page.
  const [fullScreen, setFullScreen] = useState(false);
  const shell = useRef<HTMLElement>(null);
  const enter = () => { setFullScreen(true); void shell.current?.requestFullscreen?.().catch(() => undefined); };
  const exit = () => { setFullScreen(false); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };
  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") exit(); };
    // Leaving the browser's full screen (its own Esc) leaves ours too.
    const onChange = () => { if (!document.fullscreenElement) setFullScreen(false); };
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onChange); };
  }, [fullScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  const spans = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {[[5, "Now · 5 min"], [30, "30 min"], [60, "1 hour"]].map(([m, label]) => (
        <button key={m} type="button" onClick={() => setSpan(m as number)} className={`pill !px-3 !py-1 text-xs ${span === m ? "pill-on" : "pill-off"}`}>{label}</button>
      ))}
      <span className="text-xs text-muted">{onMap.length} {onMap.length === 1 ? "visitor" : "visitors"} on the map</span>
    </div>
  );
  const activeNow = (
    <div className="flex items-end gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Active now</p>
        <p className="text-6xl font-semibold tabular-nums leading-none">{data?.active ?? "–"}</p>
      </div>
      <div className="pb-2 text-sm text-ink-2">
        <p><b className="tabular-nums text-ink">{data?.visitors30 ?? "–"}</b> visitors, <b className="tabular-nums text-ink">{data?.views30 ?? "–"}</b> views</p>
        <p className="text-xs text-muted">in the last 30 minutes</p>
      </div>
    </div>
  );
  const comingFrom = (
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
  );
  const onPages = data && data.pages.length > 0 && (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">On these pages now</p>
      <ul className="mt-2 space-y-1 text-sm">{data.pages.map((p) => <li key={p.path} className="flex justify-between gap-3"><span className="truncate">{pageName(p.path)}</span><span className="font-semibold tabular-nums">{p.visitors}</span></li>)}</ul>
    </div>
  );
  const perMinute = (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Visitors per minute · last hour</p>
      <Bars
        height={70}
        format={String}
        ariaLabel="Visitors per minute over the last hour"
        items={(data?.perMinute ?? Array.from({ length: 60 }, () => 0)).map((v, i, all) => ({ key: String(i), value: v, axis: i === 0 ? "−60 min" : i === 30 ? "−30 min" : i === all.length - 1 ? "now" : "", title: `${60 - i} min ago: ${v}`, labelled: i === all.length - 1 }))}
      />
    </div>
  );
  const feed = (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">As it happens</p>
      {data && data.feed.length > 0 ? (
        <ul className="divide-y divide-line text-sm">
          {data.feed.map((f) => (
            <li key={`${f.at}-${f.path}-${f.key}`} onClick={() => setSelected(f.key)} title="Show on the map" className={`live-in flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-1 py-2 hover:bg-accent-soft ${selected === f.key ? "bg-accent-soft" : ""}`}>
              <span className="w-10 shrink-0 text-xs tabular-nums text-muted">{ago(clock - f.at)}</span>
              <span aria-hidden>{flag(f.country)}</span>
              <span className="min-w-24 text-ink-2">{f.city ?? f.country ?? "Somewhere"}</span>
              <span className="font-medium">{pageName(f.path)}</span>
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
  );

  return (
    <section ref={shell} className={fullScreen ? "fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-bg p-4 sm:p-5 lg:overflow-hidden" : "card overflow-hidden p-6 sm:p-7"} aria-label="Live traffic">
      <style>{`@keyframes live-ping{0%{transform:scale(1);opacity:.75}100%{transform:scale(3.4);opacity:0}}.live-ping{transform-box:fill-box;transform-origin:center;animation:live-ping 1.8s ease-out infinite}@keyframes live-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}.live-in{animation:live-in .5s ease-out both}@media (prefers-reduced-motion: reduce){.live-ping,.live-in{animation:none}}`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <span className="relative grid h-3 w-3 place-items-center" aria-hidden><span className="breathe absolute inset-0 rounded-full" style={{ background: "#e5484d" }} /><span className="relative h-2 w-2 rounded-full" style={{ background: "#e5484d" }} /></span>
          <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "#e5484d" }}>Live</span>
          <span className="font-semibold">Traffic right now</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-muted">{failed ? "Can't reach the live feed; retrying…" : data ? `Updated ${ago(clock - data.now)} ago · every 2 seconds` : "Connecting…"}</p>
          {fullScreen
            ? <button type="button" onClick={exit} className="btn btn-quiet !px-4 !py-1.5 text-sm" title="Esc">✕ Exit full screen</button>
            : <button type="button" onClick={enter} className="btn btn-quiet !px-4 !py-1.5 text-sm">⤢ Full screen</button>}
        </div>
      </div>

      {fullScreen ? (
        <div className="mt-4 flex flex-col gap-5 lg:min-h-0 lg:flex-1 lg:flex-row">
          <div className="flex h-[62vh] min-w-0 flex-col lg:h-auto lg:min-h-0 lg:flex-1">
            {spans}
            <div className="min-h-0 flex-1">
              <LiveMap visitors={onMap} now={clock} selected={selected} onSelect={setSelected} replayPerson={replayPerson} fill />
            </div>
          </div>
          <aside className="shrink-0 space-y-6 lg:min-h-0 lg:w-[24rem] lg:overflow-y-auto lg:pr-1">
            {activeNow}
            {comingFrom}
            {onPages}
            {perMinute}
            {feed}
          </aside>
        </div>
      ) : (
        <>
          <div className="mt-5">
            {spans}
            <LiveMap visitors={onMap} now={clock} selected={selected} onSelect={setSelected} replayPerson={replayPerson} />
          </div>
          <div className="mt-6 grid items-start gap-6 sm:grid-cols-3">
            {activeNow}
            {comingFrom}
            {onPages}
          </div>
          <div className="mt-6">{perMinute}</div>
          <div className="mt-6">{feed}</div>
        </>
      )}
    </section>
  );
}
