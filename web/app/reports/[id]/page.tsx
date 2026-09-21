import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import { gateway } from "@/lib/gateway";
import { formatDate, getDict } from "@/lib/i18n";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { userId }, { locale, t }] = await Promise.all([params, auth(), getDict()]);
  if (!userId) notFound();

  const analysis = await gateway.getAnalysisFor(userId, id);
  if (!analysis) notFound();

  const { external_user_id: _owner, ...report } = analysis;
  return <ReportView key={locale} initial={report} recordedOn={formatDate(analysis.created_at, locale)} t={t} />;
}
