/**
 * The page for couples, where the couples ads send people ("How well do you really know your partner?"). It keeps the
 * ad's promise honestly: your own voice report first (free only while the offer is switched on), then a private link for your
 * partner, then the couple's report, with its price said plainly. The sample couple is drawn by the same code as a
 * real couple's report (lib/match.ts, lib/match-report.ts). English only, like the ads. Romantic in its own colours, wine
 * and blush (globals.css: .romance-page re-tints the site's tokens on this page only).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FreeReportBar } from "@/components/FreeReportBar";
import { Reveal } from "@/components/Motion";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { en } from "@/lib/i18n/en";
import { couplesEn as c } from "@/lib/i18n/couples-en";
import { CATEGORIES } from "@/lib/match";
import { matchCredits, matchPriceCents } from "@/lib/match-billing";
import { money } from "@/lib/money";
import { sampleCouple } from "@/lib/sample-couple";
import { isOpenHost } from "@/lib/visitor";

export const metadata: Metadata = { title: c.metaTitle, description: c.metaDescription, openGraph: { title: c.metaTitle, description: c.metaDescription } };

export default async function CouplesPage() {
  // English for every visitor, like the ads that lead here; the header and footer still follow the visitor's language.
  const t = en, locale = "en";
  const [{ userId }, billing, open] = await Promise.all([auth(), getSettings().catch(() => DEFAULT_SETTINGS), isOpenHost()]);
  const [coupleCents, coupleCredits] = await Promise.all([matchPriceCents(), matchCredits()]);
  const firstFree = (!billing.enabled || billing.freeFirstReport) && !open;
  const single = billing.packs.find((p) => p.audience === "user" && p.credits === 1);
  const reportPrice = single ? money(single.amountCents, billing.currency, locale) : "";
  const couplePrice = money(coupleCents, billing.currency, locale);
  const start = userId || open ? "/record" : "/sign-up";
  const startLabel = userId || open ? c.ctaSignedIn : firstFree ? c.ctaFree : c.cta;

  // The sample couple (lib/sample-couple.ts): the same Alex and Sam as the full sample couple's report it links to.
  const report = sampleCouple(t, locale)?.report ?? null;
  const preview = report ? [...report.categories].sort((x, y) => y.score - x.score).slice(0, 4) : [];
  const areas = CATEGORIES.map((key) => t.content.match.categories[key]).filter(Boolean);
  const ring = 2 * Math.PI * 42;
  // Two voices, intertwined: a rose wave and a peach one, the swell of speech growing and fading along them.
  const wave = (phase: number) => {
    let d = "M0 60";
    for (let x = 10; x <= 1200; x += 10) {
      const swell = Math.sin((x / 1200) * Math.PI) * (0.55 + 0.45 * Math.sin(x / 95));
      d += ` L${x} ${(60 + Math.sin(x / 38 + phase) * 34 * swell).toFixed(1)}`;
    }
    return d;
  };
  const glows = (
    <>
      <span className="romance-glow" style={{ top: -110, right: -70, width: 360, height: 360, background: "#e2557f" }} aria-hidden />
      <span className="romance-glow" style={{ top: 30, right: 150, width: 240, height: 240, background: "#f6a77f", animationDelay: "-7s" }} aria-hidden />
      <span className="romance-glow" style={{ bottom: -140, left: -80, width: 340, height: 340, background: "#8f2a5c", animationDelay: "-3s" }} aria-hidden />
      <svg className="romance-waves" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden>
        <path d={wave(0)} fill="none" stroke="#f6a9bf" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={wave(Math.PI)} fill="none" stroke="#f9c3a7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </>
  );
  const heart = <svg viewBox="0 0 24 22" className="mr-2 inline-block h-3 w-3 -translate-y-px align-middle" aria-hidden><path d="M12 21s-8.5-5.4-10.6-10.3C-0.2 6.3 3 1.5 7.4 2.1 9.5 2.4 11 3.9 12 5.6c1-1.7 2.5-3.2 4.6-3.5 4.4-.6 7.6 4.2 6 8.6C20.5 15.6 12 21 12 21z" fill="currentColor" /></svg>;

  return (
    <div className="romance-page space-y-20 pt-2 sm:pt-6">
      {firstFree && !userId && <FreeReportBar text={c.barText} cta={c.ctaFree} close={t.home.barClose} href={start} />}

      {/* The ad's question, the honest answer, and the way in on the first screen of a phone. */}
      <section className="cover px-7 pb-24 pt-12 sm:px-12 sm:pb-24 sm:pt-16">
        {glows}
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="cover-eyebrow">{firstFree && !userId ? <span className="offer-badge">💞 {c.offer}</span> : <>{heart}{c.eyebrow}</>}</p>
            <h1 className="gold-text sheen mt-5 pb-2 font-display text-[2.6rem] font-semibold leading-[1.04] sm:text-6xl">{c.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed sm:text-xl" style={{ color: "var(--cover-ink)" }}>{c.lead}</p>
            {/* The sample first: the lowest step to take, and the one that sells. Recording comes as a quiet line here and as the big button at the end. */}
            <div className="mt-7">
              <Link href="/couples/sample" data-track="couples: sample couple report" className="btn romance-cta btn-beacon w-full !px-9 !py-4 !text-lg sm:w-auto">{c.sample} →</Link>
              <p className="mt-3 text-xs sm:text-sm" style={{ color: "var(--cover-muted)" }}>{c.sampleNote}</p>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--cover-muted)" }}>{c.leadMore}</p>
            <Link href={start} data-track="couples: start" data-hero-cta className="mt-5 inline-block text-sm font-semibold hover:underline" style={{ color: "var(--cover-gold)" }}>{c.startQuiet} →</Link>
          </div>

          {report && (
            <div className="rounded-3xl border p-6 sm:p-7" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 30%, transparent)", background: "color-mix(in oklab, var(--cover-gold) 6%, transparent)" }}>
              <p className="cover-eyebrow">{c.previewEyebrow}</p>
              <div className="mt-4 flex items-center gap-5">
                <span className="relative grid h-24 w-24 shrink-0 place-items-center" role="img" aria-label={`${report.score} ${c.outOf}`}>
                  <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="color-mix(in oklab, var(--cover-gold) 20%, transparent)" strokeWidth="7" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--cover-gold)" strokeWidth="7" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - report.score / 100)} />
                  </svg>
                  <span className="relative font-display text-3xl font-semibold tabular-nums" style={{ color: "var(--cover-ink)" }}>{Math.round(report.score)}</span>
                </span>
                <div>
                  <p className="font-semibold" style={{ color: "var(--cover-ink)" }}>{c.previewNames.a} &amp; {c.previewNames.b}</p>
                  <p className="mt-1 text-sm leading-snug" style={{ color: "var(--cover-muted)" }}>{report.band.title}</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {preview.map((cat) => (
                  <li key={cat.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm" style={{ color: "var(--cover-ink)" }}><span>{cat.name}</span><span className="tabular-nums">{Math.round(cat.score)}</span></div>
                    <div className="mt-1.5 h-1.5 rounded-full" style={{ background: "color-mix(in oklab, var(--cover-gold) 18%, transparent)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, cat.score))}%`, background: "var(--cover-gold)" }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs" style={{ color: "var(--cover-muted)" }}>{c.previewNote}</p>
            </div>
          )}
        </div>
      </section>

      {/* Not astrology, not a quiz: what the voice reading is. */}
      <Reveal as="section" className="mx-auto max-w-3xl text-center">
        <p className="romance-not font-display text-3xl font-medium leading-snug sm:text-5xl">
          {c.notItems.map(([not, struck]) => <span key={struck} className="inline-block px-1.5">{not} <s>{struck}</s></span>)}
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">{c.notText}</p>
      </Reveal>

      {/* How it works: who records, who pays what. */}
      <Reveal as="section">
        <p className="eyebrow">{c.stepsEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{c.stepsTitle}</h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {c.steps.map((step, i) => (
            <li key={step.title} className="card p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-4xl text-accent-text">{String(i + 1).padStart(2, "0")}</p>
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">{i === 0 && !firstFree ? reportPrice : step.tag.replace("{price}", couplePrice)}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8"><Link href={start} data-track="couples: start (steps)" className="btn">{startLabel} →</Link></div>
      </Reveal>

      {/* What the couple's report reads. */}
      <Reveal as="section" className="soft-panel p-8 sm:p-12">
        <p className="eyebrow !text-accent-text">{c.areasEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium">{c.areasTitle}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{c.areasLead}</p>
        <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <li key={area.name} className="border-l-2 border-accent pl-4">
              <p className="font-semibold">{area.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{area.blurb}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-ink-2">{c.alsoFor}</p>
      </Reveal>

      {/* The price, all of it, and how the partner is treated. */}
      <Reveal as="section" className="grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 className="font-display text-3xl font-medium">{c.priceTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed">
            <li className="flex gap-3"><span className="text-accent-text" aria-hidden>✓</span><span>{firstFree ? c.priceYouFree : c.priceYou.replace("{price}", reportPrice)}</span></li>
            <li className="flex gap-3"><span className="text-accent-text" aria-hidden>✓</span><span>{c.pricePartner}</span></li>
            <li className="flex gap-3"><span className="text-accent-text" aria-hidden>✓</span><span>{c.priceCouple.replace("{price}", couplePrice).replace("{credits}", coupleCredits === 1 ? c.credit : c.credits.replace("{n}", String(coupleCredits)))}</span></li>
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="font-display text-3xl font-medium">{c.honestTitle}</h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-2">
            {c.honest.map((line) => <li key={line} className="flex gap-3"><span className="text-accent-text" aria-hidden>·</span><span>{line}</span></li>)}
          </ul>
        </div>
      </Reveal>

      <Reveal as="section" className="cover px-7 pb-24 pt-14 text-center sm:px-12">
        {glows}
        <h2 className="gold-text font-display text-4xl font-semibold sm:text-5xl">{c.closingTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed" style={{ color: "var(--cover-muted)" }}>{c.closing}</p>
        <Link href={start} data-track="couples: start (closing)" className="btn romance-cta mt-8 w-full !px-12 !py-5 !text-xl sm:w-auto sm:!text-2xl">{startLabel} →</Link>
        <p className="mt-2 text-xs" style={{ color: "var(--cover-muted)" }}>{firstFree ? c.ctaNote : c.ctaNoteNoOffer}</p>
      </Reveal>
    </div>
  );
}
