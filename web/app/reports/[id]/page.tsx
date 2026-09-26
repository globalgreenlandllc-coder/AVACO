import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PayWall } from "@/components/PayWall";
import { ReportView } from "@/components/ReportView";
import { previewReport, publicReport } from "@/lib/api";
import { asUser, balance, getSettings, hasFullAccess, noteResult, openIndustries } from "@/lib/billing";
import { isAdminUser } from "@/lib/admin";
import { industryNames, industryTeaser } from "@/lib/industry-chapter";
import { fieldFits } from "@/lib/fit";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";
import { money } from "@/lib/money";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { userId }, { locale, t }] = await Promise.all([params, auth(), getDict()]);
  if (!userId) notFound();

  const analysis = await gateway.getAnalysisFor(userId, id);
  if (!analysis) notFound();

  const full = await hasFullAccess(userId, analysis.id);
  if (analysis.status === "completed" && analysis.psytype?.length) {
    await noteResult(analysis.id, "self", analysis.psytype[0].key, fieldFits(analysis.psytype, analysis.emostate)[0]?.key).catch(() => {});
  }

  let paywall: React.ReactNode;
  if (!full && analysis.status === "completed") {
    const [credits, cfg] = await Promise.all([balance(asUser(userId)), getSettings()]);
    const cheapest = cfg.packs.filter((p) => p.audience === "user").sort((a, b) => a.amountCents - b.amountCents)[0];
    paywall = <PayWall analysisId={analysis.id} credits={credits} fromPrice={cheapest ? money(cheapest.amountCents, cfg.currency, locale) : ""} t={t.billing} />;
  }

  // The industry chapter: free for admins and while billing is off, otherwise one credit per industry.
  let industry: React.ComponentProps<typeof ReportView>["industry"];
  if (full && analysis.status === "completed") {
    const [cfg, admin, unlocked, credits] = await Promise.all([getSettings(), isAdminUser(userId), openIndustries(analysis.id), balance(asUser(userId))]);
    // Admins get the same closed chapter and the same button as a client, but opening it costs them nothing.
    const cheapest = cfg.packs.filter((p) => p.audience === "user").map((p) => Math.round(p.amountCents / p.credits)).sort((a, b) => a - b)[0];
    const price = cfg.enabled && !admin ? `${t.industry.lock.oneCredit}${cheapest ? ` · ${money(cheapest, cfg.currency, locale)}` : ""}` : null;
    industry = { industries: industryNames(locale), chapterUrl: `/api/analyses/${analysis.id}/industry/{key}`, unlockUrl: cfg.enabled ? "/api/billing/unlock-industry" : undefined, unlocked, credits, freeUnlock: admin, price, teaser: industryTeaser("it", analysis.psytype ?? [], locale) };
  }

  return <ReportView key={`${locale}-${full}`} initial={full ? publicReport(analysis) : previewReport(analysis)} recordedOn={formatDate(analysis.created_at, locale)} t={t} locked={paywall} industry={industry} />;
}
