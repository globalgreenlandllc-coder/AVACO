import { desc, eq, and } from "drizzle-orm";
import { BuyCredits } from "@/components/BuyCredits";
import { asUser, balance, confirmCheckout, getSettings } from "@/lib/billing";
import { creditLedger, db } from "@/lib/db";
import { formatDate, getDict } from "@/lib/i18n";
import { money, packViews } from "@/lib/money";
import { currentUserId } from "@/lib/page";
import { stripeReady } from "@/lib/stripe";

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ unlock?: string; paid?: string; session?: string; industry?: string }> }) {
  const [userId, { t, locale }, { unlock, paid, session, industry }, cfg] = await Promise.all([currentUserId(), getDict(), searchParams, getSettings()]);
  const b = t.billing;
  // Back from Stripe: confirm the payment now, so the balance below is already right even if the webhook is late.
  if (typeof session === "string") await confirmCheckout(asUser(userId), session).catch(() => null);
  const [credits, history] = await Promise.all([
    balance(asUser(userId)),
    db().select().from(creditLedger).where(and(eq(creditLedger.ownerKind, "user"), eq(creditLedger.ownerId, userId))).orderBy(desc(creditLedger.createdAt)).limit(50),
  ]);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-5xl font-medium">{b.title}</h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-2">{b.lead}</p>
        {paid && <p role="status" className="mt-6 rounded-xl border border-accent px-5 py-4 text-sm">{credits > 0 ? b.thanks : b.pending}</p>}
        <p className="mt-8 text-sm text-ink-2">{b.balance}</p>
        <p className="font-display text-6xl font-medium tabular-nums">{credits}</p>
      </div>

      <section>
        <h2 className="mb-6 font-display text-3xl font-medium">{b.buy}</h2>
        <BuyCredits packs={packViews(cfg.packs.filter((p) => p.audience === "user"), cfg.currency, locale)} canPay={await stripeReady()} t={b} unlock={unlock} industry={industry} />
      </section>

      <section>
        <h2 className="font-display text-3xl font-medium">{b.history}</h2>
        {history.length === 0 ? <p className="mt-4 text-ink-2">{b.noHistory}</p> : (
          <ul className="mt-5 divide-y divide-line text-sm">
            {history.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-4 py-3">
                <span>{b.reasons[row.reason]}{row.amountCents ? ` · ${money(row.amountCents, row.currency, locale)}` : ""}<span className="ml-2 text-xs text-muted">{formatDate(row.createdAt.toISOString(), locale)}</span></span>
                <span className="font-semibold tabular-nums">{row.delta > 0 ? "+" : ""}{row.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
