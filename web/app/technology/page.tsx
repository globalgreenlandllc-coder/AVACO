import type { Metadata } from "next";
import Link from "next/link";
import { CoverCapsules } from "@/components/CoverCapsules";
import { Reveal } from "@/components/Motion";
import { getDict } from "@/lib/i18n";
import { LEGAL } from "@/lib/legal";

/** The developer's published description of the method (see the Sources section). */
const METHOD_URL = "https://rikatv.kz/evrika/aktsii/voxera.html";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.technology.meta.title} · AVOCO`, description: t.technology.meta.description };
}

/**
 * How AVOCO reads a voice, and how far to trust it: public, for anyone deciding whether to record. The page claims
 * nothing that its Sources section doesn't back, and keeps the developer's figures apart from what the platform has
 * checked itself (lib/i18n/tech-*.ts).
 */
export default async function TechnologyPage() {
  const { t } = await getDict();
  const x = t.technology;
  const fill = (s: string) => s.replace("{operator}", LEGAL.operator);

  return (
    <div className="space-y-20 pt-2 sm:pt-6">
      {/* The report's own cover: what this page is, and the three facts that matter most. */}
      <section className="cover px-7 py-12 sm:px-12 sm:py-16">
        <CoverCapsules />
        <div className="relative max-w-3xl">
          <p className="cover-eyebrow">{x.hero.eyebrow}</p>
          <h1 className="gold-text sheen mt-5 pb-2 font-display text-5xl font-semibold leading-[1.02] sm:text-7xl">{x.hero.title}</h1>
          <p className="mt-6 text-lg leading-relaxed" style={{ color: "var(--cover-muted)" }}>{x.hero.lead}</p>
          <ul className="mt-8 space-y-2 text-sm sm:text-base" style={{ color: "var(--cover-ink)" }}>
            {x.hero.facts.map((fact) => <li key={fact} className="flex gap-3"><span aria-hidden style={{ color: "var(--cover-gold)" }}>✓</span><span>{fact}</span></li>)}
          </ul>
        </div>
      </section>

      <Reveal as="section" className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <p className="eyebrow">{x.voice.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{x.voice.title}</h2>
        </div>
        <div className="soft-panel space-y-4 p-7 sm:p-9">
          {x.voice.paras.map((p) => <p key={p} className="leading-relaxed text-ink-2">{p}</p>)}
        </div>
      </Reveal>

      <Reveal as="section">
        <p className="eyebrow">{x.measured.eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{x.measured.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{x.measured.lead}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {x.measured.items.map((item, i) => (
            <div key={item.title} className="card p-6">
              <p className="font-display text-3xl text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl rounded-2xl border border-accent px-5 py-4 text-sm font-medium leading-relaxed">{x.measured.note}</p>
      </Reveal>

      <Reveal as="section" className="card overflow-hidden">
        <p className="tab-title">{x.pipeline.eyebrow}</p>
        <div className="px-6 pb-8 pt-5 sm:px-10">
          <h2 className="font-display text-4xl font-medium">{x.pipeline.title}</h2>
          <ol className="mt-6 divide-y divide-line">
            {x.pipeline.steps.map((step, i) => (
              <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[4.5rem_1fr] sm:gap-6">
                <span className="font-display text-4xl leading-none text-accent-text">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-2">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal as="section" className="soft-panel grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow !text-accent-text">{x.origin.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-medium">{x.origin.title}</h2>
          <div className="mt-5 space-y-4">{x.origin.paras.map((p) => <p key={p} className="leading-relaxed text-ink-2">{fill(p)}</p>)}</div>
        </div>
        <div className="self-center">
          <ul className="grid gap-3">
            {x.origin.stats.map((s) => (
              <li key={s.label} className="card flex items-baseline gap-4 p-5">
                <span className="font-display text-4xl text-accent-text">{s.figure}</span>
                <span className="text-sm leading-snug text-ink-2">{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">{x.origin.statsNote}</p>
        </div>
      </Reveal>

      <Reveal as="section">
        <p className="eyebrow">{x.accuracy.eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{x.accuracy.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{x.accuracy.lead}</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <div className="card overflow-hidden">
            <p className="tab-title">{x.accuracy.developer.title}</p>
            <ul className="space-y-3 px-6 pb-4 pt-5">
              {x.accuracy.developer.items.map((item) => <li key={item} className="flex gap-3 leading-relaxed"><span className="mt-2.5 h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden /><span>{item}</span></li>)}
            </ul>
            <p className="mx-6 mb-6 rounded-2xl bg-accent-soft p-4 text-sm leading-relaxed">{x.accuracy.developer.note}</p>
          </div>
          <div className="card overflow-hidden">
            <p className="tab-title">{x.accuracy.ours.title}</p>
            <ul className="divide-y divide-line px-6 pb-2">
              {x.accuracy.ours.items.map((item) => (
                <li key={item.title} className="py-4">
                  <p className="font-semibold">✓ {item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>

      <Reveal as="section">
        <p className="eyebrow">{x.limits.eyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{x.limits.title}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[{ list: x.limits.is, mark: "✓" }, { list: x.limits.isNot, mark: "✕" }].map(({ list, mark }) => (
            <div key={list.title} className="card p-7">
              <h3 className="font-display text-3xl font-medium text-accent-text">{list.title}</h3>
              <ul className="mt-4 space-y-3">
                {list.items.map((item) => <li key={item} className="flex gap-3 leading-relaxed"><span aria-hidden className="font-semibold text-accent-text">{mark}</span><span>{item}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal as="section" className="gold-panel p-8 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{x.privacy.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-medium">{x.privacy.title}</h2>
          <ul className="mt-5 space-y-3">{x.privacy.items.map((item) => <li key={item} className="flex gap-3 leading-relaxed"><span aria-hidden>✓</span><span>{item}</span></li>)}</ul>
          <Link href="/privacy" className="mt-6 inline-block font-semibold underline underline-offset-4">{x.privacy.link} →</Link>
        </Reveal>
        <Reveal as="section" className="card p-8 sm:p-10">
          <p className="eyebrow">{x.tips.eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-medium">{x.tips.title}</h2>
          <ol className="mt-5 space-y-3">
            {x.tips.items.map((item, i) => <li key={item} className="flex gap-4 leading-relaxed"><span className="font-display text-2xl leading-none text-accent-text">{i + 1}</span><span>{item}</span></li>)}
          </ol>
        </Reveal>
      </div>

      <Reveal as="section" className="card p-8 sm:p-10">
        <p className="eyebrow">{x.sources.eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-medium">{x.sources.title}</h2>
        <ol className="mt-5 space-y-3 text-sm leading-relaxed text-ink-2">
          <li>1. {x.sources.method} · <a href={METHOD_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent-text hover:underline">{x.sources.open} ↗</a></li>
          <li>2. {x.sources.research}</li>
          <li>3. {x.sources.typology}</li>
          <li>4. {x.sources.tests}</li>
        </ol>
      </Reveal>

      <Reveal as="section" className="text-center">
        <h2 className="font-display text-4xl font-medium sm:text-5xl">{x.cta.title}</h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-2">{x.cta.text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/record" className="btn">{x.cta.record}</Link>
          <Link href="/sample" className="btn btn-quiet">{x.cta.sample}</Link>
        </div>
      </Reveal>
    </div>
  );
}
