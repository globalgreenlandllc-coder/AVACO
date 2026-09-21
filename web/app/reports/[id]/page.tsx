import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { PayWall } from "@/components/PayWall";
import { ReportView } from "@/components/ReportView";
import { previewReport, publicReport } from "@/lib/api";
import { asUser, balance, getSettings, hasFullAccess, noteResult } from "@/lib/billing";
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

  return <ReportView key={`${locale}-${full}`} initial={full ? publicReport(analysis) : previewReport(analysis)} recordedOn={formatDate(analysis.created_at, locale)} t={t} locked={paywall} />;
}
