import type { Dict } from "@/lib/i18n";

export interface AddonPrice { credits: number; card: string | null }

/**
 * On the credits page, above the packs: what one credit buys. The report's contents, as the landing page lists them,
 * and the three add-ons a credit can open from inside a report, with their credit and card prices.
 */
export function CreditsExplainer({ t, industries, prices }: { t: Dict; industries: number; prices: { industry: AddonPrice; best: AddonPrice; match: AddonPrice } }) {
  const b = t.billing, w = b.whatYouGet;
  const creditsOf = (n: number) => (n === 1 ? b.credit : b.credits.replace("{n}", String(n)));
  const addons = [
    { name: w.industry, text: w.industryText, price: prices.industry },
    { name: w.best, text: w.bestText.replace("{n}", String(industries)), price: prices.best },
    { name: w.match, text: w.matchText, price: prices.match },
  ];
  return (
    <section className="card overflow-hidden" aria-labelledby="what-you-get">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="p-7 sm:p-9">
          <p id="what-you-get" className="eyebrow !text-accent-text">{w.title}</p>
          <p className="mt-2 max-w-xl leading-relaxed text-ink-2">{w.lead}</p>
          <ul className="mt-7 space-y-4">
            {t.home.inside.map((item, i) => (
              <li key={item.title} className="flex gap-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-accent-ink">{i + 1}</span>
                <div>
                  <p className="font-semibold leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line bg-accent-soft/60 p-7 sm:p-9 lg:border-l lg:border-t-0">
          <p className="eyebrow !text-accent-text">{w.addonsTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{w.addonsLead}</p>
          <ul className="mt-6 divide-y divide-line">
            {addons.map((a) => (
              <li key={a.name} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.name}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{a.text}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-ink">{creditsOf(a.price.credits)}</p>
                  {a.price.card && <p className="mt-1.5 text-xs text-muted">{w.or.replace("{price}", a.price.card)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
