import { notFound } from "next/navigation";
import { PayWall } from "@/components/PayWall";
import { RefreshWhile } from "@/components/RefreshWhile";
import { ReportView } from "@/components/ReportView";
import { previewReport, publicReport } from "@/lib/api";
import { asUser, balance, confirmCheckout, getSettings, hasFullAccess, noteResult, openIndustries } from "@/lib/billing";
import { isAdminUser } from "@/lib/admin";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";
import { isIndustry } from "@/lib/industries";
import { industryPriceCents } from "@/lib/industry-billing";
import { fieldFits } from "@/lib/fit";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { money } from "@/lib/money";
import { stripeReady } from "@/lib/stripe";
import { isOpenVisitor, visitorId } from "@/lib/visitor";
import { agreementBand } from "@/lib/consensus";
import { profileFor } from "@/lib/profile";
import { MATCH_CREDITS, matchIsFree } from "@/lib/billing";
import { matchesFor, partnerAnalyses } from "@/lib/matches";

/** `paid`, `session` and `industry` are what Stripe Checkout sends the buyer back with (see api/billing/checkout). */
type Query = { paid?: string; session?: string; industry?: string };

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, userId, { locale, t }, query] = await Promise.all([params, visitorId(), getDict(), searchParams]);
  if (!userId) notFound();

  const single = await gateway.getAnalysisFor(userId, id);
  if (!single) notFound();
  // The report is about the person's profile across recordings, when they have several (lib/consensus.ts).
  const profile = await profileFor(userId, single);
  const analysis = { ...single, psytype: profile.psytype };
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  const own = single.psytype?.length ? [...single.psytype].sort((a, b) => b.value - a.value)[0] : null;
  const takes = profile.consensus ? {
    n: profile.consensus.n,
    band: agreementBand(profile.consensus.agreement),
    pct: Math.round(profile.consensus.agreement * 100),
    leader: typeName(profile.consensus.leader),
    thisRecording: own ? { name: typeName(own.key), value: own.value } : null,
    recordings: profile.consensus.recordings.map((x) => ({ id: x.id, date: formatDate(x.created_at, locale).split(/,| at | в /)[0], name: typeName(x.key), value: x.value, current: x.id === single.id })),
  } : undefined;

  // Back from Stripe: confirm the payment on this very load, so the report and the chapter the buyer came for open
  // now, not whenever the webhook gets round to it. An old-style return (no session) is shown as pending and refreshed.
  let paid: "confirmed" | "pending" | null = null;
  if (typeof query.session === "string") {
    const outcome = await confirmCheckout(asUser(userId), query.session).catch(() => null);
    paid = outcome ? (outcome.paid ? "confirmed" : "pending") : null;
  } else if (query.paid) {
    paid = "pending";
  }
  const wantedIndustry = isIndustry(query.industry) ? query.industry : null;

  const full = await hasFullAccess(userId, analysis.id);
  if (analysis.status === "completed" && analysis.psytype?.length) {
    await noteResult(analysis.id, "self", analysis.psytype[0].key, fieldFits(analysis.psytype, analysis.emostate)[0]?.key).catch(() => {});
  }

  let paywall: React.ReactNode;
  if (!full && analysis.status === "completed") {
    const [credits, cfg] = await Promise.all([balance(asUser(userId)), getSettings()]);
    const cheapest = cfg.packs.filter((p) => p.audience === "user").sort((a, b) => a.amountCents - b.amountCents)[0];
    paywall = (
      <>
        {paid && <p role="status" className="rounded-xl border border-accent px-5 py-4 text-sm">{paid === "confirmed" ? t.billing.thanks : t.billing.pending}</p>}
        {paid === "pending" && <RefreshWhile />}
        <PayWall analysisId={analysis.id} credits={credits} fromPrice={cheapest ? money(cheapest.amountCents, cfg.currency, locale) : ""} t={t.billing} />
      </>
    );
  }

  // The industry chapter: free for admins and while billing is off, otherwise one credit per industry.
  let industry: React.ComponentProps<typeof ReportView>["industry"];
  if (full && analysis.status === "completed") {
    const [cfg, admin, unlocked, credits, addonCents, canPay] = await Promise.all([getSettings(), isAdminUser(userId), openIndustries(analysis.id), balance(asUser(userId)), industryPriceCents(), stripeReady()]);
    // Admins get the same closed chapter and the same button as a client, but opening it costs them nothing.
    const open = isOpenVisitor(userId); // the open host: no payments, every chapter free
    // The add-on has its own price and is paid straight from the card; a report credit can open it too.
    const price = cfg.enabled && !admin && !open ? money(addonCents, cfg.currency, locale) : null;
    industry = {
      industries: industryNames(locale), chapterUrl: `/api/analyses/${analysis.id}/industry/{key}`, unlockUrl: cfg.enabled && !open ? "/api/billing/unlock-industry" : undefined,
      payUrl: price && canPay ? "/api/billing/checkout" : undefined, payLabel: price ? t.billing.pay.replace("{price}", price) : undefined,
      unlocked, credits, freeUnlock: admin, price, teaser: industryTeaser("it", analysis.psytype ?? [], locale),
      initialIndustry: wantedIndustry, paid,
    };
  }

  // The relationship match add-on: the couple's report, ordered from this report.
  let match: React.ComponentProps<typeof ReportView>["match"];
  if (full && analysis.status === "completed") {
    const [free, existing, cfg, credits] = await Promise.all([matchIsFree(userId), matchesFor(userId, analysis.id), getSettings(), balance(asUser(userId))]);
    const cheapest = cfg.packs.filter((p) => p.audience === "user").map((p) => Math.round(p.amountCents / p.credits)).sort((a, b) => a - b)[0];
    const price = free ? null : `${t.match.price.replace("{n}", String(MATCH_CREDITS))}${cheapest ? ` · ${money(cheapest * MATCH_CREDITS, cfg.currency, locale)}` : ""}`;
    const statuses = await Promise.all(existing.map(async (e) => { const p = await partnerAnalyses(e).catch(() => []); return { id: e.id, partnerName: e.partnerName, status: (p.some((x) => x.status === "completed") ? "ready" : p.length ? "processing" : "waiting") as "ready" | "processing" | "waiting" }; }));
    match = { price, freeLabel: free === "admin" ? t.match.freeAdmin.replace("{n}", String(MATCH_CREDITS)) : t.match.free, credits, canOrder: Boolean(free) || credits >= MATCH_CREDITS, existing: statuses };
  }

  return <ReportView key={`${locale}-${full}`} initial={full ? publicReport(analysis) : previewReport(analysis)} recordedOn={formatDate(analysis.created_at, locale)} t={t} locked={paywall} industry={industry} takes={takes} match={match} />;
}
