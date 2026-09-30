import Link from "next/link";
import { notFound } from "next/navigation";
import { PayWall } from "@/components/PayWall";
import { RefreshWhile } from "@/components/RefreshWhile";
import { ReportView } from "@/components/ReportView";
import { previewReport, publicReport } from "@/lib/api";
import { asUser, balance, BEST_KEY, confirmCheckout, getSettings, hasFullAccess, industriesByReport, noteResult, openWelcomeReport, usedWelcomeReport } from "@/lib/billing";
import { bestCredits, bestPriceCents } from "@/lib/best-billing";
import { isAdminUser } from "@/lib/admin";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";
import { INDUSTRY_KEYS, industryMatches, isIndustry } from "@/lib/industries";
import { industryPriceCents } from "@/lib/industry-billing";
import { fieldFits } from "@/lib/fit";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { money } from "@/lib/money";
import { clerkBasics } from "@/lib/clerk-user";
import { isOpenVisitor, visitorId } from "@/lib/visitor";
import { agreementBand } from "@/lib/consensus";
import { profileFor, samePersonIds } from "@/lib/profile";
import { knownNames } from "@/lib/people";
import { matchIsFree } from "@/lib/billing";
import { matchCredits, matchPriceCents } from "@/lib/match-billing";
import { stripeReady } from "@/lib/stripe";
import { buildMatch, matchesFor, partnerAnalyses } from "@/lib/matches";
import { swapWords } from "@/lib/match-kind";
import { emailConfig } from "@/lib/email";
import { stageOf } from "@/lib/match-stage";

