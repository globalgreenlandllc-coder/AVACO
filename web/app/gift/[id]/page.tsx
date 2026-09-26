/** The giver's page for one gift: the link to send, ways to send it, and what has happened to it so far. */
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";
import { GiftRibbon } from "@/components/GiftRibbon";
import { PayGift } from "@/components/PayGift";
import { Qr } from "@/components/Qr";
import { ShareGift } from "@/components/ShareGift";
import { asUser, confirmCheckout } from "@/lib/billing";
import { giftFor } from "@/lib/gifts";
import { formatDate, getDict } from "@/lib/i18n";
import { baseUrl } from "@/lib/page";

export const metadata = { robots: { index: false, follow: false } };

export default async function GiftGiverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session?: string; paid?: string }> }) {
  const [{ id }, { session, paid }, { userId }, { t, locale }, origin] = await Promise.all([params, searchParams, auth(), getDict(), baseUrl()]);
  if (!userId) notFound();
  // Back from Stripe: confirm the payment now, so the link works on this very load even if the webhook is late.
  if (typeof session === "string") await confirmCheckout(asUser(userId), session).catch(() => null);
  const gift = await giftFor(userId, id);
  if (!gift) notFound();

  const g = t.gift.giver;
  const name = gift.recipientName ?? g.someone;
  const link = `${origin}/g/${gift.token}`;
  const when = (d: Date | null) => (d ? formatDate(d.toISOString(), locale) : null);
  const contents = g.contents.replace("{reports}", String(gift.reports)).replace("{industries}", gift.industries ? ` + ${gift.industries} × ${t.gift.form.industries}` : "");
  const status = gift.reportsUsed > 0 ? t.gift.status.recorded : gift.status === "claimed" ? t.gift.status.claimed.replace("{name}", name) : gift.status === "paid" ? (gift.openedAt ? t.gift.status.opened : t.gift.status.paid) : t.gift.status.pending;

  return (
    <div className="space-y-8">
      <Link href="/reports" className="no-print text-sm text-muted hover:text-ink">← {g.back}</Link>

      {paid && gift.status !== "pending" && <p role="status" className="rounded-xl border border-accent px-5 py-4 text-sm">{g.paidNote}</p>}
      {gift.status === "pending" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger/40 px-5 py-4 text-sm">
          <span>{g.pendingNote}</span>
          <PayGift id={gift.id} label={g.pendingCta} />
        </div>
      )}

      <section className="cover relative overflow-hidden px-7 py-10 sm:px-12 sm:py-12">
        <span className="cover-capsule" style={{ top: -90, right: "6%", width: 110, height: 300, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <div className="relative grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <GiftRibbon size={96} />
          <div>
            <p className="cover-eyebrow">{g.eyebrow} · {status}</p>
            <h1 className="gold-text mt-3 pb-1 font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">{g.title.replace("{name}", name)}</h1>
            <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: "var(--cover-muted)" }}>{g.lead}</p>
            <p className="mt-3 text-sm" style={{ color: "var(--cover-gold)" }}>{contents}</p>
          </div>
        </div>
      </section>

      <section className="card p-7 sm:p-10">
        <p className="eyebrow">{g.linkLabel}</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <Qr value={link} label={g.linkLabel} size={180} />
          <div className="space-y-5">
            <CopyLink value={link} label={g.copy} copied={g.copied} />
            <ShareGift link={link} giver={gift.giverName} recipient={gift.recipientName ?? ""} message={gift.message ?? ""} t={g} />
            <p className="text-sm"><Link href={`/g/${gift.token}`} className="font-semibold text-accent-text hover:underline">{g.preview.replace("{name}", name)} →</Link></p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-7">
          <p className="eyebrow">{g.whatNextTitle}</p>
          <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-2">
            {g.whatNext.map((step, i) => <li key={step} className="flex gap-3"><span className="font-display text-xl leading-none text-accent-text">{i + 1}</span><span>{step.replace("{name}", name)}</span></li>)}
          </ol>
        </section>
        <section className="card p-7">
          <p className="eyebrow">{t.match.progressTitle}</p>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { label: t.gift.status.paid, done: gift.status !== "pending", when: when(gift.paidAt) },
              { label: t.gift.status.opened.split(",")[0], done: Boolean(gift.openedAt), when: when(gift.openedAt) },
              { label: t.gift.status.claimed.replace("{name}", name), done: gift.status === "claimed", when: when(gift.claimedAt) },
              { label: t.gift.status.recorded, done: gift.reportsUsed > 0, when: null },
            ].map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] ${s.done ? "bg-accent text-accent-ink" : "border border-line text-muted"}`}>{s.done ? "✓" : ""}</span>
                <span className={s.done ? "" : "text-muted"}>{s.label}{s.when ? <span className="ml-2 text-xs text-muted">{s.when}</span> : null}</span>
              </li>
            ))}
          </ul>
          {gift.message && <p className="mt-6 border-l-2 border-accent pl-4 text-sm italic leading-relaxed text-ink-2">“{gift.message}”</p>}
        </section>
      </div>

      <p className="text-sm"><Link href="/gift" className="font-semibold text-accent-text hover:underline">{g.another} →</Link></p>
    </div>
  );
}
