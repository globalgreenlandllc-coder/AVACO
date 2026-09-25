import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import type { LegalSection, LegalTable } from "@/lib/i18n/legal-en";
import { fillLegal, LEGAL, LEGAL_SLUGS, type LegalVars } from "@/lib/legal";

/**
 * One layout for both legal documents: a plain-language summary first, then a numbered contents list
 * (sticky beside the text on wide screens, folded above it on phones) and the sections with anchors.
 * Text comes from the dictionary, so it follows the language menu; anchors come from lib/legal.ts.
 */
type Kind = keyof typeof LEGAL_SLUGS;
type Fill = (s: string) => string;

/** The "last updated" date in the reader's language, from the ISO date in LEGAL. */
function updatedOn(locale: Locale): string {
  const tag = locale === "en" ? "en-GB" : locale === "ru" ? "ru-RU" : locale;
  const date = new Date(`${LEGAL.updated}T00:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
  try {
    return new Intl.DateTimeFormat(tag, opts).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(date);
  }
}

export function LegalDoc({ kind, t, locale, vars, signedIn }: { kind: Kind; t: Dict; locale: Locale; vars: LegalVars; signedIn: boolean }) {
  const l = t.legal;
  const doc = l[kind];
  const slugs = LEGAL_SLUGS[kind];
  const f: Fill = (s) => fillLegal(s, { ...vars, updated: updatedOn(locale) });
  const other = kind === "privacy" ? { href: "/terms", label: l.controls.terms } : { href: "/privacy", label: l.controls.privacy };

  const contents = (
    <ol className="mt-3 space-y-1.5 text-sm">
      {doc.sections.map((s, i) => (
        <li key={slugs[i]}>
          <a href={`#${slugs[i]}`} className="flex gap-2 text-ink-2 hover:text-ink">
            <span className="w-5 shrink-0 tabular-nums text-muted">{i + 1}</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  const controls = (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-text">{l.controls.title}</p>
      <ul className="mt-3 space-y-2.5 text-sm">
        <li><Link href={signedIn ? "/reports" : "/sign-in"} className="text-ink-2 hover:text-ink">{l.controls.reports}</Link></li>
        <li><a href={`mailto:${LEGAL.email}`} className="text-ink-2 hover:text-ink">{l.controls.email}</a></li>
        <li><Link href={other.href} className="text-ink-2 hover:text-ink">{other.label}</Link></li>
      </ul>
    </div>
  );

  return (
    <article className="space-y-10">
      <header className="max-w-3xl">
        <p className="eyebrow">{l.nav.legal}</p>
        <h1 className="mt-3 font-display text-5xl font-medium sm:text-6xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-muted">{f(l.updated)}</p>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">{f(doc.lead)}</p>
        {locale !== "en" && <p className="mt-3 text-xs text-muted">{l.languageNote}</p>}
      </header>

      <section className="soft-panel p-7 sm:p-9">
        <p className="eyebrow !text-accent-text">{l.inShort}</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {doc.inShort.map((line) => (
            <li key={line} className="flex gap-3 text-sm leading-relaxed">
              <span aria-hidden className="mt-0.5 text-accent-text">✓</span>
              <span>{f(line)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted">{l.inShortNote}</p>
      </section>

      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="no-print space-y-4 lg:sticky lg:top-6 lg:self-start">
          <details className="card p-5 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold">{l.contents}</summary>
            {contents}
          </details>
          <div className="hidden lg:block">
            <p className="eyebrow">{l.contents}</p>
            {contents}
          </div>
          {controls}
        </aside>

        <div className="min-w-0 space-y-12">
          {doc.sections.map((section, i) => <Section key={slugs[i]} id={slugs[i]} n={i + 1} section={section} f={f} />)}
          <footer className="no-print flex flex-wrap gap-3 border-t border-line pt-8">
            <Link href={other.href} className="btn btn-quiet">{other.label}</Link>
            <Link href="/" className="btn btn-quiet">{t.home.sample.back}</Link>
          </footer>
        </div>
      </div>
    </article>
  );
}

function Section({ id, n, section, f }: { id: string; n: number; section: LegalSection; f: Fill }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-3xl font-medium">
        <span className="mr-3 text-accent-text">{n}.</span>
        {section.title}
      </h2>
      <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
        {section.paras.map((p) => <p key={p}>{f(p)}</p>)}
        {section.bullets && (
          <ul className="space-y-3">
            {section.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <Bullet text={f(b)} />
              </li>
            ))}
          </ul>
        )}
        {section.table && <Table table={section.table} f={f} />}
        {section.after?.map((p) => <p key={p}>{f(p)}</p>)}
      </div>
    </section>
  );
}

/** A bullet that opens with a short label ("Account data. When you sign up…") gets the label in bold. */
function Bullet({ text }: { text: string }) {
  const m = /^([^.:]{2,48}[.:])\s(.+)$/s.exec(text);
  if (!m) return <span>{text}</span>;
  return <span><strong className="font-semibold text-ink">{m[1]}</strong> {m[2]}</span>;
}

function Table({ table, f }: { table: LegalTable; f: Fill }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="bg-surface">
            {table.head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-t border-line align-top">
              {row.map((cell, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? "font-semibold text-ink" : ""}`}>{f(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
