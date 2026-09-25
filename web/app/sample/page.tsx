import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ReportView } from "@/components/ReportView";
import { formatDate, getDict } from "@/lib/i18n";
import { SAMPLE_RECORDED_AT, sampleReport } from "@/lib/sample";

/** A complete report anyone can read before signing up: the one the landing page advertises. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: `${t.home.sample.title} · ${t.brand}`, description: t.home.sample.lead };
}

export default async function SamplePage() {
  const [{ locale, t }, { userId }] = await Promise.all([getDict(), auth()]);
  const s = t.home.sample;
  const start = userId ? "/record" : "/sign-up";

  return (
    <div className="space-y-8">
      <section className="gold-panel flex flex-wrap items-center justify-between gap-5 px-7 py-6 sm:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">{s.eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{s.title}</h1>
          <p className="mt-2 leading-relaxed opacity-90">{s.lead}</p>
        </div>
        <Link href={start} className="btn !bg-[var(--cover-bg)] !text-[var(--cover-gold)]">{s.cta}</Link>
      </section>

      <ReportView key={locale} initial={sampleReport()} recordedOn={formatDate(SAMPLE_RECORDED_AT, locale)} t={t} deleteUrl={null} back={{ href: "/", label: s.back }} />

      <section className="card flex flex-wrap items-center justify-between gap-5 p-7 sm:p-10">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-medium">{s.outroTitle}</h2>
          <p className="mt-2 leading-relaxed text-ink-2">{s.outro}</p>
        </div>
        <Link href={start} className="btn">{s.cta}</Link>
      </section>
    </div>
  );
}
