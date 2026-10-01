"use client";
/**
 * The live map. The world in Natural Earth projection with its rounded outline, ocean and a 30° grid; countries
 * (1:110m, switching to a finer 1:50m layer once zoomed) and, zoomed in over North America, the US states, each
 * shaded by how many visitors it has. A marker per place, coloured by where its visitors came from and pulsing while
 * active, named once zoomed. Scroll, pinch or the buttons zoom; drag moves; hovering names what is under the pointer;
 * a click on a marker, on a country in the list or on a row of the feed opens who is there and what they did.
 * The map files are drawn once from Natural Earth and us-atlas (public/maps) and load only on this admin page.
 * With `fill` (full screen) the map takes its box's own shape instead of the world's, so it fills a screen of any size.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pageName, PLATFORM_NAMES, type LiveVisitor } from "@/lib/visits-math";

interface Shape { c?: string | null; r?: string | null; n: string; d: string }
interface WorldMap { scale: number; translate: [number, number]; view: [number, number, number, number]; sphere: string; graticule: string; countries: Shape[] }
interface View { x: number; y: number; w: number; h: number }
const files = new Map<string, Promise<unknown>>();
const load = <T,>(name: string) => { if (!files.has(name)) files.set(name, fetch(`/maps/${name}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(name))))); return files.get(name) as Promise<T>; };

const region = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const language = typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "language" }) : null;
const countryName = (cc: string | null) => { try { return cc ? region?.of(cc) ?? cc : "Unknown country"; } catch { return cc ?? "Unknown country"; } };
const languageName = (code: string | null) => { try { return code ? language?.of(code) ?? code : null; } catch { return code; } };
const flag = (cc: string | null) => (cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐");
const ago = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)} min` : ms < 48 * 3_600_000 ? `${Math.round(ms / 3_600_000)} h` : `${Math.round(ms / 86_400_000)} days`);
/** At one place, at most this many pins are drawn (the newest); a badge says how many there are in all. */
const PINS_PER_PLACE = 12;
const name = (source: string) => PLATFORM_NAMES[source] ?? source;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const OCEAN = "color-mix(in oklab, #bcd6e2 38%, var(--surface))";
const LAND = "color-mix(in oklab, var(--ink-2) 11%, var(--surface))";
/** Pin colours: a visitor, someone who signed up, someone who paid. */
const STATUS = { visitor: { colour: "#e5484d", label: "Visitor" }, "signed-up": { colour: "#2f6fed", label: "Signed up" }, free: { colour: "#7c3aed", label: "Free report" }, paid: { colour: "#2fa35a", label: "Just paid" } } as const;
/** A map pin, tip at 0,0, head centred 15 above it. */
const PIN = "M0 0C-1.6-5-8-9.4-8-15A8 8 0 1 1 8-15C8-9.4 1.6-5 0 0Z";
const shade = (n: number, most: number) => `color-mix(in oklab, var(--accent) ${Math.round(38 + 52 * (n / most))}%, var(--surface))`;

