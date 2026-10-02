/**
 * The partner page's couple's report, offered among the report's add-ons (app/partners/r/[id]): free there, no account,
 * in the relationship add-on's own rose colours. It opens app/partners/couple with this report as the first voice.
 */
import Link from "next/link";
import type { Dict } from "@/lib/i18n";

export function PartnerCoupleCard({ t, kinds, href }: { t: Dict["partners"]["couple"]; kinds: string[]; href: string }) {
  return (
    <div className="theme-match">
      <section className="cover px-7 py-10 sm:px-12 sm:py-12">
        <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 12%, transparent)" }} aria-hidden />
        <p className="cover-eyebrow">{t.eyebrow}</p>
        <h2 className="gold-text mt-4 pb-1 font-display text-4xl font-semibold leading-[1.02] sm:text-5xl">{t.title}</h2>
        <p className="mt-4 max-w-2xl leading-relaxed sm:text-lg" style={{ color: "var(--cover-muted)" }}>{t.text}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {kinds.map((k) => <li key={k} className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: "color-mix(in oklab, var(--cover-gold) 40%, transparent)", color: "var(--cover-ink)" }}>{k}</li>)}
        </ul>
        <Link href={href} data-track="partners: pair" className="btn mt-7" style={{ background: "var(--cover-gold)", color: "var(--cover-bg)" }}>{t.cta} →</Link>
      </section>
    </div>
  );
}
