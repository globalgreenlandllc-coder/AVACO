/**
 * The page for couples, where the couples ads send people ("How well do you really know your partner?"). It keeps the
 * ad's promise honestly: your own voice report first (free only while the offer is switched on), then a private link for your
 * partner, then the couple's report, with its price said plainly. The sample couple is drawn by the same code as a
 * real couple's report (lib/match.ts, lib/match-report.ts). English only, like the ads. Built as a lab in the colours of
 * two voices, rose and cyan: the voices move behind the whole page (VoiceField) and around the sample couple's score
 * (ResonanceCore). globals.css: .romance-page re-tints the site's tokens on this page only; the .lab-* classes are its own.
 */
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FreeReportBar } from "@/components/FreeReportBar";
import { CountUp, CursorGlow, Reveal, ScrollProgress, Tilt } from "@/components/Motion";
import { ResonanceCore } from "@/components/ResonanceCore";
import { VoiceField } from "@/components/VoiceField";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { en } from "@/lib/i18n/en";
import { couplesEn as c } from "@/lib/i18n/couples-en";
import { CATEGORIES } from "@/lib/match";
import { matchCredits, matchPriceCents } from "@/lib/match-billing";
import { money } from "@/lib/money";
import { sampleCouple } from "@/lib/sample-couple";
import { isOpenHost } from "@/lib/visitor";

export const metadata: Metadata = { title: c.metaTitle, description: c.metaDescription, openGraph: { title: c.metaTitle, description: c.metaDescription } };

/** The three steps, each with its sign: a voice being recorded, a link on a phone, two rings crossing. */
const STEP_ICONS = [
  <svg key="voice" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" /></svg>,
  <svg key="link" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 12.5l3-3M10 9.5h.01M14 15h.01M11 18.5h2" /></svg>,
  <svg key="fit" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /><path d="M12 9.2v5.6" /></svg>,
];

