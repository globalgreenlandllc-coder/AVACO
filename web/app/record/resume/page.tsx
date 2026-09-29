/**
 * Back from paying for a recording kept at the paywall. The payment is confirmed here, the recording is handed to AVOCO
 * in the background (lib/billing.ts kickHeldRecording), and meanwhile the person watches the analysing console with
 * their own recording (components/HeldWaiting.tsx). The page refreshes itself until the report exists, then moves on.
 */
import Link from "next/link";
import { HeldWaiting } from "@/components/HeldWaiting";
import { RefreshWhile } from "@/components/RefreshWhile";
import { asUser, confirmCheckout, heldRecordingState, kickHeldRecording } from "@/lib/billing";
import { getDict } from "@/lib/i18n";
import { currentUserId } from "@/lib/page";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function ResumeRecording({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const [userId, { t }, { session }] = await Promise.all([currentUserId(), getDict(), searchParams]);
  const h = t.record.held;
  const confirmed = typeof session === "string" ? await confirmCheckout(asUser(userId), session).catch(() => null) : null;
  if (!confirmed) {
    return (
      <div className="card mx-auto mt-8 max-w-xl px-8 py-12 text-center">
        <h1 className="font-display text-3xl font-medium">{h.notFound}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{h.keptNote}</p>
        <Link href="/reports" className="btn btn-quiet mt-8">{h.myReports}</Link>
      </div>
    );
  }
  const state = await heldRecordingState(confirmed.purchase.id);
  // Paid, and nobody is handing it over (a webhook that died, say): start it now, after this page is sent.
  if (confirmed.paid && !state.report && !state.starting) await kickHeldRecording(confirmed.purchase.id);
  return (
    <>
      <HeldWaiting
        report={state.report}
        audioUrl={state.audioUrl}
        startedAt={(state.paidAt ?? new Date()).getTime()}
        status={confirmed.paid ? h.starting : h.confirming}
        t={t.report.live}
        thoughts={[...t.report.live.thoughts]}
      />
      {!state.report && <RefreshWhile everyMs={2500} times={80} />}
    </>
  );
}
