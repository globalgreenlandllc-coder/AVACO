"use client";

import { useState } from "react";
import type { DetailSection, ScaleRow, Zone } from "@/lib/report";

const FILL: Record<Zone, string> = { leading: "var(--bar-leading)", active: "var(--bar-active)", background: "var(--bar-background)" };

/** Titled blocks of report content: text, bullet lists, pills, a set-apart quote, compatibility ratings. */
export function Sections({ sections }: { sections: DetailSection[] }) {
  return (
    <>
      {sections.map((section, n) => {
        const startsChapter = section.group && section.group !== sections[n - 1]?.group;
        const isChapterIntro = section.title === section.group;
        return (
          <div key={`${section.group ?? ""}/${section.title}`}>
            {startsChapter && <h4 className="mb-4 mt-6 border-t border-line pt-6 font-display text-2xl font-medium">{section.group}</h4>}
            {!isChapterIntro && <p className="eyebrow">{section.title}</p>}
            {section.note && <p className="mt-1.5 text-xs leading-relaxed text-muted">{section.note}</p>}
            {section.text && <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{section.text}</p>}
            {section.items && (
              <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-ink-2">
                {section.items.map((item) => <li key={item} className="flex gap-2"><span className="text-accent" aria-hidden>·</span><span>{item}</span></li>)}
              </ul>
            )}
            {section.chips && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {section.chips.map((chip) => <li key={chip} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-2">{chip}</li>)}
              </ul>
            )}
            {section.quote && <p className="mt-3 border-l-2 border-accent pl-4 font-display text-xl leading-snug">{section.quote}</p>}
            {section.ratings && (
              <ul className="mt-3 grid gap-x-10 gap-y-2 sm:grid-cols-2">
                {section.ratings.map((rating) => (
                  <li key={rating.name} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 text-sm">
                    <span><span className="font-medium">{rating.name}</span> <span className="text-ink-2">· {rating.note}</span></span>
                    <span className="shrink-0 tracking-widest" role="img" aria-label={rating.label}>
                      <span className="text-accent">{"●".repeat(rating.score)}</span><span className="text-line">{"●".repeat(5 - rating.score)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * Horizontal bars on a 0 to 100 scale. One hue; the zone sets the step and is always written out as
 * text too, so nothing depends on colour alone. Clicking a row opens its full explanation.
 * The data attributes name the parts for the downloaded copy's script (lib/export.ts).
 * In print, leading and active types and every emotional scale are open; background types keep their
 * one-line description, as in AVOCO's original report, which profiles only the types that matter for the person.
 * Rows named in `profiled` have their explanation shown elsewhere (the Profile), so they don't open here.
 */
export function Bars({ rows, markers = false, expandLabel, defaultOpen, profiled = [] }: { rows: ScaleRow[]; markers?: boolean; expandLabel: string; defaultOpen?: string; profiled?: string[] }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);

  return (
    <ul data-bars className="space-y-1">
      {rows.map((row, i) => {
        const expandable = row.details.length > 0 && !profiled.includes(row.key);
        const isOpen = open === row.key;
        const head = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-2 font-medium">
                {row.name}
                {expandable && <span data-row-chevron className={`no-print text-xs text-muted transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>›</span>}
              </span>
              <span className="flex items-baseline gap-3">
                {row.tag && <span className="text-xs text-muted">{row.tag}</span>}
                <span className="w-10 text-right font-semibold tabular-nums">{row.value}</span>
              </span>
            </span>
            <span className="relative mt-2 block h-2.5 rounded-r-full bg-track" role="img" aria-label={`${row.name}: ${row.value} / 100`}>
              <span className="bar-fill block h-full rounded-r-full" style={{ width: `${Math.max(0, Math.min(100, row.value))}%`, background: FILL[row.zone ?? "leading"], animationDelay: `${i * 50}ms` }} />
              {markers && [30, 50].map((mark) => <span key={mark} className="absolute -top-1 h-4 w-px bg-ink-2/40" style={{ left: `${mark}%` }} aria-hidden />)}
            </span>
            {row.text && <span data-row-summary className={`mt-2 text-sm leading-relaxed text-ink-2 ${isOpen ? "hidden" : "block"} ${row.zone === "background" || !expandable ? "print:block" : "print:hidden"}`}>{row.text}</span>}
          </>
        );

        return (
          <li key={row.key} data-row className={`-mx-3 break-inside-avoid-page rounded-xl px-3 py-2.5 transition-colors ${isOpen ? "bg-track/50" : "hover:bg-track/40"}`}>
            {expandable
              ? <button type="button" data-row-toggle className="block w-full text-left" aria-expanded={isOpen} aria-label={`${row.name}: ${expandLabel}`} onClick={() => setOpen(isOpen ? null : row.key)}>{head}</button>
              : <div>{head}</div>}

            {expandable && (
              <div data-row-details className={`${isOpen ? "block" : "hidden"} space-y-4 pb-2 pt-4 ${row.zone === "background" ? "" : "print:block"}`}>
                <Sections sections={row.details} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
