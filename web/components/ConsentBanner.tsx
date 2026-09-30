"use client";
/**
 * The cookie choices (English only). Where the law asks first, a banner offers accept, reject or choose; everywhere,
 * "Your privacy choices" in the footer opens the same choices. A choice is saved by /api/consent, passed on to Google
 * Consent Mode at once, and the page is refreshed so the site's own visit counting follows it.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Consent } from "@/lib/consent";

declare global { interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] } }
export const PRIVACY_EVENT = "avoco:privacy-choices";

export function ConsentBanner({ initial, ask, gpc }: { initial: Consent; ask: boolean; gpc: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(ask);
  const [choosing, setChoosing] = useState(false);
  const [choice, setChoice] = useState<Consent>(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const show = () => { setChoice(initial); setChoosing(true); setOpen(true); };
    window.addEventListener(PRIVACY_EVENT, show);
    return () => window.removeEventListener(PRIVACY_EVENT, show);
  }, [initial]);

  async function save(next: Consent) {
    const c = { analytics: next.analytics, ads: next.ads && !gpc };
    setSaving(true);
    await fetch("/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) }).catch(() => null);
    const ads = c.ads ? "granted" : "denied";
    window.gtag?.("consent", "update", { ad_storage: ads, ad_user_data: ads, ad_personalization: ads, analytics_storage: c.analytics ? "granted" : "denied" });
    window.dataLayer?.push({ event: "avoco_consent", avoco_analytics: c.analytics, avoco_ads: c.ads });
    setSaving(false);
    setOpen(false);
    setChoosing(false);
    router.refresh();
  }

  if (!open) return null;
  const row = (key: keyof Consent | "necessary", title: string, text: string) => {
    const locked = key === "necessary" || (key === "ads" && gpc);
    const on = key === "necessary" ? true : key === "ads" && gpc ? false : choice[key];
    return (
      <label className={`flex items-start justify-between gap-4 rounded-xl border border-line p-3 ${locked ? "opacity-80" : "cursor-pointer"}`}>
        <span className="text-sm"><span className="font-semibold">{title}</span><span className="mt-0.5 block text-xs leading-relaxed text-ink-2">{text}</span></span>
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={on} disabled={locked} onChange={(e) => key !== "necessary" && setChoice({ ...choice, [key]: e.target.checked })} />
      </label>
    );
  };

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-5" role="dialog" aria-label="Your privacy choices" data-no-export>
      <div className="card w-full max-w-xl p-5 shadow-xl sm:p-6" style={{ boxShadow: "0 18px 60px rgba(0,0,0,.18)" }}>
        <p className="font-semibold">Your privacy choices</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
          We use cookies to count visits and to see which of our ads bring people here. Your voice, your recordings and your reports are never shared.
          {" "}Choose what you allow; you can change it any time under &ldquo;Your privacy choices&rdquo; at the foot of every page.
          {" "}<Link href="/privacy#cookies" className="font-semibold text-accent-text hover:underline">Cookies in our privacy policy</Link>
        </p>
        {choosing && (
          <div className="mt-4 space-y-2">
            {row("necessary", "Necessary · always on", "Signing in, your language and these choices.")}
            {row("analytics", "Analytics", "Counting visits and how the site is used: our own statistics and Google Analytics.")}
            {row("ads", "Advertising", gpc ? "Off: your browser sends the Global Privacy Control signal, which we honour as a refusal." : "Measuring our ads on Google, Meta (Facebook, Instagram), TikTok and X. Some US state laws call this \"sharing\"; switch it off to opt out.")}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {choosing ? (
            <>
              <button type="button" className="btn !px-5 !py-2 text-sm" disabled={saving} onClick={() => save(choice)}>{saving ? "Saving…" : "Save my choices"}</button>
              <button type="button" className="btn btn-quiet !px-5 !py-2 text-sm" disabled={saving} onClick={() => save({ analytics: true, ads: true })}>Accept all</button>
            </>
          ) : (
            <>
              <button type="button" className="btn !px-5 !py-2 text-sm" disabled={saving} onClick={() => save({ analytics: true, ads: true })}>Accept all</button>
              <button type="button" className="btn btn-quiet !px-5 !py-2 text-sm" disabled={saving} onClick={() => save({ analytics: false, ads: false })}>Reject non-essential</button>
              <button type="button" className="rounded-full px-3 py-2 text-sm font-semibold text-accent-text hover:underline" onClick={() => setChoosing(true)}>Choose</button>
            </>
          )}
          {!ask && <button type="button" className="ml-auto rounded-full px-3 py-2 text-sm text-muted hover:text-ink" onClick={() => { setOpen(false); setChoosing(false); }}>Close</button>}
        </div>
      </div>
    </div>
  );
}

/** The footer link that opens the choices on any page. */
export function PrivacyChoicesLink() {
  return <button type="button" className="hover:text-ink" onClick={() => window.dispatchEvent(new Event(PRIVACY_EVENT))}>Your privacy choices</button>;
}