/** `paid`, `session`, `industry` and `best` are what Stripe Checkout sends the buyer back with (see api/billing/checkout and api/billing/best). */
type Query = { paid?: string; session?: string; industry?: string; best?: string; as?: string };

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, userId, { locale, t }, query] = await Promise.all([params, visitorId(), getDict(), searchParams]);
  if (!userId) notFound();

  const single = await gateway.getAnalysisFor(userId, id);
  if (!single) notFound();
  // The report is about the person's profile across recordings, when they have several (lib/consensus.ts).
  const profile = await profileFor(userId, single);
  const analysis = { ...single, psytype: profile.psytype };
  const typeName = (key: string) => (Object.hasOwn(t.psytypes, key) ? t.psytypes[key as keyof typeof t.psytypes].name : key);
  // "28 Sep" rather than "28 September 2026": sixteen of them have to fit a phone.
  const shortDate = (iso: string, loc: string) => { try { return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" }).format(new Date(iso)); } catch { return iso.slice(5, 10); } };
  const own = single.psytype?.length ? [...single.psytype].sort((a, b) => b.value - a.value)[0] : null;
  const takes = profile.consensus ? {
    n: profile.consensus.n,
    band: agreementBand(profile.consensus.agreement),
    pct: Math.round(profile.consensus.agreement * 100),
    leader: typeName(profile.consensus.leader),
    thisRecording: own ? { name: typeName(own.key), value: own.value } : null,
    recordings: profile.consensus.recordings.map((x) => ({ id: x.id, date: shortDate(x.created_at, locale), name: typeName(x.key), value: x.value, current: x.id === single.id })),
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
  // What this person has opened or ordered on any of their reports shows here too (lib/profile.ts, samePersonIds).
  const sameIds = await samePersonIds(userId, analysis.id);
  const personIndustries = async () => { const byReport = await industriesByReport(userId); return [...new Set(sameIds.flatMap((id) => byReport.get(id) ?? []))]; };
  const personMatches = async () => (await matchesFor(userId)).filter((m) => sameIds.includes(m.analysisId));

  // An admin can look at any of their reports as a client who hasn't paid: the same preview and paywall, buttons inactive.
  const admin = await isAdminUser(userId);
  const asClient = admin && query.as === "client";
  let full = asClient ? false : await hasFullAccess(userId, analysis.id);
  // An account's first finished report opens in full for free, once (admin → Pricing → "First report free").
  let welcome = false;
  if (!full && !asClient && analysis.status === "completed" && (await openWelcomeReport(userId, analysis.id))) { full = true; welcome = true; }
  if (analysis.status === "completed" && analysis.psytype?.length) {
    await noteResult(analysis.id, "self", analysis.psytype[0].key, fieldFits(analysis.psytype, analysis.emostate)[0]?.key).catch(() => {});
  }

  let paywall: React.ReactNode;
  if (!full && analysis.status === "completed") {
    const [credits, cfg, cards] = await Promise.all([balance(asUser(userId)), getSettings(), stripeReady()]);
    const cheapest = cfg.packs.filter((p) => p.audience === "user").sort((a, b) => a.amountCents - b.amountCents)[0];
    // Without credits, one click pays for exactly this report: the single-report pack, straight back here opened.
    const single = cfg.packs.find((p) => p.audience === "user" && p.credits === 1);
    const pay = cards && single ? { url: "/api/billing/checkout", pack: single.id, price: money(single.amountCents, cfg.currency, locale) } : undefined;
    paywall = (
      <>
        {paid && <p role="status" className="rounded-xl border border-accent px-5 py-4 text-sm">{paid === "confirmed" ? t.billing.thanks : t.billing.pending}</p>}
        {paid === "pending" && <RefreshWhile />}
        <PayWall analysisId={analysis.id} credits={asClient ? 0 : credits} fromPrice={cheapest ? money(cheapest.amountCents, cfg.currency, locale) : ""} pay={pay} demo={asClient} t={t.billing} />
        {cfg.freeFirstReport && !asClient && (await usedWelcomeReport(userId)) && <p className="text-center text-xs text-muted">{t.report.preview.usedFree}</p>}
      </>
    );
  }

  // The industry chapter: free for admins and while billing is off, otherwise one credit per industry.
  let industry: React.ComponentProps<typeof ReportView>["industry"];
  if (full && analysis.status === "completed") {
    const [cfg, admin, unlocked, credits, addonCents, canPay, bestCents, bestN] = await Promise.all([getSettings(), isAdminUser(userId), personIndustries(), balance(asUser(userId)), industryPriceCents(), stripeReady(), bestPriceCents(), bestCredits()]);
    // Admins get the same closed chapter and the same button as a client, but opening it costs them nothing.
    const open = isOpenVisitor(userId); // the open host: no payments, every chapter free
    // The add-on has its own price and is paid straight from the card; a report credit can open it too.
    const price = cfg.enabled && !admin && !open ? money(addonCents, cfg.currency, locale) : null;
    // The best-industry finder: every industry compared and the winner opened, its chapter included. Dearer than one chapter.
    const bestOpen = unlocked.includes(BEST_KEY);
    const winner = bestOpen ? industryMatches(analysis.psytype ?? [])?.[0]?.industry : undefined;
    const bestFree = !cfg.enabled || open, bestMoney = money(bestCents, cfg.currency, locale), f = t.finder.offer;
    industry = {
      industries: industryNames(t), chapterUrl: `/api/analyses/${analysis.id}/industry/{key}`, unlockUrl: cfg.enabled && !open ? "/api/billing/unlock-industry" : undefined,
      payUrl: price && canPay ? "/api/billing/checkout" : undefined, payLabel: price ? t.billing.pay.replace("{price}", price) : undefined,
      unlocked: [...unlocked.filter(isIndustry), ...(winner && !unlocked.includes(winner) ? [winner] : [])], credits, freeUnlock: admin, price, teaser: industryTeaser("it", analysis.psytype ?? [], t),
      initialIndustry: wantedIndustry, paid: query.best ? null : paid,
      best: {
        url: `/api/analyses/${analysis.id}/best`, open: bestOpen, total: INDUSTRY_KEYS.length, needed: bestN, free: bestFree, admin,
        price: bestFree ? f.free : admin ? f.freeAdmin.replace("{n}", String(bestN)) : f.price.replace("{price}", bestMoney).replace("{n}", String(bestN)),
        payUrl: !bestFree && !admin && canPay ? "/api/billing/best" : undefined, payLabel: t.billing.pay.replace("{price}", bestMoney),
        paid: query.best ? paid : null,
      },
    };
  }

  // The relationship match add-on: the couple's report, ordered from this report.
  let match: React.ComponentProps<typeof ReportView>["match"];
  if (full && analysis.status === "completed") {
    const [free, existing, cfg, credits, needed, cents, card] = await Promise.all([matchIsFree(userId), personMatches(), getSettings(), balance(asUser(userId)), matchCredits(), matchPriceCents(), stripeReady()]);
    // The couple's report has its own price: the card, or the person's report credits when they have enough.
    const price = free ? null : t.match.priceCard.replace("{price}", money(cents, cfg.currency, locale)).replace("{n}", String(needed));
    const statuses = await Promise.all(existing.map(async (e) => { const p = await partnerAnalyses(e).catch(() => []); return { id: e.id, partnerName: e.partnerName, stage: stageOf({ openedAt: e.partnerOpenedAt, startedAt: e.partnerStartedAt, analyses: p }) }; }));
    // "Your first name" in the order form starts as whoever this report is about: the named person, or the account holder.
    const ownerName = profile.person ?? (isOpenVisitor(userId) ? null : (await clerkBasics(userId))?.firstName) ?? undefined;
    match = { price, freeLabel: free === "admin" ? t.match.freeAdmin.replace("{n}", String(needed)) : t.match.free, credits, needed, canOrder: Boolean(free) || credits >= needed || card, existing: statuses, defaultOwnerName: ownerName, kinds: t.content.match.kinds, worksFor: t.content.match.worksFor };
  }

  // A preview gets no result: not the type, not the per-recording types, only how many recordings and when.
  const previewTakes = !full && takes ? { n: takes.n, band: takes.band, pct: takes.pct, dates: takes.recordings.map(({ id, date, current }) => ({ id, date, current })) } : undefined;
  // Whose voice this is, with the names already used on the account as one-click choices.
  const person = { name: profile.person, known: await knownNames(userId) };
  // A line at the top: the industry chapters and couple's reports this person already has, each one click away.
  const opened = full && analysis.status === "completed" ? await personIndustries().catch(() => [] as string[]) : [];
  const couples = full && analysis.status === "completed" ? await personMatches().catch(() => []) : [];
  // The finished couple's reports, copied hidden into the page so the file and the print carry them; and whether a
  // mailbox is connected, so the page can offer to email the file.
  const readyIds = new Set(match?.existing.filter((e) => e.stage === "ready").map((e) => e.id) ?? []);
  const [coupleFiles, canEmail] = await Promise.all([
    Promise.all(couples.filter((m) => readyIds.has(m.id)).map(async (m) => { const report = await buildMatch(m, t, locale).catch(() => null); return report ? { id: m.id, names: report.names, report } : null; })).then((xs) => xs.filter((x) => x !== null)),
    couples.length > 0 || opened.length > 0 || full ? emailConfig().then((c) => Boolean(c)).catch(() => false) : Promise.resolve(false),
  ]);
  const names = new Map<string, string>(industryNames(t).map((i) => [i.key, i.name]));
  // What is already in this report, listed with the add-ons at its foot: each chapter and each pair report one tap away.
  const alreadyOpened = {
    industries: opened.map((key) => ({ key, name: names.get(key) ?? key, href: `/reports/${analysis.id}?industry=${key}#industry` })),
    couples: couples.map((m) => ({ id: m.id, href: `/match/${m.id}`, glyph: m.kind === "couple" ? "♥" : "🤝", label: swapWords(readyIds.has(m.id) ? t.reports.extraCouple : t.reports.extraCoupleWaiting, t.content.match.kinds[m.kind]).replace("{name}", m.partnerName) })),
  };

  // For admins only, in English like the rest of the admin tools: the way into the client's view, and the way back.
  const adminBar = !admin || analysis.status !== "completed" ? null : asClient
    ? <p data-no-export className="no-print rounded-xl border border-accent px-5 py-4 text-sm">Admin preview: this is exactly what a client sees before paying. The buttons are inactive here. <Link href={`/reports/${analysis.id}`} className="font-semibold text-accent-text hover:underline">Back to the full report</Link></p>
    : <p data-no-export className="no-print text-sm"><Link href={`/reports/${analysis.id}?as=client`} className="font-semibold text-accent-text hover:underline">Admin: see this report as a client who hasn&apos;t paid →</Link></p>;

  const welcomeNote = welcome ? (
    <div data-no-export className="no-print rounded-2xl border border-accent bg-accent-soft px-5 py-4">
      <p className="font-semibold">🎁 {t.report.welcomeTitle}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.report.welcomeText}</p>
    </div>
  ) : null;
  return <ReportView key={`${locale}-${full}-${asClient}-${profile.person ?? ""}`} lead={adminBar ?? welcomeNote} initial={full ? publicReport(analysis) : previewReport(analysis)} recordedOn={formatDate(analysis.created_at, locale)} t={t} opened={alreadyOpened} locked={paywall} industry={industry} takes={full ? takes : undefined} previewTakes={previewTakes} match={match} couples={coupleFiles} canEmail={canEmail} person={person} />;
}
