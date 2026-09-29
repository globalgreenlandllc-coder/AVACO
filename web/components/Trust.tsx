import type { Dict } from "@/lib/i18n";
import { trustReading } from "@/lib/trust";
import { Reveal } from "./Motion";

/**
 * The trust and reliability chapter: one overall score with its band, four facets as bars with what carries each,
 * then how the leading type makes promises and how to get one kept. Read from the type mix (lib/trust.ts).
 */
export function Trust({ types, typeName, t }: { types: Array<{ key: string; value: number }>; typeName: (key: string) => string; t: Dict["trust"] }) {
  const reading = trustReading(types);
  if (!reading) return null;
  const colour = (band: "high" | "mid" | "low") => (band === "high" ? "var(--bar-leading)" : band === "mid" ? "var(--bar-active)" : "var(--bar-background)");
  const lead = typeName(reading.leading);
  return (
    <Reveal as="section" id="trust" className="card card-flow scroll-mt-24 p-8 sm:p-12">
      <p className="eyebrow">{t.eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{t.lead}</p>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[auto_1fr]">
        <div className="soft-panel flex items-center gap-6 p-6">
          <div className="relative grid h-28 w-28 shrink-0 place-items-center" role="img" aria-label={`${t.overall}: ${reading.overall} ${t.outOf}`}>
            <svg viewBox="0 0 112 112" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="56" cy="56" r="48" fill="none" stroke="color-mix(in oklab, var(--bar-background) 35%, transparent)" strokeWidth="8" />
              <circle cx="56" cy="56" r="48" fill="none" stroke={colour(reading.band)} strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - reading.overall / 100)} />
            </svg>
            <span className="relative font-display text-4xl font-semibold tabular-nums">{reading.overall}</span>
          </div>
          <div>
            <p className="eyebrow">{t.overall}</p>
            <p className="mt-1 text-lg font-semibold leading-snug">{t.bands[reading.band]}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-2 sm:text-base">{t.bandText[reading.band]}</p>
      </div>

      <ol className="mt-10 grid gap-x-12 gap-y-7 sm:grid-cols-2">
        {reading.facets.map((f, i) => {
          const words = t.facets[f.key];
          return (
            <li key={f.key} className="break-inside-avoid">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{words.name}</span>
                <span className="w-10 text-right font-semibold tabular-nums">{f.score}</span>
              </div>
              <div className="mt-2 h-2.5 rounded-r-full bg-track" role="img" aria-label={`${words.name}: ${f.score} ${t.outOf}`}>
                <div className="bar-fill h-full rounded-r-full" style={{ width: `${f.score}%`, background: colour(f.band), animationDelay: `${i * 60}ms` }} />
              </div>
              <p className="mt-2 text-xs text-muted">{words.text}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{words[f.band]}</p>
              <p className="mt-1 text-xs text-muted">{t.from.replace("{a}", typeName(f.from[0])).replace("{b}", typeName(f.from[1]))}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-10 grid gap-8 border-t border-line pt-8 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold">{t.styleTitle.replace("{type}", lead)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.styles[reading.leading]}</p>
        </div>
        <div>
          <h3 className="font-semibold">{t.askTitle.replace("{type}", lead)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.ask[reading.leading]}</p>
        </div>
      </div>
      <p className="mt-8 border-t border-line pt-6 text-xs leading-relaxed text-muted">{t.note}</p>
    </Reveal>
  );
}