/** The scan of the nine areas: its radius, and the room round it for the numbers. */
const SCAN = 120, SCAN_BOX = 160;

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
  const sampleScore = new Map(report?.categories.map((cat) => [cat.key, cat.score] as [string, number]));
  const areas = CATEGORIES.map((key) => ({ key, text: t.content.match.categories[key], score: sampleScore.get(key) ?? null })).filter((area) => area.text);
  const stats = [
    { n: 30, unit: c.secondsUnit, label: c.stats.seconds },
    { n: 0, unit: "", label: c.stats.words },
    { n: areas.length, unit: "", label: c.stats.areas },
    { n: 100, unit: "", label: c.stats.points },
  ];
  // The scan: one spoke per area, clockwise from the top; a point at a distance along its spoke.
  const at = (i: number, r: number) => { const a = (i / areas.length) * 2 * Math.PI - Math.PI / 2; return { x: Number((Math.cos(a) * r).toFixed(1)), y: Number((Math.sin(a) * r).toFixed(1)) }; };
  const outline = (r: (i: number) => number) => areas.map((_, i) => at(i, r(i))).map((p) => `${p.x},${p.y}`).join(" ");
  const sweep = at(1, SCAN);
  const number = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className="romance-page lab pt-2 sm:pt-4">
      {/* The ad's question, the honest answer, and the way in on the first screen of a phone; the two voices beside them. */}
      <section className="lab-hero bleed">
        <div className="lab-wrap grid items-center gap-12 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
          <div>
            {firstFree && !userId ? <p className="cover-eyebrow"><span className="offer-badge">💞 {c.offer}</span></p> : <p className="hud hud-chip"><span className="hud-live" aria-hidden />{c.eyebrow}</p>}
            <h1 className="lab-title mt-6">{c.titleLead} <span className="gold-text sheen glitch pb-[0.12em]" data-text={c.titleGlow}>{c.titleGlow}</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">{c.lead}</p>
            {/* The sample first: the lowest step to take, and the one that sells. Recording comes as a quiet line here and as the big button at the end. */}
            <div className="mt-8">
              <Link href="/couples/sample" data-track="couples: sample couple report" className="btn btn-beacon lab-cta w-full sm:w-auto">{c.sample} →</Link>
              <p className="mt-3 text-xs text-muted sm:text-sm">{c.sampleNote}</p>
            </div>
            <ul className="lab-facts hud mt-7">{c.heroFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-base">{c.leadMore}</p>
            <Link href={start} data-track="couples: start" data-hero-cta className="mt-4 inline-block font-semibold text-accent-text hover:underline">{c.startQuiet} →</Link>
          </div>

          {report && <ResonanceCore score={report.score} names={c.previewNames} rows={preview.map((cat) => ({ name: cat.name, score: cat.score }))} t={{ eyebrow: c.previewEyebrow, outOf: c.outOf, band: report.band.title, note: c.previewNote }} />}
        </div>
        <p className="lab-scroll hud" aria-hidden>{c.scroll}</p>
      </section>

      {/* What is measured in a voice, and what the couple's report reads from it, running by. Said in full further down, so it is decoration here. */}
      <div className="lab-strip bleed no-print" aria-hidden>
        <div className="marquee">
          <div className="marquee-track text-2xl sm:text-4xl">
            {Array.from({ length: 6 }, (_, copy) => c.signals.map((word, i) => <span key={`${copy}-${word}`} className="marquee-word" data-outline={(copy * c.signals.length + i) % 2 ? "" : undefined}>{word}</span>))}
          </div>
        </div>
        <div className="marquee">
          <div className="marquee-track hud text-muted" data-reverse>
            {Array.from({ length: 4 }, (_, copy) => areas.map((area) => <span key={`${copy}-${area.key}`} className="pe-10 whitespace-nowrap">{area.text.name}</span>))}
          </div>
        </div>
      </div>

      {/* Not astrology, not a quiz: what the voice reading is, and its four figures. */}
      <Reveal as="section" className="mx-auto max-w-4xl text-center">
        <p className="lab-not font-display text-3xl font-semibold leading-tight sm:text-5xl">
          {c.notItems.map(([not, struck], i) => <span key={struck} className="inline-block px-1.5">{not} <s style={{ "--i": i } as CSSProperties}>{struck}</s></span>)}
        </p>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">{c.notText}</p>
        <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={stat.label} className="card lab-stat">
              <p className="lab-figure"><CountUp value={stat.n} whenSeen />{stat.unit && <small>{stat.unit}</small>}</p>
              <p className="mt-2 text-sm leading-snug text-ink-2">{stat.label}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* How it works: who records, who pays what. */}
      <Reveal as="section">
        <p className="eyebrow">{c.stepsEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{c.stepsTitle}</h2>
        <ol className="lab-steps mt-10">
          {c.steps.map((step, i) => (
            <Tilt as="li" key={step.title} className="card lab-step">
              <div className="flex items-center justify-between gap-3">
                <span className="lab-step-icon" aria-hidden>{STEP_ICONS[i]}</span>
                <span className="hud lab-tag">{i === 0 && !firstFree ? reportPrice : step.tag.replace("{price}", couplePrice)}</span>
              </div>
              <p className="hud mt-6 text-muted">{c.step} {number(i)}</p>
              <h3 className="mt-1.5 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
            </Tilt>
          ))}
        </ol>
        <div className="mt-9"><Link href={start} data-track="couples: start (steps)" className="btn">{startLabel} →</Link></div>
      </Reveal>

      {/* What the couple's report reads: the nine areas, with the sample couple's scan of them. */}
      <Reveal as="section" className="soft-panel p-7 sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow">{c.areasEyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">{c.areasTitle}</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{c.areasLead}</p>
            <p className="mt-5 text-sm text-muted">{c.alsoFor}</p>
          </div>
          {report && (
            <figure>
              <svg viewBox={`${-SCAN_BOX} ${-SCAN_BOX} ${SCAN_BOX * 2} ${SCAN_BOX * 2}`} className="lab-scan" role="img" aria-label={areas.filter((area) => area.score !== null).map((area) => `${area.text.name} ${Math.round(area.score ?? 0)}`).join(", ")}>
                <defs>
                  <radialGradient id="scan-fill" gradientUnits="userSpaceOnUse" cx="0" cy="0" r={SCAN}><stop offset="0%" stopColor="var(--neon-2)" stopOpacity="0.1" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0.5" /></radialGradient>
                  <linearGradient id="scan-sweep" gradientUnits="userSpaceOnUse" x1="0" y1={-SCAN} x2={sweep.x} y2={sweep.y}><stop offset="0%" stopColor="var(--neon-2)" stopOpacity="0" /><stop offset="100%" stopColor="var(--neon-2)" stopOpacity="0.35" /></linearGradient>
                </defs>
                {[40, 80, SCAN].map((r) => <polygon key={r} points={outline(() => r)} fill="none" stroke="var(--muted)" strokeOpacity={r === SCAN ? 0.5 : 0.3} strokeDasharray={r === SCAN ? undefined : "3 5"} />)}
                {areas.map((area, i) => { const edge = at(i, SCAN); return <line key={area.key} x1="0" y1="0" x2={edge.x} y2={edge.y} stroke="var(--muted)" strokeOpacity="0.22" />; })}
                <g className="orbit" style={{ animationDuration: "7s" }}><path d={`M0,0 L0,${-SCAN} A${SCAN},${SCAN} 0 0,1 ${sweep.x},${sweep.y} Z`} fill="url(#scan-sweep)" /></g>
                <polygon className="radar-shape" points={outline((i) => ((areas[i].score ?? 0) / 100) * SCAN)} fill="url(#scan-fill)" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 10px var(--accent))" }} />
                {areas.map((area, i) => {
                  const dot = at(i, ((area.score ?? 0) / 100) * SCAN), label = at(i, SCAN + 22);
                  return (
                    <g key={area.key}>
                      <circle className="radar-dot" style={{ animationDelay: `${1.1 + i * 0.06}s` }} cx={dot.x} cy={dot.y} r="4" fill="#fff" stroke="var(--accent)" strokeWidth="2" />
                      <text x={label.x} y={label.y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent-text)" style={{ fontFamily: "var(--font-hud), ui-monospace, monospace" }}>{number(i)}</text>
                    </g>
                  );
                })}
              </svg>
              <figcaption className="mx-auto mt-2 max-w-sm text-center text-xs leading-relaxed text-muted">{c.scanNote}</figcaption>
            </figure>
          )}
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, i) => (
            <li key={area.key} className="lab-area">
              <p className="hud flex items-baseline justify-between gap-3"><span className="text-accent-text">{number(i)}</span>{area.score !== null && <span className="text-muted">{c.sampleScore} {Math.round(area.score)}</span>}</p>
              <p className="mt-2 font-semibold">{area.text.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{area.text.blurb}</p>
              {area.score !== null && <span className="lab-area-bar" aria-hidden><i style={{ width: `${Math.max(4, Math.min(100, area.score))}%`, "--i": i } as CSSProperties} /></span>}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* The price, all of it, and how the partner is treated. */}
      <Reveal as="section" className="grid gap-6 lg:grid-cols-2">
        <Tilt className="card p-8">
          <h2 className="font-display text-3xl font-semibold">{c.priceTitle}</h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed">
            <li className="flex gap-3"><span className="lab-check" aria-hidden>✓</span><span>{firstFree ? c.priceYouFree : c.priceYou.replace("{price}", reportPrice)}</span></li>
            <li className="flex gap-3"><span className="lab-check" aria-hidden>✓</span><span>{c.pricePartner}</span></li>
            <li className="flex gap-3"><span className="lab-check" aria-hidden>✓</span><span>{c.priceCouple.replace("{price}", couplePrice).replace("{credits}", coupleCredits === 1 ? c.credit : c.credits.replace("{n}", String(coupleCredits)))}</span></li>
          </ul>
        </Tilt>
        <Tilt className="card p-8">
          <h2 className="font-display text-3xl font-semibold">{c.honestTitle}</h2>
          <ul className="mt-6 space-y-4 text-sm leading-relaxed text-ink-2">
            {c.honest.map((line) => <li key={line} className="flex gap-3"><span className="lab-check" aria-hidden>✓</span><span>{line}</span></li>)}
          </ul>
        </Tilt>
      </Reveal>

      <Reveal as="section" className="cover lab-closing">
        <span className="lab-floor" aria-hidden />
        <span className="lab-rings" aria-hidden><i /><i /><i /></span>
        <h2 className="gold-text sheen mx-auto max-w-3xl pb-2 font-display text-4xl font-bold sm:text-6xl">{c.closingTitle}</h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed" style={{ color: "var(--cover-muted)" }}>{c.closing}</p>
        <Link href={start} data-track="couples: start (closing)" className="btn btn-beacon lab-cta lab-cta-xl mt-9 w-full sm:w-auto">{startLabel} →</Link>
        <p className="hud mt-6" style={{ color: "var(--cover-muted)" }}>{firstFree ? c.ctaNote : c.ctaNoteNoOffer}</p>
      </Reveal>

      {/* The page's fixed layers, last so the sections above keep their own spacing: the voices behind everything, the light under the pointer, the reading line, the offer bar. */}
      <VoiceField />
      <CursorGlow />
      <ScrollProgress />
      {firstFree && !userId && <FreeReportBar text={c.barText} cta={c.ctaFree} close={t.home.barClose} href={start} />}
    </div>
  );
}
