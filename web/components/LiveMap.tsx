"use client";
/**
 * The live map: countries (Natural Earth 1:110m, projected once into public/maps/world-110m.json) tinted by how many
 * visitors each has, and a marker per place with its visitors, coloured by where they came from and pulsing while
 * active. Scroll, pinch or the buttons zoom; drag moves; a click on a marker opens who is there and what they did.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLATFORM_NAMES, platformColor, type LiveVisitor } from "@/lib/visits-math";

interface WorldMap { scale: number; translate: [number, number]; view: [number, number, number, number]; countries: Array<{ c: string | null; n: string; d: string }> }
interface View { x: number; y: number; w: number; h: number }
let mapFile: Promise<WorldMap> | null = null;
const loadMap = () => (mapFile ??= fetch("/maps/world-110m.json").then((r) => r.json() as Promise<WorldMap>));

const region = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const language = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "language" }) : null;
const countryName = (cc: string | null) => { try { return cc ? region?.of(cc) ?? cc : "Unknown country"; } catch { return cc ?? "Unknown country"; } };
const languageName = (code: string | null) => { try { return code ? language?.of(code) ?? code : null; } catch { return code; } };
const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐");
const ago = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)} min` : `${Math.round(ms / 3_600_000)} h`);
const name = (source: string) => PLATFORM_NAMES[source] ?? source;

export function LiveMap({ visitors, now, selected, onSelect }: { visitors: LiveVisitor[]; now: number; selected: string | null; onSelect: (key: string | null) => void }) {
  const [map, setMap] = useState<WorldMap | null>(null);
  const [view, setView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const flight = useRef<number | null>(null);
  useEffect(() => { void loadMap().then(setMap).catch(() => setMap(null)); }, []);

  const full = useMemo<View | null>(() => (map ? { x: map.view[0], y: map.view[1], w: map.view[2], h: map.view[3] } : null), [map]);
  useEffect(() => { if (full && !viewRef.current) { viewRef.current = full; setView(full); } }, [full]);

  // Natural Earth 1, the same projection the map file was drawn with.
  const project = useCallback((lon: number, lat: number): [number, number] => {
    if (!map) return [0, 0];
    const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [map.translate[0] + x * map.scale, map.translate[1] - y * map.scale];
  }, [map]);

  const clamp = useCallback((v: View): View => {
    if (!full) return v;
    const w = Math.min(full.w, Math.max(full.w / 24, v.w)), h = (w * full.h) / full.w;
    return { w, h, x: Math.min(full.x + full.w - w, Math.max(full.x, v.x)), y: Math.min(full.y + full.h - h, Math.max(full.y, v.y)) };
  }, [full]);
  const apply = useCallback((v: View) => { const c = clamp(v); viewRef.current = c; setView(c); }, [clamp]);
  const flyTo = useCallback((target: View) => {
    const from = viewRef.current, to = clamp(target);
    if (!from) return;
    if (flight.current) cancelAnimationFrame(flight.current);
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 450), e = 1 - (1 - k) ** 3;
      apply({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e });
      if (k < 1) flight.current = requestAnimationFrame(step);
    };
    flight.current = requestAnimationFrame(step);
  }, [apply, clamp]);
  const zoomAround = useCallback((px: number, py: number, factor: number) => {
    const v = viewRef.current;
    if (!v) return;
    apply({ w: v.w * factor, h: v.h * factor, x: px - (px - v.x) * factor, y: py - (py - v.y) * factor });
  }, [apply]);
  const toMap = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect(), v = viewRef.current!;
    return { x: v.x + ((clientX - r.left) / r.width) * v.w, y: v.y + ((clientY - r.top) / r.height) * v.h };
  };

  // Scroll and trackpad pinch zoom around the pointer (a native listener, so the page doesn't scroll instead).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !view) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const p = toMap(e.clientX, e.clientY); zoomAround(p.x, p.y, Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [Boolean(view), zoomAround]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dragging moves the map; two fingers pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean; pinch?: number; place: string | null } | null>(null);
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const place = (e.target as Element).closest?.("[data-place]")?.getAttribute("data-place") ?? null;
    drag.current = { x: e.clientX, y: e.clientY, view: viewRef.current!, moved: false, pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined, place: pts.length === 1 ? place : null };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2 && drag.current.pinch) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = toMap((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      zoomAround(mid.x, mid.y, drag.current.pinch / dist);
      drag.current.pinch = dist; drag.current.moved = true;
      return;
    }
    const r = svgRef.current!.getBoundingClientRect(), d = drag.current;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) { d.moved = true; svgRef.current?.setPointerCapture(e.pointerId); }
    if (!d.moved) return;
    apply({ ...d.view, x: d.view.x - (dx / r.width) * d.view.w, y: d.view.y - (dy / r.height) * d.view.h });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) return;
    drag.current = null;
    // A press and release on a marker without dragging: open (or close) that place.
    if (d && !d.moved && d.place) {
      const place = placesRef.current.find((p) => p.key === d.place);
      if (place) onSelect(place.visitors.some((v) => v.key === selectedRef.current) ? null : place.visitors[0].key);
    }
  };

  // Places: visitors at the same whole-degree spot share a marker.
  const places = useMemo(() => {
    const by = new Map<string, { key: string; x: number; y: number; visitors: LiveVisitor[] }>();
    for (const v of visitors) {
      if (v.lat === null || v.lon === null) continue;
      const key = `${v.lat},${v.lon}`;
      const [x, y] = project(v.lon, v.lat);
      const place = by.get(key) ?? { key, x, y, visitors: [] };
      place.visitors.push(v);
      by.set(key, place);
    }
    return [...by.values()].map((p) => ({ ...p, visitors: p.visitors.sort((a, b) => b.lastAt - a.lastAt), active: p.visitors.some((v) => v.active) }));
  }, [visitors, project]);
  const placesRef = useRef(places);
  placesRef.current = places;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const perCountry = useMemo(() => { const m = new Map<string, number>(); for (const v of visitors) if (v.country) m.set(v.country, (m.get(v.country) ?? 0) + 1); return m; }, [visitors]);
  const most = Math.max(1, ...perCountry.values());
  const open = places.find((p) => p.visitors.some((v) => v.key === selected)) ?? null;

  // Selecting someone (here or in the feed) brings their place into view.
  useEffect(() => {
    if (!open || !full || !viewRef.current) return;
    const v = viewRef.current, w = Math.min(v.w, full.w / 5);
    const inside = open.x > v.x + v.w * 0.1 && open.x < v.x + v.w * 0.9 && open.y > v.y + v.h * 0.1 && open.y < v.y + v.h * 0.9;
    if (!inside || v.w > full.w / 5) flyTo({ x: open.x - w * 0.3, y: open.y - (w * full.h) / full.w / 2, w, h: (w * full.h) / full.w });
  }, [open?.key, full, flyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fitAll = () => {
    if (!full || places.length === 0) { if (full) flyTo(full); return; }
    const xs = places.map((p) => p.x), ys = places.map((p) => p.y);
    const pad = 40, w0 = Math.max(...xs) - Math.min(...xs) + pad * 2, h0 = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const w = Math.max(full.w / 10, w0, (h0 * full.w) / full.h), h = (w * full.h) / full.w;
    flyTo({ x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h });
  };

  if (!map || !full || !view) return <div className="grid aspect-[2.27] place-items-center rounded-2xl bg-accent-soft text-sm text-muted">Loading the map…</div>;
  const k = view.w / full.w; // markers and borders keep their size on screen while zooming
  const zoom = Math.round(full.w / view.w * 10) / 10;

  return (
    <div>
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="block w-full touch-none select-none rounded-2xl bg-accent-soft"
        style={{ aspectRatio: `${full.w} / ${full.h}`, cursor: drag.current?.moved ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={(e) => { const p = toMap(e.clientX, e.clientY); const v = viewRef.current!; flyTo({ w: v.w / 2, h: v.h / 2, x: p.x - v.w / 4, y: p.y - v.h / 4 }); }}
        role="img" aria-label={`World map: ${visitors.length} visitors, ${places.length} places.`}
      >
        <g>
          {map.countries.map((c, i) => {
            const n = c.c ? perCountry.get(c.c) ?? 0 : 0;
            return (
              <path key={`${c.c ?? c.n}-${i}`} d={c.d} strokeWidth={0.6 * k} stroke="var(--surface)"
                fill={n ? `color-mix(in oklab, var(--accent) ${Math.round(35 + 55 * (n / most))}%, var(--surface))` : "color-mix(in oklab, var(--ink-2) 13%, var(--surface))"}>
                <title>{`${c.n}${n ? ` · ${n} ${n === 1 ? "visitor" : "visitors"}` : ""}`}</title>
              </path>
            );
          })}
        </g>
        {places.map((p) => {
          const colour = platformColor(p.visitors[0].source), r = (p.visitors.length > 1 ? 7 : 5.5) * k, on = open?.key === p.key;
          return (
            <g key={p.key} data-place={p.key} className="cursor-pointer">
              {p.active && <circle cx={p.x} cy={p.y} r={r} fill={colour} className="live-ping" />}
              <circle cx={p.x} cy={p.y} r={on ? r * 1.35 : r} fill={colour} opacity={p.active ? 1 : 0.55} stroke={on ? "var(--ink)" : "var(--surface)"} strokeWidth={(on ? 2 : 1.2) * k} />
              {p.visitors.length > 1 && <text x={p.x} y={p.y + 3.2 * k} textAnchor="middle" fontSize={9 * k} fontWeight={700} fill="#fff" pointerEvents="none">{p.visitors.length}</text>}
              <title>{`${p.visitors[0].city ?? countryName(p.visitors[0].country)} · ${p.visitors.length} ${p.visitors.length === 1 ? "visitor" : "visitors"}`}</title>
            </g>
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute left-3 top-3 flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {[
          ["+", "Zoom in", () => zoomAround(view.x + view.w / 2, view.y + view.h / 2, 0.6)],
          ["−", "Zoom out", () => zoomAround(view.x + view.w / 2, view.y + view.h / 2, 1 / 0.6)],
          ["◎", "Fit the visitors", fitAll],
          ["⟲", "Whole world", () => flyTo(full)],
        ].map(([label, title, fn]) => (
          <button key={title as string} type="button" title={title as string} aria-label={title as string} onClick={fn as () => void} className="grid h-8 w-8 place-items-center border-b border-line text-base font-semibold text-ink-2 last:border-b-0 hover:bg-accent-soft">{label as string}</button>
        ))}
      </div>
      {zoom > 1 && <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink-2">{zoom}×</span>}

      {/* Who is at the chosen place */}
      {open && (
        <div className="absolute right-3 top-3 z-10 w-[22rem] max-w-[calc(100%-4.5rem)] rounded-2xl border border-line bg-surface p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold leading-snug">{flag(open.visitors[0].country)} {open.visitors[0].city ?? "Town unknown"}, {countryName(open.visitors[0].country)}</p>
              <p className="text-xs text-muted">{open.visitors.length === 1 ? "1 visitor here" : `${open.visitors.length} visitors here`} in the last hour</p>
            </div>
            <button type="button" aria-label="Close" onClick={() => onSelect(null)} className="grid h-7 w-7 place-items-center rounded-full text-lg text-muted hover:bg-accent-soft">×</button>
          </div>
          <ul className="mt-3 max-h-80 space-y-2.5 overflow-auto pr-1">
            {[...open.visitors].sort((a, b) => (a.key === selected ? -1 : b.key === selected ? 1 : 0)).slice(0, 8).map((v) => (
              <li key={v.key} className={`rounded-xl border p-3 text-sm ${v.key === selected ? "border-accent" : "border-line"}`}>
                <p className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: platformColor(v.source) }} aria-hidden />
                  <span className="font-semibold">{name(v.source)}</span>
                  <span className="text-xs text-ink-2">{v.paid ? "from an ad" : "organic"}</span>
                  <span className={`ml-auto text-[11px] ${v.active ? "font-bold uppercase tracking-wider text-accent-text" : "text-muted"}`}>{v.active ? "active now" : `${ago(now - v.lastAt)} ago`}</span>
                </p>
                {(v.campaign || v.content) && <p className="mt-1 text-xs text-ink-2">Campaign <b>{v.campaign ?? "–"}</b>{v.content ? <> · ad <b>{v.content}</b></> : null}</p>}
                {v.referrer && <p className="mt-1 break-all text-xs text-ink-2">Link on {v.referrer}</p>}
                <p className="mt-1 text-xs text-ink-2">Came in on <b>{v.landing}</b> · now on <b>{v.current}</b></p>
                <p className="mt-1 text-xs text-muted">
                  {v.device === "phone" ? "📱 Phone" : v.device === "tablet" ? "📲 Tablet" : "💻 Computer"}{languageName(v.locale) ? ` · ${languageName(v.locale)}` : ""} · {v.pages.length} {v.pages.length === 1 ? "page" : "pages"} in {ago(Math.max(1000, v.lastAt - v.firstAt))}
                  {v.returning !== undefined && (v.returning ? ` · returning, ${v.sessions30} visits this month` : " · first visit")}
                </p>
                {v.account && <p className="mt-1 text-xs font-semibold text-accent-text">Signed in: {v.account}</p>}
                {v.pages.length > 1 && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{v.pages.map((p) => p.path).join(" → ")}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
      <p className="mt-2 text-xs text-muted">Scroll or pinch to zoom, drag to move, double-click to zoom in. Click a marker for who is there; countries are shaded by visitors.</p>
    </div>
  );
}
