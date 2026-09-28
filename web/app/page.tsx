import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Bars } from "@/components/Bars";
import { Contact } from "@/components/Contact";
import { GiftForm } from "@/components/GiftForm";
import { GiftRibbon } from "@/components/GiftRibbon";
import { Reveal } from "@/components/Motion";
import { ScrollToHash } from "@/components/ScrollToHash";
import { Radar } from "@/components/Radar";
import { isAdminUser } from "@/lib/admin";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/billing";
import { giftPrice, MAX_BEST, MAX_INDUSTRIES, MAX_MATCHES, MAX_REPORTS } from "@/lib/gifts";
import { isOpenHost } from "@/lib/visitor";
import { bestPriceCents } from "@/lib/best-billing";
import { industryPriceCents } from "@/lib/industry-billing";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";
import { INDUSTRY_KEYS, topIndustries } from "@/lib/industries";
import { matchPriceCents } from "@/lib/match-billing";
import { matchFit } from "@/lib/match";
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
  const [{ locale, t }, { userId }, billing, origin, open] = await Promise.all([getDict(), auth(), getSettings().catch(() => DEFAULT_SETTINGS), baseUrl(), isOpenHost()]);
  const site = new URL(origin).host;
  // The gift builder's unit prices, and whether this person gives for free (charging off, or an admin).
  const [giftUnits, giftFree] = await Promise.all([giftPrice(1, 0, 0, billing), userId ? isAdminUser(userId) : Promise.resolve(false)]);
  const h = t.home;
  // On an open host (lib/visitor.ts) there is no account and no price: straight to the recorder.
  const start = userId || open ? "/record" : "/sign-up";
  const startLabel = userId || open ? h.cta : h.ctaSignedOut;

  const rows = psytypeRows(SAMPLE_PSY.map(([key, value]) => ({ key, label: key, value, zone: zoneOf(value) })), t);
  // The deeper readings, shown on the sample profile: the roles it would lead in one industry, and how it pairs with a warm partner.
  const sampleTypes = SAMPLE_PSY.map(([key, value]) => ({ key, value }));
  const teaser = industryTeaser("construction", sampleTypes, t);
  const exampleIndustry = teaser ? h.deeperExampleIndustry.replace("{industry}", teaser.name).replace("{roles}", teaser.roles.map((r) => `${r.name} ${r.score}`).join(" · ")) : "";
  // The best industry for the sample profile, and what each add-on costs (named on the page, so nobody is surprised inside a report).
  const industryName = new Map(industryNames(t).map((i) => [i.key, i.name]));
  const best = topIndustries(sampleTypes, 3, 2) ?? [];
  const exampleBest = best.length >= 3 ? h.deeperExampleBest.replace("{industry}", industryName.get(best[0].industry) ?? best[0].industry).replace("{score}", String(best[0].match)).replace("{second}", industryName.get(best[1].industry) ?? "").replace("{third}", industryName.get(best[2].industry) ?? "") : "";
  const [industryCents, bestCents, matchCents] = billing.enabled && !open ? await Promise.all([industryPriceCents(), bestPriceCents(), matchPriceCents()]) : [0, 0, 0];
  const addonPrices = billing.enabled && !open ? [industryCents, bestCents, matchCents].map((c) => money(c, billing.currency, locale)) : [];
  const partner = sampleTypes.map(({ key }) => ({ key, value: key === "harmonizer" ? 64 : key === "mediator" ? 45 : 11 }));
  const fit = matchFit(sampleTypes, partner);
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const exampleMatch = fit ? h.deeperExampleMatch.replace("{a}", typeName(fit.leaders[0])).replace("{b}", typeName(fit.leaders[1])).replace("{score}", String(fit.score)).replace("{verdict}", t.content.match.bands[fit.band].title) : "";
  const leader = rows[0];
  const packs = packViews(billing.packs.filter((p) => p.audience === "user"), billing.currency, locale);
  const single = billing.packs.find((p) => p.audience === "user" && p.credits === 1);
  const price = single ? money(single.amountCents, billing.currency, locale) : packs[0]?.perReport;

  return (
    <div className="space-y-24 pt-2 sm:pt-6">
      <ScrollToHash />
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
              {!open && <a href="#gift" className="btn btn-quiet" style={{ borderColor: "var(--cover-gold)", color: "var(--cover-gold)" }}>🎁 {t.gift.landing.cta}</a>}
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

      {/* A gift, right under the hero: the builder itself, in a card with the report cover's own dark-gold header. */}
      {!open && (
      <Reveal as="section" id="gift" className="card scroll-mt-24 overflow-hidden p-0">
        <div className="cover relative overflow-hidden rounded-none px-7 py-9 sm:px-12 sm:py-11">
          <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <GiftRibbon size={96} />
            <div>
              <p className="cover-eyebrow">{t.gift.landing.eyebrow}</p>
              <h2 className="gold-text mt-3 pb-1 font-display text-4xl font-semibold leading-[1.02] sm:text-5xl">{t.gift.landing.title}</h2>
              <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--cover-muted)" }}>{t.gift.landing.text}</p>
            </div>
            <ul className="space-y-2 text-sm lg:max-w-xs" style={{ color: "var(--cover-ink)" }}>
              {t.gift.landing.points.map((x) => <li key={x} className="flex gap-3"><span aria-hidden style={{ color: "var(--cover-gold)" }}>✓</span><span>{x}</span></li>)}
            </ul>
          </div>
        </div>
        <div className="p-8 sm:p-12">
          <GiftForm t={t.gift.form} defaultName="" reportCents={giftUnits.reportCents} industryCents={giftUnits.industryCents} matchCents={giftUnits.matchCents} bestCents={giftUnits.bestCents} maxBest={MAX_BEST} currency={giftUnits.currency} locale={locale} free={!billing.enabled || giftFree} signedIn={Boolean(userId)} signInHref="/sign-up?redirect_url=%2Fgift" maxReports={MAX_REPORTS} maxIndustries={MAX_INDUSTRIES} maxMatches={MAX_MATCHES} draftOwner={userId ?? "guest"} />
        </div>
      </Reveal>
      )}

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

      {/* One report, then further: the two deeper readings as the next steps, with live examples from the sample profile */}
      <Reveal as="section" className="soft-panel p-8 sm:p-12">
        <p className="eyebrow !text-accent-text">{h.deeperEyebrow}</p>
        <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{h.deeperTitle}</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{h.deeperLead}</p>
        <ol className="mt-8 flex flex-wrap items-center gap-2 text-sm font-semibold">
          {h.deeperSteps.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className={`rounded-full px-4 py-2 ${i === 0 ? "bg-accent text-accent-ink" : "border border-accent text-accent-text"}`}>{step}</span>
              {i < h.deeperSteps.length - 1 && <span className="text-accent-text" aria-hidden>→</span>}
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {h.deeper.map((d, i) => (
            <div key={d.title} className="card flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <p className="tab-title">{d.title}</p>
                {addonPrices[i] && <span className="mr-5 mt-4 rounded-full border border-accent px-3 py-1 text-xs font-bold text-accent-text">{addonPrices[i]}</span>}
              </div>
              <p className="px-6 pt-4 text-sm leading-relaxed text-ink-2">{d.text.replace("{n}", String(INDUSTRY_KEYS.length))}</p>
              <div className="mx-6 mb-6 mt-auto pt-5">
                <div className="rounded-2xl bg-accent-soft p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-text">{h.deeperExample}</p>
                  <p className="mt-2 text-sm leading-relaxed">{[exampleIndustry, exampleBest, exampleMatch][i]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">{h.deeperNote}</p>
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

      {/* Price (not on an open host, where everything is free) */}
      {!open && <Reveal as="section" className="gold-panel p-8 sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{h.priceEyebrow}</p>
            <h2 className="mt-3 font-display text-4xl font-medium sm:text-5xl">{billing.enabled ? h.priceTitle.replace("{price}", price ?? "") : h.priceFreeTitle}</h2>
            <p className="mt-4 max-w-xl leading-relaxed opacity-90">{billing.enabled ? h.priceText : h.priceFreeText.replace("{price}", price ?? "")}</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-80">{h.priceAfter}</p>
            {billing.enabled && packs.length > 1 && (
              <ul className="mt-6 flex flex-wrap gap-3">
                {packs.map((p) => <li key={p.id} className="rounded-full border border-current/40 px-4 py-1.5 text-sm">{h.pack.replace("{n}", String(p.credits)).replace("{price}", p.price)}</li>)}
              </ul>
            )}
          </div>
          <Link href={start} className="btn" style={{ background: "var(--cover-bg)", color: "var(--cover-gold)" }}>{startLabel}</Link>
        </div>
      </Reveal>}

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
        <Contact t={t.contact} email={LEGAL.support} site={site} locale={locale} signedIn={!!userId || open} />
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
