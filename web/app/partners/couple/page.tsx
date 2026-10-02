/**
 * The partner page's couple's report: two voices, no account, no charge. The first is a partner-page report (?a=), the
 * second is recorded or chosen here (?b=); who they are to each other (?kind=), their names (?na=, ?nb=) and family
 * (?fam=1) ride along in the address. Read by the same code as a real couple's report (lib/match.ts,
 * lib/match-report.ts), with nothing stored but the second recording. Served on the partner hosts only (proxy.ts).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoupleReport } from "@/components/MatchView";
import { PartnerCoupleSetup } from "@/components/PartnerCoupleSetup";
import { PartnerRemember } from "@/components/PartnerHistory";
import { RefreshWhile } from "@/components/RefreshWhile";
import { getDict } from "@/lib/i18n";
import { matchFit } from "@/lib/match";
import { MATCH_KINDS, matchWords, type MatchKind } from "@/lib/match-kind";
import { matchReport } from "@/lib/match-report";
import { partnerAnalysis } from "@/lib/partners";

export const metadata = { robots: { index: false, follow: false } };

type Query = { a?: string; b?: string; kind?: string; na?: string; nb?: string; fam?: string };
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 40) : "");

export default async function PartnerCouplePage({ searchParams }: { searchParams: Promise<Query> }) {
  const [q, { t, locale }] = await Promise.all([searchParams, getDict()]);
  const p = t.partners, c = p.couple;
  const a = q.a ? await partnerAnalysis(q.a) : null;
  if (!a || a.status !== "completed" || !a.psytype?.length) notFound();
  const kind: MatchKind = (MATCH_KINDS as readonly string[]).includes(q.kind ?? "") ? (q.kind as MatchKind) : "couple";
  const nameA = clean(q.na), nameB = clean(q.nb), family = kind === "couple" && q.fam === "1";
  const keep = `a=${encodeURIComponent(a.id)}&kind=${kind}${nameA ? `&na=${encodeURIComponent(nameA)}` : ""}${nameB ? `&nb=${encodeURIComponent(nameB)}` : ""}${family ? "&fam=1" : ""}`;
  const b = q.b && q.b !== a.id ? await partnerAnalysis(q.b) : null;
  const back = <Link href={`/partners/r/${a.id}`} className="text-sm text-muted hover:text-ink">← {c.back}</Link>;

  if (!b) {
    const kinds = MATCH_KINDS.map((k) => ({ key: k, label: t.content.match.kinds[k].label, hint: t.content.match.kinds[k].hint }));
    return (
      <div className="space-y-8">
        {back}
        <section className="theme-match">
          <div className="cover px-7 py-10 sm:px-12 sm:py-12">
            <p className="cover-eyebrow">{c.eyebrow}</p>
            <h1 className="gold-text mt-4 pb-1 font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">{c.setupTitle}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed sm:text-lg" style={{ color: "var(--cover-muted)" }}>{c.setupLead}</p>
          </div>
        </section>
        <div className="theme-match"><PartnerCoupleSetup a={a.id} t={p} record={t.record} kinds={kinds} familyLabel={t.match.withFamily} locale={locale} initial={{ kind, nameA, nameB, family }} /></div>
      </div>
    );
  }

  if (b.status === "processing" || b.status === "queued") {
    return (
      <div className="space-y-8">
        {back}
        <section className="theme-match"><div className="cover px-7 py-12 text-center sm:px-12"><p className="breathe mx-auto h-4 w-4 rounded-full" style={{ background: "var(--cover-gold)" }} aria-hidden /><p className="mt-6 text-lg" style={{ color: "var(--cover-ink)" }}>{c.waiting}</p></div></section>
        <RefreshWhile everyMs={4000} times={60} />
      </div>
    );
  }

  const fit = b.status === "completed" && b.psytype?.length ? matchFit(a.psytype, b.psytype, { scalesA: a.emostate, scalesB: b.emostate, withFamily: family, kind }) : null;
  if (!fit) {
    return (
      <div className="space-y-8">
        {back}
        <section className="card p-8"><p className="leading-relaxed text-ink-2">{c.failed}</p><Link href={`/partners/couple?${keep}`} className="btn mt-6">{c.tryAgain}</Link></section>
      </div>
    );
  }
  const report = matchReport(fit, { a: nameA || c.defaultA, b: nameB || c.defaultB }, t, locale, kind);
  return (
    <div className="space-y-8">
      <PartnerRemember id={b.id} />
      {back}
      <div className="theme-match space-y-10">
        <CoupleReport report={report} t={matchWords(t.match, kind, t.content.match.kinds)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href={`/partners/couple?${keep}`} className="btn">{c.another}</Link>
        <Link href={`/partners/r/${a.id}`} className="btn btn-quiet">{c.back}</Link>
      </div>
      <p className="max-w-3xl text-xs leading-relaxed text-muted">{p.note}</p>
    </div>
  );
}
