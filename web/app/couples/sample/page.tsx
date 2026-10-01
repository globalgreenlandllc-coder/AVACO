/**
 * A sample couple's report anyone can read, linked from the couples page: the real couple's report (CoupleReport) for
 * the sample couple Alex and Sam (lib/sample-couple.ts), between a short note saying what it is and the way to start.
 * English for every visitor, like the couples page and its ads.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CoupleReport } from "@/components/MatchView";
import { en } from "@/lib/i18n/en";
import { couplesEn as c } from "@/lib/i18n/couples-en";
import { matchWords } from "@/lib/match-kind";
import { sampleCouple } from "@/lib/sample-couple";
import { isOpenHost } from "@/lib/visitor";

export const metadata: Metadata = { title: c.sampleMetaTitle, description: c.sampleLead, openGraph: { title: c.sampleMetaTitle, description: c.sampleLead } };

export default async function SampleCouplePage() {
  const [{ userId }, open] = await Promise.all([auth(), isOpenHost()]);
  const sample = sampleCouple(en, "en");
  if (!sample) notFound();
  const start = userId || open ? "/record" : "/sign-up";
  const startLabel = userId || open ? c.ctaSignedIn : c.cta;
  return (
    <div className="romance-page space-y-8">
      <section className="gold-panel flex flex-wrap items-center justify-between gap-5 px-7 py-6 sm:px-10">
        <div className="max-w-2xl">
          <Link href="/couples" className="text-sm opacity-80 hover:underline">← {c.sampleBack}</Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] opacity-80">{c.sampleEyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-medium sm:text-4xl">{c.sampleTitle}</h1>
          <p className="mt-2 leading-relaxed opacity-90">{c.sampleLead}</p>
        </div>
        <Link href={start} data-track="couples sample: start" className="btn btn-dark">{startLabel} →</Link>
      </section>

      <CoupleReport report={sample.report} t={matchWords(en.match, "couple", en.content.match.kinds)} />

      <section className="card flex flex-wrap items-center justify-between gap-5 p-7 sm:p-10">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-medium">{c.sampleOutroTitle}</h2>
          <p className="mt-2 leading-relaxed text-ink-2">{c.sampleOutro}</p>
        </div>
        <Link href={start} data-track="couples sample: start (end)" className="btn">{startLabel} →</Link>
      </section>
    </div>
  );
}