export function LiveMap({ visitors, now, selected, onSelect, replayPerson = null, fill = false, spanLabel = "1 hour" }: { visitors: LiveVisitor[]; now: number; selected: string | null; onSelect: (key: string | null) => void; replayPerson?: string | null; fill?: boolean; spanLabel?: string }) {
  const [map, setMap] = useState<WorldMap | null>(null);
  const [fine, setFine] = useState<Shape[] | null>(null);
  const [states, setStates] = useState<Shape[] | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const viewRef = useRef<View | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const flight = useRef<number | null>(null);
  useEffect(() => { void load<WorldMap>("world-110m.json").then(setMap).catch(() => setMap(null)); }, []);

  const full = useMemo<View | null>(() => (map ? { x: map.view[0], y: map.view[1], w: map.view[2], h: map.view[3] } : null), [map]);
  useEffect(() => { if (full && !viewRef.current) { viewRef.current = full; setView(full); } }, [full]);
  // The shown area's height to width: the world's own, or with `fill` the box's, measured as it changes.
  const [boxRatio, setBoxRatio] = useState<number | null>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!fill || !box || typeof ResizeObserver === "undefined") return;
    const measure = () => { const r = box.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setBoxRatio(r.height / r.width); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [fill, Boolean(view)]); // eslint-disable-line react-hooks/exhaustive-deps
  const ratio = fill && boxRatio ? boxRatio : full ? full.h / full.w : 1;

  // Natural Earth 1, the same projection the map files were drawn with.
  const project = useCallback((lon: number, lat: number): [number, number] => {
    if (!map) return [0, 0];
    const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [map.translate[0] + x * map.scale, map.translate[1] - y * map.scale];
  }, [map]);

  // Zoomed out, the whole world fits; a box of another shape than the world's shows it centred, with room around it.
  const clamp = useCallback((v: View): View => {
    if (!full) return v;
    const w = Math.min(Math.max(full.w, full.h / ratio), Math.max(full.w / 40, v.w)), h = w * ratio;
    const x = w >= full.w ? full.x - (w - full.w) / 2 : Math.min(full.x + full.w - w, Math.max(full.x, v.x));
    const y = h >= full.h ? full.y - (h - full.h) / 2 : Math.min(full.y + full.h - h, Math.max(full.y, v.y));
    return { w, h, x, y };
  }, [full, ratio]);
  const apply = useCallback((v: View) => { const c = clamp(v); viewRef.current = c; setView(c); }, [clamp]);
  // A new shape (full screen on or off, a resized window): the same centre and width, the height to match.
  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    apply({ x: cx - v.w / 2, y: cy - (v.w * ratio) / 2, w: v.w, h: v.w * ratio });
  }, [ratio]); // eslint-disable-line react-hooks/exhaustive-deps
  const flyTo = useCallback((target: View) => {
    const from = viewRef.current, to = clamp(target);
    if (!from) return;
    if (flight.current) cancelAnimationFrame(flight.current);
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 500), e = 1 - (1 - k) ** 3;
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

  // Zoomed in: the finer countries, and over North America the states.
  const zoom = full && view ? full.w / view.w : 1;
  const usBox = useMemo(() => { if (!map) return null; const [ax, ay] = project(-126, 50), [bx, by] = project(-66, 24); return { x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: ay, y1: by }; }, [map, project]);
  const overUS = Boolean(view && usBox && view.x < usBox.x1 && view.x + view.w > usBox.x0 && view.y < usBox.y1 && view.y + view.h > usBox.y0);
  useEffect(() => { if (zoom >= 1.8 && !fine) void load<{ countries: Shape[] }>("world-50m.json").then((m) => setFine(m.countries)).catch(() => undefined); }, [zoom >= 1.8, fine]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (zoom >= 1.8 && overUS && !states) void load<{ states: Shape[] }>("us-states.json").then((m) => setStates(m.states)).catch(() => undefined); }, [zoom >= 1.8, overUS, states]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll and trackpad pinch zoom around the pointer (a native listener, so the page doesn't scroll instead).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !view) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); setTip(null); const p = toMap(e.clientX, e.clientY); zoomAround(p.x, p.y, Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [Boolean(view), zoomAround]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Every visitor has a pin: at their town, fanned out in a small ring when several share it, drawn south to north.
  const pins = useMemo(() => places.flatMap((p) => p.visitors.slice(0, PINS_PER_PLACE).map((v, i) => {
    const n = Math.min(p.visitors.length, PINS_PER_PLACE), ring = i < 8 ? 0 : 1, slot = ring ? i - 8 : i, count = ring ? n - 8 : Math.min(n, 8);
    const angle = -Math.PI / 2 + (slot / Math.max(1, count)) * Math.PI * 2, radius = n === 1 ? 0 : ring ? 20 : 11;
    return { v, place: p.key, x: p.x, y: p.y, dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius * 0.7 };
  })).sort((a, b) => a.y + a.dy - (b.y + b.dy)), [places]);
  const placesRef = useRef(places);
  placesRef.current = places;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const perCountry = useMemo(() => { const m = new Map<string, number>(); for (const v of visitors) if (v.country) m.set(v.country, (m.get(v.country) ?? 0) + 1); return m; }, [visitors]);
  const perState = useMemo(() => { const m = new Map<string, number>(); for (const v of visitors) if (v.country === "US" && v.region) m.set(v.region, (m.get(v.region) ?? 0) + 1); return m; }, [visitors]);
  const mostCountry = Math.max(1, ...perCountry.values()), mostState = Math.max(1, ...perState.values());
  const stateName = (code: string | null) => (code ? states?.find((s) => s.r === code)?.n ?? code : null);
  const open = places.find((p) => p.visitors.some((v) => v.key === selected)) ?? null;

  // Dragging moves the map; two fingers pinch. A press and release on a marker without dragging opens it.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean; pinch?: number; place: string | null } | null>(null);
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const place = (e.target as Element).closest?.("[data-visitor]")?.getAttribute("data-visitor") ?? null;
    drag.current = { x: e.clientX, y: e.clientY, view: viewRef.current!, moved: false, pinch: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : undefined, place: pts.length === 1 ? place : null };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // What is under the pointer, named at once.
    if (!drag.current?.moved && boxRef.current) {
      const text = (e.target as Element).closest?.("[data-tip]")?.getAttribute("data-tip") ?? null;
      const r = boxRef.current.getBoundingClientRect();
      setTip(text ? { text, x: e.clientX - r.left, y: e.clientY - r.top } : null);
    }
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
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) { d.moved = true; setTip(null); svgRef.current?.setPointerCapture(e.pointerId); }
    if (!d.moved) return;
    apply({ ...d.view, x: d.view.x - (dx / r.width) * d.view.w, y: d.view.y - (dy / r.height) * d.view.h });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (pointers.current.size > 0) return;
    drag.current = null;
    if (d && !d.moved && d.place) onSelect(d.place === selectedRef.current ? null : d.place);
  };

  // Selecting someone (here, in the list or in the feed) brings their place into view, left of the card.
  useEffect(() => {
    if (!open || !full || !viewRef.current) return;
    const v = viewRef.current, w = Math.min(v.w, full.w / 6);
    const inside = open.x > v.x + v.w * 0.08 && open.x < v.x + v.w * 0.55 && open.y > v.y + v.h * 0.1 && open.y < v.y + v.h * 0.9;
    if (!inside || v.w > full.w / 6) flyTo({ x: open.x - w * 0.3, y: open.y - (w * ratio) / 2, w, h: w * ratio });
  }, [open?.key, full, flyTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyToBox = (x0: number, y0: number, x1: number, y1: number) => {
    if (!full) return;
    const pad = 0.12, w0 = (x1 - x0) * (1 + pad * 2), h0 = (y1 - y0) * (1 + pad * 2);
    const w = Math.max(full.w / 30, w0, h0 / ratio), h = w * ratio;
    flyTo({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h });
  };
  const fitAll = () => {
    if (!full) return;
    if (places.length === 0) { flyTo(full); return; }
    const xs = places.map((p) => p.x), ys = places.map((p) => p.y);
    flyToBox(Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20);
  };
  // Full screen on a tall screen (a phone): the world would sit in a band across the middle, so the map opens on the
  // visitors instead, once. The whole world is one tap away (⟲).
  const fitted = useRef(false);
  useEffect(() => {
    if (!fill || fitted.current || !boxRatio || boxRatio < 0.8 || places.length === 0) return;
    fitted.current = true;
    fitAll();
  }, [fill, boxRatio, places.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyToCountry = (cc: string) => {
    if (cc === "US" && usBox) { flyToBox(usBox.x0, usBox.y0, usBox.x1, usBox.y1); return; }
    const el = svgRef.current?.querySelector<SVGGraphicsElement>(`[data-country="${cc}"]`);
    if (el) { const b = el.getBBox(); flyToBox(b.x, b.y, b.x + b.width, b.y + b.height); }
  };

  if (!map || !full || !view) return <div className={`grid place-items-center rounded-2xl text-sm text-muted ${fill ? "h-full" : "aspect-[2.26]"}`} style={{ background: OCEAN }}>Loading the map…</div>;
  const k = view.w / full.w; // markers, borders and labels keep their size on screen at any zoom
  const shapes = zoom >= 1.8 && fine ? fine : map.countries;
  const showStates = zoom >= 1.8 && overUS && states;
  const labelled = zoom >= 2.5;
  const topCountries = [...perCountry].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col" : undefined}>
      <div ref={boxRef} className={`relative overflow-hidden rounded-2xl border border-line ${fill ? "min-h-0 flex-1" : ""}`} style={{ background: "var(--surface)" }} onPointerLeave={() => setTip(null)}>
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className={`block touch-none select-none ${fill ? "absolute inset-0 h-full w-full" : "w-full"}`}
          style={fill ? { cursor: "grab" } : { aspectRatio: `${full.w} / ${full.h}`, cursor: "grab" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onDoubleClick={(e) => { const p = toMap(e.clientX, e.clientY); const v = viewRef.current!; flyTo({ w: v.w / 2, h: v.h / 2, x: p.x - v.w / 4, y: p.y - v.h / 4 }); }}
          role="img" aria-label={`World map: ${plural(visitors.length, "visitor", "visitors")} in ${plural(places.length, "place", "places")}.`}
        >
          <path d={map.sphere} fill={OCEAN} />
          <path d={map.graticule} fill="none" stroke="color-mix(in oklab, var(--ink-2) 14%, transparent)" strokeWidth={0.5 * k} />
          <g>
            {shapes.map((c, i) => {
              const n = c.c ? perCountry.get(c.c) ?? 0 : 0;
              // With the states drawn, they carry the shading and the country itself stays plain.
              const plain = !n || (showStates && c.c === "US");
              return <path key={`${c.c ?? c.n}-${i}`} d={c.d} data-country={c.c ?? undefined} data-tip={`${c.n}${n ? ` · ${plural(n, "visitor", "visitors")}` : ""}`} fill={plain ? LAND : shade(n, mostCountry)} stroke="var(--surface)" strokeWidth={0.7 * k} strokeLinejoin="round" />;
            })}
          </g>
          {showStates && (
            <g>
              {states!.map((s) => {
                const n = perState.get(s.r ?? "") ?? 0;
                return <path key={s.r} d={s.d} data-tip={`${s.n}${n ? ` · ${plural(n, "visitor", "visitors")}` : ""}`} fill={n ? shade(n, mostState) : "transparent"} stroke="color-mix(in oklab, var(--surface) 70%, var(--ink-2))" strokeWidth={0.45 * k} strokeLinejoin="round" />;
              })}
            </g>
          )}
          {pins.map(({ v, x, y, dx, dy }) => {
            const colour = STATUS[v.status].colour, on = v.key === selected, size = (on ? 1.3 : 1) * k;
            const px = x + dx * k, py = y + dy * k;
            const tipText = `${v.city ?? countryName(v.country)}${v.country === "US" && v.region ? `, ${stateName(v.region)}` : ""} · ${STATUS[v.status].label}${v.account ? ` (${v.account.split(" · ")[0]})` : ""} · ${name(v.source)}${v.paid ? " ad" : ""}${v.active ? " · active now" : ""}`;
            return (
              <g key={v.key} data-visitor={v.key} data-tip={tipText} className="cursor-pointer" opacity={v.active || on ? 1 : 0.72}>
                {v.active && <ellipse cx={px} cy={py} rx={7 * k} ry={2.6 * k} fill={colour} className="live-ping" />}
                <ellipse cx={px} cy={py} rx={3.2 * k} ry={1.2 * k} fill="rgba(0,0,0,.25)" />
                <g transform={`translate(${px} ${py}) scale(${size})`}>
                  <path d={PIN} fill={colour} stroke={on ? "var(--ink)" : "#fff"} strokeWidth={on ? 1.8 : 1.2} />
                  <circle cx={0} cy={-15} r={3.2} fill="#fff" />
                </g>
              </g>
            );
          })}
          {/* A crowded place: how many visitors it holds in all; a click opens it, like a pin. */}
          {places.filter((p) => p.visitors.length > PINS_PER_PLACE).map((p) => (
            <g key={`count-${p.key}`} data-visitor={p.visitors[0].key} data-tip={`${p.visitors[0].city ?? countryName(p.visitors[0].country)} · ${plural(p.visitors.length, "visitor", "visitors")}`} className="cursor-pointer">
              <rect x={p.x + 9 * k} y={p.y - 44 * k} width={(String(p.visitors.length).length * 7 + 12) * k} height={16 * k} rx={8 * k} fill="var(--ink)" />
              <text x={p.x + (15 + String(p.visitors.length).length * 3.5) * k} y={p.y - 32.5 * k} fontSize={11 * k} fontWeight={700} fill="var(--surface)" textAnchor="middle" pointerEvents="none">{p.visitors.length}</text>
            </g>
          ))}
          {labelled && places.map((p) => (
            <text key={`label-${p.key}`} x={p.x + 12 * k} y={p.y - 10 * k} fontSize={11 * k} fontWeight={600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={3 * k} paintOrder="stroke" pointerEvents="none">
              {p.visitors[0].city ?? countryName(p.visitors[0].country)}{p.visitors.length > 1 ? ` · ${p.visitors.length}` : ""}
            </text>
          ))}
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
        {zoom > 1.05 && <span className={`absolute bottom-3 left-3 rounded-full ${open ? "hidden sm:block" : ""} bg-surface/90 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-ink-2 shadow-sm`}>{Math.round(zoom * 10) / 10}×{showStates ? " · US states" : zoom >= 1.8 ? " · detailed" : ""}</span>}

        {/* The name of what is under the pointer */}
        {tip && !open && (
          <span className="pointer-events-none absolute z-20 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-surface shadow" style={{ left: tip.x + 14, top: tip.y + 12 }}>{tip.text}</span>
        )}

        {/* Who is at the chosen place */}
        {open && (() => {
          // The clicked visitor first and in full: the page they are on now, how long they have been there, and the way
          // they came, ticking with `now`. The others at this place stay as one row each; a tap on a row brings it up.
          const list = [...open.visitors].sort((a, b) => (a.key === selected ? -1 : b.key === selected ? 1 : b.lastAt - a.lastAt));
          const v = list[0], rest = list.slice(1, 8);
          const here = v.pages.at(-1);
          const onPage = here ? now - here.at : 0;
          return (
            <div className="z-10 m-2 flex max-h-[70vh] flex-col rounded-2xl border border-line bg-surface p-4 shadow-lg sm:absolute sm:right-3 sm:top-3 sm:m-0 sm:max-h-[calc(100%-1.5rem)] sm:w-[24rem] sm:max-w-[calc(100%-4.5rem)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold leading-snug">{flag(v.country)} {v.city ?? "Town unknown"}{v.country === "US" && v.region ? `, ${stateName(v.region)}` : ""}, {countryName(v.country)}</p>
                  <p className="text-xs text-muted">{plural(open.visitors.length, "visitor", "visitors")} here · last {spanLabel}</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => onSelect(null)} className="grid h-7 w-7 place-items-center rounded-full text-lg text-muted hover:bg-accent-soft">×</button>
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1">
                <div className="rounded-xl border border-accent p-3 text-sm">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: STATUS[v.status].colour }}>{STATUS[v.status].label}</span>
                    <span className="font-semibold">{name(v.source)}</span>
                    <span className="text-xs text-ink-2">· {v.paid ? "ad" : "organic"}</span>
                    <span className={`ml-auto flex items-center gap-1.5 whitespace-nowrap text-[11px] ${v.active ? "font-bold uppercase tracking-wider text-accent-text" : "text-muted"}`}>
                      {v.active && <span className="relative grid h-2.5 w-2.5 place-items-center" aria-hidden><span className="breathe absolute inset-0 rounded-full bg-accent" /><span className="relative h-1.5 w-1.5 rounded-full bg-accent" /></span>}
                      {v.active ? "on the site now" : `left ${ago(now - v.lastAt)} ago`}
                    </span>
                  </p>

                  {/* Right now: the page under their fingers, and for how long. */}
                  <div className="mt-3 rounded-lg bg-accent-soft px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">{v.active ? "Now on" : "Last seen on"}</p>
                    <p className="mt-0.5 font-semibold">{pageName(v.current)}</p>
                    <p className="text-xs text-ink-2">{v.active ? `${ago(Math.max(1000, onPage))} on this page` : `stayed there until ${ago(now - v.lastAt)} ago`} · {plural(v.pages.length, "page", "pages")} in {ago(Math.max(1000, v.lastAt - v.firstAt))}</p>
                  </div>

                  {/* The way they came: every page of this hour, and how long each one held them. */}
                  <ol className="mt-3 space-y-1">
                    {v.pages.map((p, i) => {
                      const next = v.pages[i + 1];
                      const last = i === v.pages.length - 1;
                      const held = next ? next.at - p.at : v.active ? now - p.at : v.lastAt - p.at;
                      return (
                        <li key={`${p.at}-${p.path}`} className={`flex items-baseline gap-2 text-xs ${last ? "font-semibold" : "text-ink-2"}`}>
                          <span className="w-14 shrink-0 tabular-nums text-muted">{ago(now - p.at)} ago</span>
                          <span className="min-w-0 flex-1 truncate">{pageName(p.path)}</span>
                          <span className="shrink-0 tabular-nums text-muted">{last && v.active ? `${ago(Math.max(1000, held))} · now` : ago(Math.max(1000, held))}</span>
                        </li>
                      );
                    })}
                  </ol>

                  {(v.campaign || v.content) && <p className="mt-2 text-xs text-ink-2">Campaign <b>{v.campaign ?? "–"}</b>{v.content ? <> · ad <b>{v.content}</b></> : null}</p>}
                  {v.referrer && <p className="mt-1 break-all text-xs text-ink-2">Link on {v.referrer}</p>}
                  <p className="mt-2 text-xs text-muted">
                    {v.device === "phone" ? "📱 Phone" : v.device === "tablet" ? "📲 Tablet" : "💻 Computer"}{languageName(v.locale) ? ` · ${languageName(v.locale)}` : ""} · came in on the {pageName(v.landing).toLowerCase()}
                    {v.returning !== undefined && (v.returning ? ` · returning, ${v.sessions30} visits this month` : " · first visit")}
                    {v.status === "paid" && v.paidAt ? ` · paid ${ago(now - v.paidAt)} ago` : v.customer ? " · paying customer" : ""}
                    {v.status === "free" && v.freeAt ? ` · free first report ${ago(now - v.freeAt)} ago` : v.status !== "free" && v.hadFree ? " · had the free report" : ""}
                  </p>
                  {v.account && <p className="mt-1 text-xs font-semibold text-accent-text">Signed in: {v.account}</p>}
                  {replayPerson && <a href={`${replayPerson}${encodeURIComponent(v.key)}#activeTab=sessionRecordings`} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-semibold text-accent-text hover:underline">▶ Watch this visitor&apos;s replay in PostHog ↗</a>}
                </div>

                {rest.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {rest.map((o) => (
                      <li key={o.key}>
                        <button type="button" onClick={() => onSelect(o.key)} className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-accent">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS[o.status].colour }} aria-hidden />
                          <span className="font-semibold">{name(o.source)}</span>
                          <span className="min-w-0 flex-1 truncate text-ink-2">· now on the {pageName(o.current).toLowerCase()}</span>
                          <span className="shrink-0 text-muted">{o.active ? "active" : `${ago(now - o.lastAt)} ago`}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {list.length > 8 && <p className="mt-2 text-xs text-muted">…and {list.length - 8} more here</p>}
              </div>
            </div>
          );
        })()}
      </div>

      {visitors.some((v) => v.lat === null || v.lon === null) && (
        <p className="mt-2 text-xs text-muted">{plural(visitors.filter((v) => v.lat === null || v.lon === null).length, "visitor", "visitors")} without a known location: counted, but not on the map.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-2">
        {(Object.keys(STATUS) as Array<keyof typeof STATUS>).map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <svg viewBox="-9 -24 18 25" className="h-4 w-3" aria-hidden><path d={PIN} fill={STATUS[key].colour} stroke="#fff" strokeWidth={1.2} /><circle cx={0} cy={-15} r={3.2} fill="#fff" /></svg>
            {STATUS[key].label} · <b className="tabular-nums">{visitors.filter((v) => v.status === key).length}</b>
          </span>
        ))}
        <span className="text-muted">Pulsing: active in the last 5 minutes</span>
      </div>

      {/* Where they are: the countries, most visitors first; a click flies there */}
      {topCountries.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Where they are</span>
          {topCountries.map(([cc, n]) => (
            <button key={cc} type="button" onClick={() => flyToCountry(cc)} className="pill pill-off !px-3 !py-1 text-xs" title={`Show ${countryName(cc)}`}>
              {flag(cc)} {countryName(cc)} · <b className="tabular-nums">{n}</b>
            </button>
          ))}
        </div>
      )}
      {!fill && <p className="mt-2 text-xs text-muted">Scroll or pinch to zoom, drag to move, double-click to zoom in; zoomed in, the map turns detailed and shows the US states. Hover for names, click a pin for who it is.</p>}
    </div>
  );
}
