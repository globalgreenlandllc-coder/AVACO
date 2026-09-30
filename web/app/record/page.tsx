import { auth } from "@clerk/nextjs/server";
import { Recorder } from "@/components/Recorder";
import { getSettings, welcomeReportWaiting } from "@/lib/billing";
import { activeGift } from "@/lib/gifts";
import { packViews } from "@/lib/money";
import { stripeReady } from "@/lib/stripe";
import { getDict } from "@/lib/i18n";
import { cleanName, knownNames } from "@/lib/people";
import { clerkBasics } from "@/lib/clerk-user";
import { isOpenVisitor, openLimitReached, visitorId } from "@/lib/visitor";

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const [{ t, locale }, { userId }, visitor, query, cfg] = await Promise.all([getDict(), auth(), visitorId(), searchParams, getSettings()]);
  // With billing on: the packs the recorder offers when the free previews run out, so a finished recording is never lost.
  const packs = cfg.packs.filter((p) => p.audience === "user");
  const paywall = userId && cfg.enabled ? {
    packs: packViews(packs, cfg.currency, locale),
    featured: packs.filter((p) => p.credits > 1).sort((a, b) => a.amountCents / a.credits - b.amountCents / b.credits)[0]?.id ?? null,
    canPay: await stripeReady().catch(() => false),
  } : undefined;
  // Whose voice: "me", or a name used before, one click each; "Record Anna" on My reports arrives with ?person=Anna.
  const me = await clerkBasics(userId);
  const whose = visitor ? { known: await knownNames(visitor), initial: cleanName(query.person), t: t.people, myName: me?.firstName ?? null } : undefined;
  // Someone holding a gift: say so, and that the report opens by itself.
  const gift = userId ? await activeGift(userId).catch(() => null) : null;
  // A new account's free first report, still waiting.
  const firstFree = userId && !gift ? await welcomeReportWaiting(userId).catch(() => false) : false;
  // The free test site: once today's recordings are used, say so instead of offering a recorder that would be refused.
  const open = Boolean(visitor && isOpenVisitor(visitor));
  const closed = open && (await openLimitReached().catch(() => false));
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-display text-5xl font-medium">{t.record.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{t.record.lead}</p>
        {firstFree && (
          <div className="mt-6 rounded-2xl border border-accent bg-accent-soft px-5 py-4">
            <p className="font-semibold">🎁 {t.record.firstFree}</p>
          </div>
        )}
        {gift && (
          <div className="mt-6 rounded-2xl border border-accent bg-accent-soft px-5 py-4">
            <p className="font-semibold">🎁 {t.gift.record.title.replace("{giver}", gift.giverName)}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.gift.record.text} {t.gift.record.left.replace("{n}", String(gift.reports - gift.reportsUsed))}.</p>
          </div>
        )}
        <div className="mt-8">{closed ? <p className="card p-8 leading-relaxed text-ink-2">{t.record.openLimit}</p> : <Recorder t={t.record} payText={t.billing.cap} limitText={open ? t.record.openLimit : undefined} whose={whose} paywall={paywall} />}</div>
      </div>
      <aside className="lg:pt-32">
        <p className="eyebrow">{t.record.promptsTitle}</p>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
          {t.record.prompts.map((prompt) => <li key={prompt} className="border-l border-line pl-4">{prompt}</li>)}
        </ul>
      </aside>
    </div>
  );
}
