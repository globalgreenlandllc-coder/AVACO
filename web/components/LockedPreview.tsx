import type { Dict } from "@/lib/i18n";
import type { Teaser } from "@/lib/report";

/** AVOCO's own order of the types, as on the voice signature. */
const ORDER = ["organizer", "driver", "catalyst", "performer", "harmonizer", "analyst", "skeptic", "mediator"];

export interface PreviewTakes { n: number; band: "high" | "medium" | "low"; pct: number; dates: Array<{ id: string; date: string; current: boolean }> }

/**
 * The free preview of a finished report. The browser never receives a type, a score or an emotion (lib/api.ts
 * previewReport), so nothing here can be read out of the page. What it shows is proof that the report exists:
 * the outline of the result (how many types lead), what was measured, and every section veiled in its real shape.
 * Everything veiled is generic copy or an empty shape, never a made-up result.
 */
export function LockedPreview({ t, recordedOn, teaser, takes, hideEmotions = false }: { t: Dict; recordedOn: string; teaser?: Teaser; takes?: PreviewTakes; hideEmotions?: boolean }) {
  const r = t.report;
  const p = r.preview;
  const z = teaser ?? { leading: 0, active: 0, background: 0, scales: 0 };
  const scored = z.leading + z.active + z.background;
  const scales = hideEmotions ? 0 : z.scales;
  const label = z.leading === 0 ? r.balancedTitle : z.leading > 1 ? r.leadingTypes : r.leadingType;
  const pattern = scored === 0 ? null : z.leading === 0 ? p.pattern.balanced : z.leading === 1 ? p.pattern.one : z.leading === 2 ? p.pattern.two : p.pattern.many.replace("{n}", String(z.leading));
  const titles = z.leading >= 2 ? 2 : 1;
  const items = t.billing.lock.items;
  const names = ORDER.map((key) => (t.psytypes as Record<string, { name: string }>)[key]?.name ?? key);
  const facts = [p.facts.types, p.facts.fields, ...(scales > 0 ? [p.facts.scales.replace("{n}", String(scales))] : [])];

  return (
    <>
      <section className="cover px-7 py-10 sm:px-12 sm:py-14">
        <span className="cover-capsule drift" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <span className="cover-capsule drift hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-3s" }} aria-hidden />
        <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />

        <p className="cover-eyebrow relative"><span className="font-display text-xl font-semibold tracking-[0.2em]">{t.brand}</span><span className="mx-3 opacity-50">·</span>{r.title} · {recordedOn}</p>

        <div className="relative mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ background: "color-mix(in oklab, var(--cover-gold) 18%, transparent)", color: "var(--cover-gold)" }}>
              <Check /> {p.ready}
            </p>
            <p className="mt-7 text-sm font-semibold" style={{ color: "var(--cover-muted)" }}>{label}</p>
            <div className="mt-3 space-y-5">
              {Array.from({ length: titles }, (_, i) => (
                <div key={i}>
                  <div className="relative inline-block">
                    <p aria-hidden className={`veil-strong pb-2 font-display font-semibold leading-[0.95] ${titles > 1 ? "text-5xl sm:text-6xl" : "text-6xl sm:text-8xl"}`} style={{ color: "var(--cover-gold)" }}>{p.hidden}</p>
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ background: "var(--cover-bg)", color: "var(--cover-gold)", border: "1px solid color-mix(in oklab, var(--cover-gold) 50%, transparent)" }}>
                        <Lock /> {p.locked}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 flex items-baseline gap-3" aria-hidden>
                    <span className="veil-strong text-4xl font-semibold tabular-nums" style={{ filter: "blur(7px)" }}>00</span>
                    <span className="text-sm" style={{ color: "var(--cover-muted)" }}>/ 100</span>
                  </p>
                </div>
              ))}
              <p className="sr-only">{p.hiddenNote}</p>
            </div>
            {pattern && <p className="mt-6 max-w-md leading-relaxed sm:text-lg" style={{ color: "var(--cover-muted)" }}>{pattern}</p>}
            {scored > 0 && (
              <div className="mt-5">
                <p className="cover-eyebrow">{p.zones}</p>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {(["leading", "active", "background"] as const).map((k) => (
                    <li key={k} className="rounded-full px-3.5 py-1 text-sm" style={{ border: "1px solid color-mix(in oklab, var(--cover-gold) 40%, transparent)", color: "var(--cover-ink)" }}>
                      {r.zones[k]} <span className="ml-1 font-bold tabular-nums" style={{ color: "var(--cover-gold)" }}>{z[k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href="#unlock" className="btn mt-8">{p.open} ↓</a>
          </div>
          <div>
            <p className="cover-eyebrow text-center">{r.signature}</p>
            <LockedSignature names={names} />
            <p className="mt-1 text-center text-sm font-semibold" style={{ color: "var(--cover-ink)" }}>{p.signature}</p>
            <p className="mx-auto mt-1 max-w-sm text-center text-xs leading-relaxed" style={{ color: "var(--cover-muted)" }}>{p.signatureHelp}</p>
          </div>
        </div>

        <ul className="relative mt-10 grid gap-3 pt-6 sm:grid-cols-3" style={{ borderTop: "1px solid color-mix(in oklab, var(--cover-gold) 22%, transparent)" }}>
          {facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--cover-ink)" }}>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: "color-mix(in oklab, var(--cover-gold) 22%, transparent)", color: "var(--cover-gold)" }}><Check /></span>
              {fact}
            </li>
          ))}
        </ul>
      </section>

      {takes && (
        <section className="card p-7 sm:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="eyebrow">{t.consistency.title}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${takes.band === "low" ? "border border-line text-ink-2" : "bg-accent text-accent-ink"}`}>{t.consistency.bands[takes.band]} · {takes.pct}%</span>
          </div>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{p.takes.replace("{n}", String(takes.n))}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {takes.dates.map((x) => (
              <li key={x.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${x.current ? "bg-accent font-semibold text-accent-ink" : "border border-line text-ink-2"}`}>{x.date} · <Lock /></li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-4xl font-medium sm:text-5xl">{p.insideTitle}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{p.insideLead}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <LockedCard wide title={t.deep.ui.summaryTitle} note={p.summaryLocked} locked={p.locked} opens={p.opensWith}>
            <div className="space-y-2 leading-relaxed sm:text-lg"><p>{r.psyLead}</p><p>{r.emoLead}</p></div>
          </LockedCard>
          <LockedCard title={r.profileTitle} note={items[0]} locked={p.locked} opens={p.opensWith}>
            <div className="space-y-3 text-sm leading-relaxed"><p>{r.profileLead} {r.psyLead}</p><p>{t.deep.method.lead}</p></div>
          </LockedCard>
          <LockedCard title={r.psyTitle} note={items[3]} locked={p.locked} opens={p.opensWith} clear>
            <ul className="space-y-2.5">
              {names.map((name, i) => (
                <li key={name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className="truncate text-ink-2">{name}</span>
                  <span className="skeleton h-2.5 rounded-full" style={{ animationDelay: `${i * 120}ms` }} />
                  <span className="text-right font-semibold tracking-widest text-muted">••</span>
                </li>
              ))}
            </ul>
          </LockedCard>
          <LockedCard wide={scales === 0} title={t.deep.fit.title} note={items[1]} locked={p.locked} opens={p.opensWith} clear>
            <ol className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((n) => (
                <li key={n} className="soft-panel flex flex-col items-center gap-3 p-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full border-[5px] border-track font-semibold tracking-widest text-muted">••</span>
                  <span className="font-display text-3xl font-medium text-accent-text">{String(n).padStart(2, "0")}</span>
                  <span className="skeleton h-2 w-full rounded-full" style={{ animationDelay: `${n * 150}ms` }} />
                  <span className="skeleton h-2 w-2/3 rounded-full" style={{ animationDelay: `${n * 150 + 80}ms` }} />
                </li>
              ))}
            </ol>
          </LockedCard>
          {scales > 0 && (
            <LockedCard title={r.emoTitle} note={items[2]} locked={p.locked} opens={p.opensWith} clear>
              <div className="space-y-3">
                {Array.from({ length: scales }, (_, i) => (
                  <div key={i} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm">
                    <span className="skeleton h-2 rounded-full" style={{ animationDelay: `${i * 90}ms` }} />
                    <span className="skeleton h-2.5 rounded-full" style={{ animationDelay: `${i * 90 + 40}ms` }} />
                    <span className="text-right font-semibold tracking-widest text-muted">••</span>
                  </div>
                ))}
              </div>
            </LockedCard>
          )}
        </div>
      </section>
    </>
  );
}

/**
 * One section of the report, closed: its title and what it tells, over its shape. Text is veiled (blurred, generic
 * copy); data is drawn as empty shapes (`clear`), so no number on the page is invented.
 */
function LockedCard({ title, note, locked, opens, wide = false, clear = false, children }: { title: string; note: string; locked: string; opens: string; wide?: boolean; clear?: boolean; children: React.ReactNode }) {
  return (
    <a href="#unlock" className={`card card-link group relative block overflow-hidden p-6  sm:p-8 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl font-medium sm:text-3xl">{title}</h3>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-widest text-accent-text"><Lock /> {locked}</span>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">{note}</p>
      <div className="relative mt-6">
        <div aria-hidden className={`${clear ? "veil-soft" : "veil"} max-h-56 overflow-hidden`}>{children}</div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold shadow-sm transition-transform group-hover:-translate-y-0.5">
            <Lock /> {opens}
          </span>
        </div>
      </div>
    </a>
  );
}

/** The voice signature's frame with the eight type names, and in place of the person's shape a veiled, even one. */
function LockedSignature({ names }: { names: string[] }) {
  const W = 520, H = 430, CX = W / 2, CY = H / 2, R = 150;
  const point = (i: number, value: number) => {
    const angle = (i / names.length) * 2 * Math.PI - Math.PI / 2;
    const r = (value / 100) * R;
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), cos: Math.cos(angle), sin: Math.sin(angle) };
  };
  const ring = (value: number) => names.map((_, i) => point(i, value)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        <radialGradient id="locked-fill">
          <stop offset="0%" stopColor="var(--cover-gold)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--cover-gold)" stopOpacity="0.1" />
        </radialGradient>
        <filter id="locked-veil" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16" /></filter>
      </defs>
      <polygon points={ring(100)} fill="none" stroke="var(--cover-muted)" strokeOpacity="0.35" />
      {[30, 50].map((mark) => <polygon key={mark} points={ring(mark)} fill="none" stroke="var(--cover-muted)" strokeOpacity="0.45" strokeDasharray="3 5" />)}
      {names.map((name, i) => {
        const edge = point(i, 100);
        return <line key={name} x1={CX} y1={CY} x2={edge.x} y2={edge.y} stroke="var(--cover-muted)" strokeOpacity="0.2" />;
      })}
      <polygon className="locked-glow" style={{ transformOrigin: `${CX}px ${CY}px` }} points={ring(62)} fill="url(#locked-fill)" filter="url(#locked-veil)" />
      {names.map((name, i) => {
        const label = point(i, 100);
        const anchor = Math.abs(label.cos) < 0.3 ? "middle" : label.cos > 0 ? "start" : "end";
        const lx = label.x + label.cos * 14;
        const ly = label.y + label.sin * 14 + (label.sin > 0.3 ? 10 : label.sin < -0.3 ? -12 : 0);
        return (
          <g key={name}>
            <text x={lx} y={ly} textAnchor={anchor} fontSize="13" fontWeight={500} fill="var(--cover-muted)">{name}</text>
            <text x={lx} y={ly + 15} textAnchor={anchor} fontSize="12" fontWeight="700" fill="var(--cover-gold)" letterSpacing="2">••</text>
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r="30" fill="var(--cover-bg)" stroke="var(--cover-gold)" strokeOpacity="0.6" />
      <g transform={`translate(${CX - 11} ${CY - 13})`} fill="none" stroke="var(--cover-gold)" strokeWidth="2.2" strokeLinecap="round">
        <rect x="1" y="10" width="20" height="15" rx="3.5" />
        <path d="M5.5 10V6.5a5.5 5.5 0 0 1 11 0V10" />
      </g>
    </svg>
  );
}

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <rect x="4" y="11" width="16" height="11" rx="3" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
