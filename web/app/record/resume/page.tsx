/**
 * Back from paying for a recording kept at the paywall: confirm the payment, start the analysis of that recording
 * (lib/billing.ts startHeldRecording) and go straight to its report, opened with one of the new credits.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshWhile } from "@/components/RefreshWhile";
import { asUser, confirmCheckout, startHeldRecording } from "@/lib/billing";
import { getDict } from "@/lib/i18n";
import { currentUserId } from "@/lib/page";

export const dynamic = "force-dynamic";

export default async function ResumeRecording({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const [userId, { t }, { session }] = await Promise.all([currentUserId(), getDict(), searchParams]);
  const h = t.record.held;
  const confirmed = typeof session === "string" ? await confirmCheckout(asUser(userId), session).catch(() => null) : null;
  const report = confirmed?.paid ? await startHeldRecording(confirmed.purchase.id).catch((err) => { console.error("Held recording not started", err); return null; }) : null;
  if (report) redirect(`/reports/${report}`);

  const title = !confirmed ? h.notFound : !confirmed.paid ? h.confirming : h.starting;
  return (
    <div className="card mx-auto mt-8 max-w-xl px-8 py-12 text-center" aria-live="polite">
      <span className="relative mx-auto grid h-10 w-10 place-items-center" aria-hidden><span className="breathe absolute inset-0 rounded-full bg-accent" /><span className="relative h-3 w-3 rounded-full bg-accent" /></span>
      <h1 className="mt-6 font-display text-3xl font-medium">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">{h.keptNote}</p>
      <Link href="/reports" className="btn btn-quiet mt-8">{h.myReports}</Link>
      {confirmed && <RefreshWhile everyMs={2500} times={24} />}
    </div>
  );
}
