/** The gift builder, and the gifts this person has given so far. Signed-in only (proxy.ts). */
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiftForm } from "@/components/GiftForm";
import { GiftRibbon } from "@/components/GiftRibbon";
import { isAdminUser } from "@/lib/admin";
import { getSettings } from "@/lib/billing";
import { giftPrice, giftsFor, MAX_INDUSTRIES, MAX_REPORTS, type Gift } from "@/lib/gifts";
import { formatDate, getDict } from "@/lib/i18n";

export default async function GiftPage() {
  const [{ userId }, { t, locale }] = await Promise.all([auth(), getDict()]);
  if (!userId) notFound();
  const [cfg, admin, user, given] = await Promise.all([getSettings(), isAdminUser(userId), currentUser().catch(() => null), giftsFor(userId)]);
  const price = await giftPrice(1, 0, cfg);
  const g = t.gift;
  const statusOf = (x: Gift) =>
    x.reportsUsed > 0 ? g.status.recorded
    : x.status === "claimed" ? g.status.claimed.replace("{name}", x.recipientName ?? g.giver.someone)
    : x.status === "paid" ? (x.openedAt ? g.status.opened : g.status.paid)
    : g.status.pending;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center gap-6">
        <GiftRibbon size={88} />
        <div className="max-w-2xl">
          <p className="eyebrow">{g.landing.eyebrow}</p>
          <h1 className="mt-2 font-display text-5xl font-medium">{g.form.title}</h1>
          <p className="mt-4 leading-relaxed text-ink-2">{g.form.lead}</p>
        </div>
      </div>

      <GiftForm t={g.form} defaultName={user?.firstName ?? ""} reportCents={price.reportCents} industryCents={price.industryCents} currency={price.currency} locale={locale} free={!cfg.enabled || admin} maxReports={MAX_REPORTS} maxIndustries={MAX_INDUSTRIES} />

      <section>
        <h2 className="font-display text-3xl font-medium">{g.form.given}</h2>
        {given.length === 0 ? <p className="mt-4 text-ink-2">{g.form.none}</p> : (
          <ul className="mt-5 space-y-3">
            {given.map((x) => (
              <li key={x.id}>
                <Link href={`/gift/${x.id}`} className="card flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:border-ink-2">
                  <div>
                    <p className="font-medium">{x.recipientName ?? g.giver.someone} · {formatDate(x.createdAt.toISOString(), locale)}</p>
                    <p className="mt-1 text-sm text-ink-2">{g.giver.contents.replace("{reports}", String(x.reports)).replace("{industries}", x.industries ? ` + ${x.industries} × ${g.form.industries}` : "")}</p>
                  </div>
                  <span className="text-sm text-muted">{statusOf(x)} →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
