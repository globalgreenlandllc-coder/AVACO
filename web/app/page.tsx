import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Bars } from "@/components/Bars";
import { Contact } from "@/components/Contact";
import { Reveal } from "@/components/Motion";
import { Radar } from "@/components/Radar";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { organizationJsonLd } from "@/lib/contact";
import { getDict } from "@/lib/i18n";
import { LEGAL } from "@/lib/legal";
import { money, packViews } from "@/lib/money";
import { baseUrl } from "@/lib/page";
import { psytypeRows, zoneOf } from "@/lib/report";
import { SAMPLE_PSY } from "@/lib/sample";

/**
 * The landing page: what a visitor sees before signing up. It sells one thing, "record 30 seconds, get your
 * report", and shows the real thing wherever it can: the sample profile's radar and bars are the same
 * components the report uses, and the price comes from the billing settings (so the page says "free for
 * now" while charging is off and the real price once it is on).
 */
export default async function Home() {
  const [{ locale, t }, { userId }, billing, origin] = await Promise.all([getDict(), auth(), getSettings().catch(() => DEFAULT_SETTINGS), baseUrl()]);
  const site = new URL(origin).host;
  const h = t.home;
  const start = userId ? "/record" : "/sign-up";
  const startLabel = userId ? h.cta : h.ctaSignedOut;

  const rows = psytypeRows(SAMPLE_PSY.map(([key, value]) => ({ key, label: key, value, zone: zoneOf(value) })), t);
  const leader = rows[0];
  const packs = packViews(billing.packs.filter((p) => p.audience === "user"), billing.currency, locale);
  const single = billing.packs.find((p) => p.audience === "user" && p.credits === 1);
  const price = single ? money(single.amountCents, billing.currency, locale) : packs[0]?.perReport;

  return (
    <div className="space-y-24 pt-2 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJsonLd(origin, LEGAL.operator, LEGAL.support) }} />
      {/* Hero: the report's own cover, with the sample profile's voice signature. */}
      <section className="cover px-7 py-12 sm:px-12 sm:py-16">
        <span className="cover-capsule drift" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <span className="cover-capsule drift hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)", animationDelay: "-3s" }} aria-hidden />
        <span className="cover-capsule drift" style={{ bottom: -90, left: "47%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />

        <div className="relative grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="cover-eyebrow">{h.eyebrow}</p>
            <h1 className="gold-text sheen mt-5 pb-2 font-display text-5xl font-semibold leading-[1.02] sm:text-7xl">{h.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "var(--cover-muted)" }}>{h.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={start} className="btn" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{startLabel}</Link>
              <Link href="/sample" className="btn btn-quiet" style={{ borderColor: "var(--cover-gold)", color: "var(--cover-gold)" }}>{h.sampleCta}</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: "var(--cover-muted)" }}>
              {h.facts.map((fact) => <li key={fact} className="flex items-center gap-2"><span aria-hidden style={{ color: "var(--cover-gold)" }}>✓</span>{fact}</li>)}
            </ul>
          </div>
          <div>
            <p className="cover-eyebrow text-center">{t.report.signature}</p>
            <Radar rows={rows} help={t.report.signatureHelp} />
            <p className="mt-2 text-center text-xs" style={{ color: "var(--cover-muted)" }}>{h.signatureNote.replace("{type}", leader.name)}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <Reveal as="section">
        <p className="eyebrow">{h.howEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{h.howTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {h.steps.map((step, i) => (
            <div key={step.title} className="card p-7">
              <p className="font-display text-4xl text-accent-text">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* The technology */}
      <Reveal as="section" className="soft-panel grid gap-8 p-8 sm:p-12 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow !text-accent-text">{h.techEyebrow}</p>
          <h2 className="mt-3 font-display text-4xl font-medium">{h.techTitle}</h2>
          <p className="mt-5 leading-relaxed text-ink-2">{h.tech}</p>
        </div>
        <ul className="grid gap-3 self-center sm:grid-cols-2">
          {h.techPoints.map((point) => (
            <li key={point.title} className="card p-5">
              <p className="font-display text-3xl text-accent-text">{point.figure}</p>
              <p className="mt-1 text-sm font-semibold">{point.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{point.text}</p>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* What the report contains, with a live piece of the sample report */}
      <Reveal as="section">
        <p className="eyebrow">{h.insideEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{h.insideTitle}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{h.insideLead}</p>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <ul className="space-y-4">
            {h.inside.map((item, i) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-accent-ink">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="card card-flow p-7 sm:p-9">
            <p className="eyebrow">{h.sample.eyebrow}</p>
            <p className="mt-2 text-sm text-ink-2">{h.teaserLead}</p>
            <div className="mt-5"><Bars rows={rows.slice(0, 4)} markers expandLabel={t.deep.ui.expand} /></div>
            <Link href="/sample" className="btn mt-6">{h.sampleCta}</Link>
          </div>
        </div>
      </Reveal>

      {/* The eight types */}
      <Reveal as="section">
        <p className="eyebrow">{h.typesEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{h.typesTitle}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-2">{h.typesLead}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(t.psytypes).map(([key, type]) => (
            <div key={key} className="card p-6">
              <h3 className="font-display text-2xl font-medium text-accent-text">{type.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{type.text}</p>
            </div>
          ))}
        </div>
        <Link href={start} className="btn mt-8">{h.typesCta}</Link>
      </Reveal>

      {/* Price */}
      <Reveal as="section" className="gold-panel p-8 sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{h.priceEyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{billing.enabled ? h.priceTitle.replace("{price}", price ?? "") : h.priceFreeTitle}</h2>
            <p className="mt-4 max-w-xl leading-relaxed opacity-90">{billing.enabled ? h.priceText : h.priceFreeText.replace("{price}", price ?? "")}</p>
            {billing.enabled && packs.length > 1 && (
              <ul className="mt-6 flex flex-wrap gap-3">
                {packs.map((p) => <li key={p.id} className="rounded-full border border-current/40 px-4 py-1.5 text-sm">{h.pack.replace("{n}", String(p.credits)).replace("{price}", p.price)}</li>)}
              </ul>
            )}
          </div>
          <Link href={start} className="btn" style={{ background: "var(--cover-bg)", color: "var(--cover-gold)" }}>{startLabel}</Link>
        </div>
      </Reveal>

      {/* Companies + privacy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal as="section" className="card p-8">
          <p className="eyebrow">{h.teamsEyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-medium">{h.teamsTitle}</h2>
          <p className="mt-3 leading-relaxed text-ink-2">{h.teams}</p>
          <Link href={userId ? "/w" : "/sign-up"} className="mt-5 inline-block font-semibold text-accent-text">{h.teamsCta} →</Link>
        </Reveal>
        <Reveal as="section" className="card p-8">
          <p className="eyebrow">{h.privacyEyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-medium">{h.privacyTitle}</h2>
          <p className="mt-3 leading-relaxed text-ink-2">{h.privacy}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <Link href="/privacy" className="text-accent-text">{h.privacyCta} →</Link>
            <Link href="/terms" className="text-ink-2 hover:text-ink">{h.termsCta}</Link>
          </div>
        </Reveal>
      </div>

      {/* Contact */}
      <Reveal as="section" id="contact" className="card p-8 sm:p-12">
        <Contact t={t.contact} email={LEGAL.support} site={site} locale={locale} signedIn={!!userId} />
      </Reveal>

      {/* Closing call */}
      <Reveal as="section" className="text-center">
        <h2 className="font-display text-4xl font-medium sm:text-5xl">{h.closingTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-2">{h.closing}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={start} className="btn">{startLabel}</Link>
          <Link href="/sample" className="btn btn-quiet">{h.sampleCta}</Link>
        </div>
        <p className="mt-6 text-xs text-muted">{h.disclaimer}</p>
      </Reveal>
    </div>
  );
}
