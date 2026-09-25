/**
 * The partner page: record and read a report with no account and no charge. Served only on the
 * partner host (proxy.ts sends any other host away), so it never shows up on the main domain.
 */
import { Recorder } from "@/components/Recorder";
import { PartnerHistory, PartnerForget } from "@/components/PartnerHistory";
import { getDict } from "@/lib/i18n";

export const metadata = { robots: { index: false, follow: false } };

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ forget?: string }> }) {
  const [{ forget }, { t, locale }] = await Promise.all([searchParams, getDict()]);
  const p = t.partners;
  return (
    <div className="space-y-10">
      {forget && <PartnerForget id={forget} />}
      <section className="cover relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16">
        <span className="cover-capsule" style={{ top: -90, right: "5%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <span className="cover-capsule hidden sm:block" style={{ top: -90, right: "5%", width: 44, height: 190, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 55%, transparent)" }} aria-hidden />
        <p className="cover-eyebrow relative">{t.brand} · {p.eyebrow}</p>
        <h1 className="gold-text relative mt-6 max-w-3xl pb-2 font-display text-5xl font-semibold leading-[0.98] sm:text-7xl">{p.title}</h1>
        <p className="relative mt-6 max-w-2xl leading-relaxed sm:text-lg" style={{ color: "var(--cover-muted)" }}>{p.lead}</p>
        <ol className="relative mt-8 flex flex-wrap gap-3">
          {p.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 45%, transparent)" }}>
              <span className="font-display text-xl" style={{ color: "var(--cover-gold)" }}>{i + 1}</span>{step}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="font-display text-4xl font-medium">{t.record.title}</h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-2">{t.record.lead}</p>
          <div className="mt-8">
            <Recorder t={t.record} uploadUrl="/api/partners/upload-token" createUrl="/api/partners/recordings" doneUrl="/partners/r/{id}" consentText={p.consent} limitText={p.limit} />
          </div>
        </section>
        <aside className="space-y-6 lg:pt-16">
          <PartnerHistory title={p.recent} empty={p.recentEmpty} open={t.reports.open} locale={locale} />
          <div>
            <p className="eyebrow">{t.record.promptsTitle}</p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
              {t.record.prompts.map((prompt) => <li key={prompt} className="border-l border-line pl-4">{prompt}</li>)}
            </ul>
          </div>
        </aside>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-muted">{p.note}</p>
    </div>
  );
}
