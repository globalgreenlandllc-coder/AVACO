/**
 * The recipient's page: who the gift is from, what is inside, and one button to claim it into their own account.
 * Public (only the link opens it). Claiming needs an account, because that is where the report will live.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GiftRibbon } from "@/components/GiftRibbon";
import { claimGift, giftByToken, noteGiftOpened } from "@/lib/gifts";
import { formatDate, getDict } from "@/lib/i18n";

export const metadata = { robots: { index: false, follow: false } };

export default async function GiftRecipientPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ claim?: string }> }) {
  const [{ token }, { claim }, { userId }, { t, locale }] = await Promise.all([params, searchParams, auth(), getDict()]);
  const gift = await giftByToken(token);
  if (!gift) notFound();
  const g = t.gift.recipient;
  const isGiver = userId === gift.giverId;
  const mine = Boolean(userId) && gift.claimedBy === userId;
  const claimable = gift.status !== "pending" && !isGiver && (!gift.claimedBy || mine);

  if (!isGiver) await noteGiftOpened(gift).catch(() => {});
  if (claim && userId && claimable) {
    await claimGift(gift, userId);
    redirect("/record?gift=1");
  }

  const email = userId ? (await currentUser().catch(() => null))?.primaryEmailAddress?.emailAddress ?? "" : "";
  const claimHref = `/g/${gift.token}?claim=1`;
  const signUpHref = `/sign-up?redirect_url=${encodeURIComponent(claimHref)}`;
  const title = (gift.recipientName ? g.titleNamed.replace("{recipient}", gift.recipientName) : g.title).replace("{giver}", gift.giverName);
  const contents = [
    gift.reports === 1 ? g.reportItem : g.reportsItem.replace("{n}", String(gift.reports)),
    ...(gift.industries === 0 ? [] : [gift.industries === 1 ? g.industryItem : g.industriesItem.replace("{n}", String(gift.industries))]),
    ...(gift.matches === 0 ? [] : [gift.matches === 1 ? g.matchItem : g.matchesItem.replace("{n}", String(gift.matches))]),
  ];

  return (
    <div className="space-y-8">
      <section className="cover relative overflow-hidden px-7 py-12 sm:px-12 sm:py-16">
        <span className="cover-capsule drift" style={{ top: -90, right: "6%", width: 120, height: 320, borderRadius: "0 0 999px 999px", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)" }} aria-hidden />
        <span className="cover-capsule drift" style={{ bottom: -90, left: "45%", width: 120, height: 290, borderRadius: "999px 999px 0 0", background: "color-mix(in oklab, var(--cover-gold) 10%, transparent)", animationDelay: "-5s" }} aria-hidden />
        <div className="relative grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
          <GiftRibbon size={112} />
          <div>
            <p className="cover-eyebrow">{g.eyebrow}</p>
            <h1 className="gold-text sheen mt-4 pb-2 font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">{title}</h1>
            {gift.message && (
              <blockquote className="mt-6 max-w-2xl border-l-2 pl-4" style={{ borderColor: "var(--cover-gold)" }}>
                <p className="text-sm" style={{ color: "var(--cover-muted)" }}>{g.message.replace("{giver}", gift.giverName)}</p>
                <p className="mt-1 text-lg italic leading-relaxed" style={{ color: "var(--cover-ink)" }}>“{gift.message}”</p>
              </blockquote>
            )}
            <p className="mt-6 text-xs" style={{ color: "var(--cover-muted)" }}>{g.given.replace("{date}", formatDate(gift.createdAt.toISOString(), locale))}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card p-7 sm:p-9">
          <p className="eyebrow">{g.contentsTitle}</p>
          <ul className="mt-4 space-y-3 leading-relaxed text-ink-2">
            {contents.map((x) => <li key={x} className="flex gap-3"><span aria-hidden className="text-accent-text">✓</span><span>{x}</span></li>)}
          </ul>
          <p className="mt-5 rounded-xl border border-accent px-4 py-3 text-sm font-medium">{g.noPay}</p>
        </section>
        <section className="soft-panel p-7 sm:p-9">
          <p className="eyebrow !text-accent-text">{g.stepsTitle}</p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
            {g.steps.map((s, i) => <li key={s} className="flex gap-3"><span className="font-display text-2xl leading-none text-accent-text">{i + 1}</span><span>{s}</span></li>)}
          </ol>
        </section>
      </div>

      <section className="card p-7 text-center sm:p-10">
        {gift.status === "pending" ? (
          <p className="text-ink-2">{g.notReady.replace("{giver}", gift.giverName)}</p>
        ) : isGiver ? (
          <p className="text-ink-2">{g.giverPreview.replace("{name}", gift.recipientName ?? t.gift.giver.someone)}</p>
        ) : mine ? (
          <>
            <p className="font-medium">{g.claimedByYou}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/record?gift=1" className="btn">{g.goRecord}</Link>
              <Link href="/reports" className="btn btn-quiet">{g.myReports}</Link>
            </div>
          </>
        ) : gift.claimedBy ? (
          <p className="text-ink-2">{g.claimedByOther.replace("{giver}", gift.giverName)}</p>
        ) : userId ? (
          <>
            <Link href={claimHref} className="btn">{g.claimSignedIn}</Link>
            {email && <p className="mt-3 text-xs text-muted">{g.claimNote.replace("{email}", email)}</p>}
          </>
        ) : (
          <Link href={signUpHref} className="btn">{g.claim}</Link>
        )}
      </section>

      <p className="text-center text-xs text-muted">{g.footer}</p>
    </div>
  );
}
