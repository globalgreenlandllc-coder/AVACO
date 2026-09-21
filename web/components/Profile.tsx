"use client";

import { useState } from "react";
import type { DetailSection, Rating, ScaleRow } from "@/lib/report";

interface Chapter { title: string; sections: DetailSection[] }

/** Sections before the first chapter form an opening one, named by `opening`; then one per `group`, in order. */
function chaptersOf(details: DetailSection[], opening: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const section of details) {
    const title = section.group ?? opening;
    const last = chapters.at(-1);
    if (last?.title === title) last.sections.push(section);
    else chapters.push({ title, sections: [section] });
  }
  return chapters;
}

function Hearts({ rating, delay }: { rating: Rating; delay: number }) {
  return (
    <span className="flex shrink-0 gap-1" role="img" aria-label={rating.label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className="heart h-5 w-5" style={{ animationDelay: `${delay + n * 60}ms`, fill: n <= rating.score ? "var(--accent)" : "var(--line)" }} aria-hidden>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ))}
    </span>
  );
}

/** One block of the report, in the shape of AVOCO's printed pages: a gold tab over a soft card. */
function SectionCard({ section, chipsOnGold }: { section: DetailSection; chipsOnGold: boolean }) {
  if (section.ratings) {
    return (
      <div className="[column-span:all]">
        {section.note && <p className="max-w-2xl text-sm leading-relaxed text-ink-2">{section.note}</p>}
        <ul className="mt-6 grid gap-x-12 sm:grid-cols-2">
          {section.ratings.map((rating, i) => (
            <li key={rating.name} className="flex items-center justify-between gap-4 border-b border-line py-3.5">
              <span className="min-w-0"><span className="block font-semibold">{rating.name}</span><span className="block text-sm text-ink-2">{rating.note}</span></span>
              <Hearts rating={rating} delay={i * 70} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.chips) {
    return (
      <div className={`mb-6 break-inside-avoid p-6 sm:p-7 ${chipsOnGold ? "gold-panel" : "soft-panel"}`}>
        <p className={`text-xs font-extrabold uppercase tracking-[0.12em] ${chipsOnGold ? "" : "text-accent-text"}`}>{section.title}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {section.chips.map((chip) => (
            <li key={chip} className={`rounded-full px-4 py-2 text-sm font-semibold ${chipsOnGold ? "bg-surface text-accent-text shadow-sm" : "bg-accent text-accent-ink"}`}>{chip}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="card mb-6 break-inside-avoid overflow-hidden">
      <p className="tab-title">{section.title}</p>
      <div className="px-6 pb-6 pt-4 sm:px-7">
        {section.note && <p className="mb-3 text-xs leading-relaxed text-muted">{section.note}</p>}
        {section.text && <p className="text-sm leading-relaxed text-ink-2">{section.text}</p>}
        {section.items && (
          <ul className="space-y-2 text-sm leading-relaxed text-ink-2">
            {section.items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden /><span>{item}</span></li>)}
          </ul>
        )}
        {section.quote && <p className="gold-panel mt-5 px-5 py-4 text-center text-xs font-extrabold uppercase leading-relaxed tracking-[0.1em]">{section.quote}</p>}
      </div>
    </div>
  );
}

function ChapterBody({ chapter }: { chapter: Chapter }) {
  const chipSections = chapter.sections.filter((s) => s.chips);
  // A section named like its chapter is the chapter's opening text: set wide, above the cards.
  const intro = chapter.sections.filter((s) => s.title === chapter.title && s.text);
  return (
    <>
      {intro.map((section) => (
        <p key={section.title} className="mb-8 gap-10 border-l-4 border-accent pl-6 leading-relaxed text-ink-2 sm:columns-2 sm:text-lg">{section.text}</p>
      ))}
      <div className="gap-6 sm:columns-2">
        {chapter.sections.filter((s) => !intro.includes(s)).map((section) => (
          <SectionCard key={section.title} section={section} chipsOnGold={chipSections.indexOf(section) % 2 === 0} />
        ))}
      </div>
    </>
  );
}

/**
 * The full reading of the types that lead a profile. On screen: one type and one chapter at a time, picked
 * with pills. In print every chapter of every type follows in order, as in AVOCO's original report.
 */
export function Profile({ rows, opening }: { rows: ScaleRow[]; opening: string }) {
  const [typeKey, setTypeKey] = useState(rows[0]?.key);
  const [chapterIndex, setChapterIndex] = useState(0);
  const current = rows.find((row) => row.key === typeKey) ?? rows[0];
  if (!current) return null;
  const chapters = chaptersOf(current.details, opening);
  const chapter = chapters[Math.min(chapterIndex, chapters.length - 1)];

  return (
    <div>
      <div className="no-print">
        {rows.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2" role="tablist">
            {rows.map((row) => (
              <button key={row.key} type="button" role="tab" aria-selected={row.key === current.key} className={`pill font-display !text-xl ${row.key === current.key ? "pill-on" : "pill-off"}`} onClick={() => { setTypeKey(row.key); setChapterIndex(0); }}>{row.name}</button>
            ))}
          </div>
        )}
        {chapters.length > 1 && (
          <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-3 sm:flex-wrap sm:overflow-visible" role="tablist">
            {chapters.map((c, i) => (
              <button key={c.title} type="button" role="tab" aria-selected={c === chapter} className={`pill ${c === chapter ? "pill-on" : "pill-off"}`} onClick={() => setChapterIndex(i)}>
                <span className="mr-2 tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>{c.title}
              </button>
            ))}
          </div>
        )}
        {chapter && (
          <div key={`${current.key}/${chapter.title}`} className="rise mt-6">
            <h3 className="mb-6 font-display text-3xl font-medium sm:text-4xl">{chapter.title}</h3>
            <ChapterBody chapter={chapter} />
          </div>
        )}
      </div>

      <div className="hidden print:block">
        {rows.map((row) => (
          <div key={row.key}>
            {rows.length > 1 && <h3 className="mb-2 mt-8 font-display text-4xl font-medium text-accent-text">{row.name}</h3>}
            {chaptersOf(row.details, opening).map((c, i) => (
              <div key={c.title} className="mt-8">
                <h4 className="mb-5 break-after-avoid font-display text-2xl font-medium"><span className="mr-3 text-accent-text">{String(i + 1).padStart(2, "0")}</span>{c.title}</h4>
                <ChapterBody chapter={c} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
